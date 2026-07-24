/**
 * Transform2dPart - 2D transform component with matrix math support
 * 
 * Extends TransformPart to provide 2D Cartesian coordinate system support
 * including rotation, scale operations, and matrix-based transformations for improved performance.
 * 
 * @class Transform2dPart
 */
import Constants from '../../Constants.js';
import ComponentPart from '../ComponentPart.js';
import { ComponentPartEvent } from '../ComponentPart.js';
import { Matrix2d } from '../../core/Matrix.js';

import { ColliderEvent, CollisionData } from '../../parts/collision/Collider.js';

class TransformEvent extends ComponentPartEvent {
    #matrix = null;
    constructor(part, matrix, time, deltaTime) {
        super(part, time, deltaTime);
        this.#matrix = matrix;
    }

    consume(consumer) {
        super.consume(consumer);
        return this.#matrix;
    }
}

class CommitTransformEvent extends TransformEvent {
    // we just need your type ...
}

export { CommitTransformEvent, TransformEvent };

class Transform2dPart extends ComponentPart {
    #localTransform = Matrix2d.identity();

    /**
     * Creates a new Transform2dPart instance
     * 
     * @constructor
     * @param {String} name - The name of the part
     * @param {number} priority - Optional execution priority (default: Constants.TRANSFORM_PRIORITY)
     * @param {Object} options - Configuration options
     * @param {Array} [options.position] - Coordinate in world space
     * @param {number} [options.position[0]=0] - X coordinate in world space
     * @param {number} [options.position[1]=0] - Y coordinate in world space
     * @param {number} [options.rotation=0] - Rotation in radians (positive = clockwise)
     * @param {Array|number} [options.scale] - Scale factor for both axes (uniform scaling if single number)
     * @param {number} [options.scale[0]=1] - Scale factor for X axis
     * @param {number} [options.scale[1]=1] - Scale factor for Y axis
     */
    constructor(name = 'Transform2dPart', options = {}, priority = Constants.TRANSFORM_PRIORITY) {
        super(name, priority);
        
        this.x = options.position ? options.position[0] : 0;
        this.y = options.position ? options.position[1] : 0;
        this.rotation = options?.rotation || 0;
        this.scale = options?.scale !== undefined ? Array.isArray(options.scale) ? options.scale : [options.scale, options.scale] : [1, 1];

        // subscribe for events
        this.on(InputEvent);
        this.on(ColliderEvent);
    }

    //-------------------------------
    // Getters and Setters
    //-------------------------------

    /**
     * Gets the current transform matrix
     * @returns {Matrix2d} The transform matrix
     */
    get localTransform() {
        return this.#localTransform;
    }

    /**
     * Sets the local transform matrix
     * @param {Matrix2d} transform - New transform matrix
     */
    set localTransform(transform) {
        this.#localTransform = transform;
    }

    /**
     * Sets position in local space
     * 
     * @param {number} x - New X coordinate
     * @param {number} y - New Y coordinate
     */
    set position([x, y]) {
        this.#localTransform.translateSelf(x, y);
        return this;
    }

    /**
     * Gets local position
     * @returns {Array<number>} Position coodinates, x and y
     */
    get position() {
        return this.#localTransform.position;
    }

    /**
     * Set the rotation angle
     * @param {number} angle - New rotation angle in degrees
     */
    set rotation(angle) {
        this.#localTransform.rotateSelf(angle);
    }

    /**
     * Get the rotation angle
     * @returns {number} Rotation angle in degrees
     */
    get rotation() {
        return this.#localTransform.rotation;
    }

    /**
     * Sets scale factor (uniform or non-uniform depending on argument)
     * 
     * @param {number|Number[]} scale - A uniform scaling factor if a single number, non-uniform if an array
     */
    set scale(scale) {
        if (Array.isArray(scale)) {
            this.#localTransform.scaleSelf(scale[0], scale[1]);
        } else {
            this.#localTransform.uniformScaleSelf(scale);
        }
        return this;
    }

    /**
     * Gets scale factor
     * @returns {Number[]} Scale factors as an array [x, y]
     */
    get scale() {
        return this.#localTransform.scaling;
    }

    /**
     * Sets only the X position (keeps Y unchanged)
     * 
     * @param {number} x - New X coordinate
     */
    set x(x) {
        this.#localTransform.e = x;
        return this;
    }

    /**
     * Sets only the Y position (keeps X unchanged)
     * 
     * @param {number} y - New Y coordinate
     */
    set y(y) {
        this.#localTransform.f = y;
        return this;
    }

