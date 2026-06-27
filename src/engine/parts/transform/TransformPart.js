/**
 * TransformPart - Base transform component for game objects
 * 
 * Responsible for maintaining and updating a GameObject's position, rotation, and scale.
 * Handles world collision events and boundary checks.
 * 
 * This is the base class for all transform components. Subclasses (like Transform2d)
 * implement coordinate-specific functionality such as matrix math or physics-based movement.
 * 
 * @class TransformPart
 * @extends ComponentPart
 */

import { TRANSFORM_PRIORITY } from '../../constants.js';
import ComponentPart from '../ComponentPart.js';

class TransformPart extends ComponentPart {
    /**
     * Creates a new TransformPart instance
     * 
     * @constructor
     * @param {number} priority - Execution priority for the component
     * @param {String} name - Optional name for this component
     * @param {Object} options - Configuration options
     * @param {Array} [options.position] - Coordinate in world space
     * @param {number} [options.position[0]=0] - X coordinate in world space
     * @param {number} [options.position[1]=0] - Y coordinate in world space
     * @param {number} [options.rotation=0] - Rotation in radians
     * @param {Array|number} [options.scale=1] - Uniform scale factor
     * @param {number} [options.scale[0]=1] - X scale factor
     * @param {number} [options.scale[1]=1] - Y scale factor
     * @param {Object} [options.colliderModel=null] - Optional collision model reference
     */
    constructor(priority = TRANSFORM_PRIORITY, name = 'TransformPart', options = {}) {
        super(priority, name);
        this.x = options.position ? options.position[0] : 0;
        this.y = options.position ? options.position[1] : 0;
        this._rotation = options.rotation || 0;
        this._scale = options.scale !== undefined ? Array.isArray(options.scale) ? options.scale : [options.scale, options.scale] : [1, 1];
        this._colliderModel = options.colliderModel;

        /**
         * Boundary dimensions for collision detection
         * @private
         */
        this._worldWidth = 800; // Default world width
        this._worldHeight = 600; // Default world height
    }

    // -------------------------------
    // Getters and Setters
    // -------------------------------

    /**
     * Sets the component to use a specific world instance
     * 
     * @param {GameWorld} world - The GameWorld instance to attach to
     */
    set world(world) {
        this._world = world;
        if (world) {
            // Update boundary dimensions from world if available
            if (world.width !== undefined) {
                this._worldWidth = world.width;
            }
            if (world.height !== undefined) {
                this._worldHeight = world.height;
            }
        }
    }

    /**
     * Gets the world instance this component is attached to
     * @returns {GameWorld|null} The world instance or null if not set
     */
    get world() {
        return this._world;
    }

    /**
     * Sets the boundary dimensions for collision detection
     * 
     * @param {number} width - World width in pixels/units
     * @param {number} height - World height in pixels/units
     */
    set boundaries([width, height]) {
        this._worldWidth = width;
        this._worldHeight = height;
    }

    /**
     * Gets the current position in world space
     * 
     * @returns {Array} Position object with x and y elements
     */
    get position() {
        return [this.x, this.y ];
    }

    /**
     * Sets the current position in world space
     * 
     * @param {Array} position - Position object with x and y elements
     */
    set position([x, y]) {
        this.x = x;
        this.y = y;
    }

    /**
     * Gets the current rotation
     * 
     * @returns {number} Current rotation in radians
     */
    get rotation() {
        return this._rotation;
    }

    /**
     * Sets the current rotation
     * 
     * @param {number} newRotation - New rotation in radians
     */
    set rotation(newRotation) {
        this._rotation = newRotation;
    }

    /**
     * Gets the current scale factor
     * 
     * @returns {number} Current uniform scale factor
     */
    get scale() {
        return this._scale;
    }

    /**
     * Gets the current X scale factor
     * 
     * @returns {number} Current X scale factor
     */
    get scaleX() {
        return this._scale[0];
    }

    /**
     * Sets the current X scale factor
     * 
     * @param {number} scaleX - New X scale factor
     */
    set scaleX(scaleX) {
        this._scale[0] = scaleX;
    }

    /**
     * Gets the current Y scale factor
     * 
     * @returns {number} Current Y scale factor
     */
    get scaleY() {
        return this._scale[1];
    }

    /**
     * Sets the current Y scale factor
     * @param {number} scaleY - New Y scale factor
     */
    set scaleY(scaleY) {
        this._scale[1] = scaleY;
    }

    /**
     * Sets the uniform, or non-uniform scale factor.
     * 
     * @param {number} newScale - A uniform scaling factor if a single number, non-uniform if an array of two numbers.
     */
    set scale(newScale) {
        Array.isArray(newScale) || (newScale = [newScale, newScale]);
        this._scale = newScale;
    }

    /**
     * Sets the non-uniform scale factor
     * 
     * @param {Array} scale - Scale factors as [scaleX, scaleY]
     */
    set nonUniformScale([scaleX, scaleY]) {
        this.scale = [scaleX, scaleY];
    }

    /**
     * Gets the 2d transformation matrix for this component. Subclasses should override this to provide actual matrix math.
     * 
     * @returns {Array|null} 3x3 transformation matrix as and array of 3 rows (each an array of 3 elements), or null if not implemented
     */
    get transformMatrix() {
        // Base TransformPart does not implement matrix math - subclasses should override
        return null;
    }

