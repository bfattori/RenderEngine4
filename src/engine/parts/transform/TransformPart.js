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

import Constants from '../../Constants.js';
import ComponentPart from '../ComponentPart.js';
import { ComponentPartEvent } from '../ComponentPart.js';
import RenderPart from '../render/RenderPart.js';
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

export default class TransformPart extends ComponentPart {
    #localTransform = Matrix2d.identity();
    #x = 0;
    #y = 0;
    #rotation = 0;
    #scale = [1,1];
    #colliderModel = null;
    #worldWidth = 0;
    #worldHeight = 0;
    #world = null;
  
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
    constructor(priority = Constants.TRANSFORM_PRIORITY, name = 'TransformPart', options = {}) {
        super(priority, name);
        
        this.#x = options?.position?.[0] || this.#x;
        this.#y = options?.position?.[1] || this.#y;
        this.#rotation = options?.rotation || 0;
        this.#scale = options?.scale !== undefined ? Array.isArray(options.scale) ? options.scale : [options.scale, options.scale] : [1, 1];
        this.#colliderModel = options?.colliderModel;

        /**
         * Boundary dimensions for collision detection
         * @private
         */
        this.#worldWidth = 800; // Default world width
        this.#worldHeight = 600; // Default world height

        // subscribe for input events
        this.on(InputEvent);
        this.on(ColliderEvent);
    }

    // -------------------------------
    // Getters and Setters
    // -------------------------------

    /**
     * Gets the local space properties for hierarchical transformations
     * @returns {Object} Local space properties: { position: [x, y], rotation: radians, scale: [scaleX, scaleY] }
     */
    get localTransform() {
        return this.#localTransform;
    }

    /**
     * Sets the local space properties for hierarchical transformations
     * @param {Matrix2d} localSpace - Local space properties: { position: [x, y], rotation: radians, scale: [scaleX, scaleY] }
     */
    set localTransform(matrix) {
        this.#localTransform = matrix;
    }

    /**
     * Sets the component to use a specific world instance
     * 
     * @param {GameWorld} world - The GameWorld instance to attach to
     */
    set world(world) {
        this.#world = world;
        if (world) {
            // Update boundary dimensions from world if available
            if (world.width !== undefined) {
                this.#worldWidth = world.width;
            }
            if (world.height !== undefined) {
                this.#worldHeight = world.height;
            }
        }
    }

    /**
     * Gets the world instance this component is attached to
     * @returns {GameWorld|null} The world instance or null if not set
     */
    get world() {
        return this.#world;
    }

    /**
     * Sets the boundary dimensions for collision detection
     * 
     * @param {number} width - World width in pixels/units
     * @param {number} height - World height in pixels/units
     */
    set boundaries([width, height]) {
        this.#worldWidth = width;
        this.#worldHeight = height;
    }

    /**
     * Gets the current position in world space
     * 
     * @returns {Array} Position object with x and y elements
     */
    get position() {
        return [this.#x, this.#y];
    }

    /**
     * Sets the current position in world space
     * 
     * @param {Array} position - Position object with x and y elements
     */
    set position([x, y]) {
        if (this.#x === x && this.#y === y) return;
        this.#x = x;
        this.#y = y;
        this.localTransform.e = x;
        this.localTransform.f = y;
    }

    get x() {
        return this.#x;
    }

    get y() {
        return this.#y;
    }

    set x(x) {
        if (this.#x === x) return;
        this.#x = x;
        this.localTransform.e = x;
    }

    set y(y) {
        if (this.#y === y) return;
        this.#y = y;
        this.localTransform.f = y;
    }

    /**
     * Gets the current rotation
     * 
     * @returns {number} Current rotation in radians
     */
    get rotation() {
        return this.#rotation;
    }

    /**
     * Sets the current rotation
     * 
     * @param {number} newRotation - New rotation in radians
     */
    set rotation(newRotation) {
        if (this.#rotation === newRotation) return;
        this.#rotation = newRotation;
        this.localTransform.rotateSelf(newRotation);
    }

    /**
     * Gets the current scale factor
     * 
     * @returns {number} Current uniform scale factor
     */
    get scale() {
        return this.#scale;
    }

    /**
     * Gets the current X scale factor
     * 
     * @returns {number} Current X scale factor
     */
    get scaleX() {
        return this.#scale[0];
    }

    /**
     * Sets the current X scale factor
     * 
     * @param {number} scaleX - New X scale factor
     */
    set scaleX(scaleX) {
        if (this.#scale[0] === scaleX) return;
        this.#scale[0] = scaleX;
        this.localTransform.scaleSelf(scaleX, this.scaleY);
    }

    /**
     * Gets the current Y scale factor
     * 
     * @returns {number} Current Y scale factor
     */
    get scaleY() {
        return this.#scale[1];
    }

    /**
     * Sets the current Y scale factor
     * @param {number} scaleY - New Y scale factor
     */
    set scaleY(scaleY) {
        if (this.#scale[1] === scaleY) return;
        this.#scale[1] = scaleY;
        this.localTransform.scaleSelf(this.scaleX, scaleY);
    }

    /**
     * Sets the uniform, or non-uniform scale factor.
     * 
     * @param {number} newScale - A uniform scaling factor if a single number, non-uniform if an array of two numbers.
     */
    set scale(newScale) {
        Array.isArray(newScale) || (newScale = [newScale, newScale]);
        if (this.#scale[0] === newScale[0] && this.#scale[1] === newScale[1]) return;
        this.#scale = newScale;
        this.localTransform.scaleSelf(newScale[0], newScale[1])
    }

    /**
     * Sets the non-uniform scale factor
     * 
     * @param {Array} scale - Scale factors as [scaleX, scaleY]
     */
    set nonUniformScale([scaleX, scaleY]) {
        if (this.#scale[0] === scaleX && this.#scale[1] === scaleY) return;
        this.scale = [scaleX, scaleY];
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
     * Emits an event to the internal queue that a transform has been updated
     *
     * @param {number} time - Current world time (Unix timestamp or frame count)
     * @param {number} deltaTime - Time elapsed since last frame in milliseconds
     * @param {Object} [options] - Optional configuration for the update
     * @param {Array} [options.events=[]] - Array to push collision events to
     */
    update(time, deltaTime, options = {}) {
        const events = options.events || [];

        // Update transform logic can be overridden by subclasses
        this.emit(new TransformEvent(this, this.localTransform, time, deltaTime));

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
        this.#colliderModel = null;
        this.#world = null;
        super.destroy();
    }
}