    /**
     * An immutable copy of the world transform for the host {@link GameObject}
     * @returns {Matrix2d} The game object's world transform
     */
    get worldTransform() {
        return Matrix2d.from(this?.host.worldTransform);
    }

    //-------------------------------
    // Event handler
    //-------------------------------
    
    /**
     * Event handler responds to {@link InputEvent} and {@link ColliderEvent}.
     * The former occurs when user input is received from an input part. The latter is in response to a collision event containing
     * any adjustments to apply to the transform.
     * 
     * @param {ComponentPartEvent} eventObject - The event object
     */
    onEvent(eventObject) {
        if (super.onEvent(eventObject)) return;
        switch (eventObject.type) {
            case InputEvent:
                this.updateTransformFromInput(eventObject);
                break;
            case ColliderEvent:
                this.reactToCollision(eventObject);
                break;
        }
    }

    /**
     * Fired when the input parts receive input. This method should be overridden by subclasses to update the transform based on user input.
     * @param {InputEvent} inputEvent - The input event
     */
    updateTransformFromInput(inputEvent) {
    }

    /**
     * Fired when a collider part is updated. This method should be overridden by subclasses to react to the collision event.
     * 
     * @param {ColliderEvent} colliderEvent - The collision event
     */
    reactToCollision(colliderEvent) {
    }

     // -------------------------------
    // Update and Event Handling
    // -------------------------------

    /**
     * Updates the transform based on current state and world bounds
     * Emits an event to the internal queue that a transform has been updated
     *
     * @param {number} time - Current world time (Unix timestamp or frame count)
     * @param {number} deltaTime - Time elapsed since last frame in milliseconds
     */
    update(time, deltaTime) {
        // Emit the computed local transform
        const emitTransform = Matrix2d.from(this.localTransform)
        this.emit(new TransformEvent(this, emitTransform, time, deltaTime));
        return this;
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

    destroy() {
        this.#localTransform = null;
        super.destroy();
    }

    //-------------------------------
    // Properties
    //-------------------------------

    /**
     * Gets the properties of this component for serialization or debugging
     * @returns {Object} Properties including local space and transform matrix
     */
    get properties() {
        const properties = super.properties;
        return { ...properties, ...{
            localTransform: this.#localTransform
        }};
    }

    //-------------------------------
    // Lifecycle Methods
    //-------------------------------

    /**
     * Adds delta to position (used for smooth movement)
     * 
     * @param {number} dx - Delta X to add
     * @param {number} dy - Delta Y to add
     */
    addPosition(dx, dy) {
        this.position = [this.x + dx, this.y + dy];
        return this;
    }

    /**
     * Adds delta to rotation (angular velocity integration)
     * 
     * @param {number} dRotation - Delta rotation in radians to add
     */
    addRotation(dRotation) {
        const current = this.rotation || 0;
        const normalized = (current + dRotation) % (Math.PI * 2);
        this.rotation = normalized;
        return this;
    }

    /**
     * Transforms a point from local space to world space
     * Uses matrix multiplication for correct rotation/scaling effects
     * 
     * @param {number} localX - X coordinate in local/parent space
     * @param {number} localY - Y coordinate in local/parent space
     * @returns {Array} Transformed point with x and y elements [worldX, worldY]
     */
    transformPoint(localX, localY) {
        return this.#localTransform.mul(this.world.currentTransform);
    }

    /**
     * Gets the world-space position of a local point
     * 
     * @param {number} localX - Local X coordinate
     * @param {number} localY - Local Y coordinate
     * @returns {Array} World space coordinates with x and y elements [worldX, worldY]
     */
    getWorldPositionOf(localX, localY) {
        return this.transformPoint(localX, localY);
    }

    /**
     * Applies inverse transform to convert world coordinates to local space
     * 
     * @param {number} worldX - X coordinate in world space
     * @param {number} worldY - Y coordinate in world space
     * @returns {Array} Local space coordinates with x and y elements [localX, localY]
     */
    inverseTransform(worldX, worldY) {
        return this.#localTransform.invert().mul(this.world.currentTransform);

        // const det = m[0] * m[3] - m[2] * m[1];
        
        // // Inverse matrix calculation for 2D affine transform
        // return [ ((m[3] * (worldX - this.x)) - (m[2] * (worldY - this.y))) / det,
        //     (-(m[0] * (worldX - this.x)) + (m[1] * (worldY - this.y))) / det
        // ];
    }

    deserialize(data) {
        super.deserialize(data);
        
        this.localSpace = data.localSpace;
        this.matrixCachingEnabled = data.matrixCachingEnabled;
    }

    destroy() {
        this.#localTransform = null;
        super.destroy();
    }
}

export default Transform2dPart;