    //-------------------------------
    // Properties
    //-------------------------------

    /**
     * Gets the transform properties as an object
     * 
     * @returns {Object} Transform properties object
     */
    get properties() {
        const properties = super.properties;
        return { ...properties, ...{
            position: this.position,
            rotation: this.rotation,
            scale: this.scale
        }};
    }

    // -------------------------------
    // Update and Event Handling
    // -------------------------------

    /**
     * Updates the transform based on current state and world bounds
     * 
     * @param {number} time - Current world time (Unix timestamp or frame count)
     * @param {number} deltaTime - Time elapsed since last frame in milliseconds
     * @param {Object} [options] - Optional configuration for the update
     * @param {Array} [options.events=[]] - Array to push collision events to
     */
    update(time, deltaTime, options = {}) {
        const events = options.events || [];

        // Update transform logic can be overridden by subclasses
        this._applyTransformLogic(deltaTime);

        // Check boundaries if world is available
        if (this.world && this._worldWidth !== undefined && this._worldHeight !== undefined) {
            this._checkBoundaries(time, deltaTime, events);
        }

        return this;
    }

    /**
     * Submits transform to the render components (if present)
     * 
     * @param {number} deltaTime - Time elapsed since last frame in milliseconds
     */
    _applyTransformLogic(deltaTime) {
        this.host.getComponentsByType(RenderPart)
            .forEach(renderComponent => renderComponent.pushTransform(this.transformMatrix));

        return this;
    }

    /**
     * Checks boundaries and handles boundary collisions
     * 
     * @param {number} time - Current world time
     * @param {number} deltaTime - Time elapsed since last frame in milliseconds
     * @param {Array} events - Array to push collision events to
     */
    _checkBoundaries(time, deltaTime, events) {
        // X-axis boundary check
        if (this.x <= 0 && this._worldWidth > 0) {
            this.x = 0;
            this._emitBoundaryEvent(events, 'x', 'left', time);
        } else if (this.x >= this._worldWidth - this.scale && this._worldWidth > 0) {
            this.x = this._worldWidth - this.scale;
            this._emitBoundaryEvent(events, 'x', 'right', time);
        }

        // Y-axis boundary check
        if (this.y <= 0 && this._worldHeight > 0) {
            this.y = 0;
            this._emitBoundaryEvent(events, 'y', 'bottom', time);
        } else if (this.y >= this._worldHeight - this.scale && this._worldHeight > 0) {
            this.y = this._worldHeight - this.scale;
            this._emitBoundaryEvent(events, 'y', 'top', time);
        }

        // Corner collision check (diagonal boundaries)
        if (this.x < 0 && this.y < 0) {
            this.x = 0;
            this.y = 0;
            this._emitBoundaryEvent(events, 'corner', 'bottom-left', time);
        } else if (this.x > this._worldWidth - this.scale && this.y < 0) {
            this.x = this._worldWidth - this.scale;
            this.y = 0;
            this._emitBoundaryEvent(events, 'corner', 'top-right', time);
        } else if (this.x > this._worldWidth - this.scale && this.y > this._worldHeight - this.scale) {
            this.x = this._worldWidth - this.scale;
            this.y = this._worldHeight - this.scale;
            this._emitBoundaryEvent(events, 'corner', 'top-right', time);
        } else if (this.x < 0 && this.y > this._worldHeight - this.scale) {
            this.x = 0;
            this.y = this._worldHeight - this.scale;
            this._emitBoundaryEvent(events, 'corner', 'bottom-left', time);
        }

        return this;
    }

    /**
     * Emits a boundary collision event
     * 
     * @param {Array} events - Array of event objects to push collision data to
     * @param {string} axis - Axis of collision ('x' or 'y')
     * @param {string} side - Side of collision ('left', 'right', 'top', 'bottom', 'corner')
     * @param {number} timestamp - Timestamp of the collision event
     */
    _emitBoundaryEvent(events, axis, side, timestamp) {
        const event = {
            type: 'boundary',
            timestamp: timestamp,
            deltaTime: 0.016, // Default delta if not available
            position: [this.x, this.y],
            rotation: this._rotation,
            scale: this._scale,
            axis: axis,
            side: side,
            collisionType: 'WorldBoundary'
        };

        events.push(event);
    }

    /**
     * Checks if the object is within world boundaries
     * 
     * @returns {boolean} True if within bounds, false otherwise
     */
    isInBounds() {
        if (!this.world || !this._worldWidth || !this._worldHeight) {
            return true; // No bounds to check
        }

        const width = this.scale;
        const height = this.scale;

        return (
            this.x >= 0 &&
            this.x + width <= this._worldWidth &&
            this.y >= 0 &&
            this.y + height <= this._worldHeight
        );
    }

    /**
     * Deserializes transform data and updates the component state. Subclasses should override this to handle specific properties.
     * 
     * @param {Object} data - Serialized transform data to restore from
     * @param {Array} data.position - Position array [x, y]
     * @param {number} data.rotation - Rotation in radians
     * @param {number} data.scale - Scale value [x, y] only X for uniform scaling (Y is ignored)
     */
    deserialize(data) {
        super.deserialize(data);
        if (data.position) {
            this.position = data.position;
        }
        if (data.rotation !== undefined) {
            this.rotation = data.rotation;
        }
        if (data.scale !== undefined) {
            this.scale = data.scale;
        }
    }
}

export default TransformPart;
