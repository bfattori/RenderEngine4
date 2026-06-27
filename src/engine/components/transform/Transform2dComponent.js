/**
 * Transform2dComponent - 2D transform component with matrix math support
 * 
 * Extends TransformComponent to provide 2D Cartesian coordinate system support
 * including rotation, scale operations, and matrix-based transformations for improved performance.
 * 
 * @class Transform2dComponent
 * @extends TransformComponent
 */
import TransformComponent from './TransformComponent.js';
import { TRANSFORM_PRIORITY } from './../../constants';

class Transform2dComponent extends TransformComponent {
    /**
     * Creates a new Transform2dComponent instance
     * 
     * @constructor
     * @param {Object} options - Configuration options
     * @param {Array} [options.position] - Coordinate in world space
     * @param {number} [options.position[0]=0] - X coordinate in world space
     * @param {number} [options.position[1]=0] - Y coordinate in world space
     * @param {number} [options.rotation=0] - Rotation in radians (positive = clockwise)
     * @param {Array|number} [options.scale] - Scale factor for both axes (uniform scaling if single number)
     * @param {number} [options.scale[0]=1] - Scale factor for X axis
     * @param {number} [options.scale[1]=1] - Scale factor for Y axis
     */
    constructor(priority = TRANSFORM_PRIORITY, name = 'Transform2dComponent', options = {}) {
        super(priority, name, options);
        
        /**
         * Precomputed transform matrix for performance-critical operations
         * @private
         */
        this._transformMatrix = null;
        
        /**
         * Local/parent coordinate system (for hierarchical transformations)
         * @private
         */
        this._localSpace = {
            position: [0, 0],
            rotation: 0,
            scale: [1, 1]
        };
        
        /**
         * Enable matrix cache for optimized rendering
         * @private
         */
        this._enableMatrixCaching = true;
    }

    //-------------------------------
    // Getters and Setters
    //-------------------------------

    /**
     * Gets the local space properties for hierarchical transformations
     * @returns {Object} Local space properties: { position: [x, y], rotation: radians, scale: [scaleX, scaleY] }
     */
    get localSpace() {
        return this._localSpace;
    }

    /**
     * Sets the local space properties for hierarchical transformations
     * @param {Object} localSpace - Local space properties: { position: [x, y], rotation: radians, scale: [scaleX, scaleY] }
     */
    set localSpace({ position, rotation, scale }) {
        this._localSpace = { position, rotation, scale };
        const pointInWorld = this.transformPoint(x, y);
        return pointInWorld;
    }

    /**
     * Gets whether matrix caching is enabled
     * @returns {boolean} True if matrix caching is enabled, false otherwise
     */
    get matrixCachingEnabled() {
        return this._enableMatrixCaching;
    }

    /**
     * Enables or disables matrix caching for optimized rendering
     * @param {boolean} enabled - Whether to enable matrix caching
     */
    set matrixCachingEnabled(enabled) {
        this._enableMatrixCaching = enabled;
        if (enabled) {
            this._updateTransformMatrix();
        }
    }

    /**
     * Gets the current transform matrix
     * @returns {Array} The transform matrix [[m00, m01, m02], [m10, m11, m12], [m20, m21, m22]]
     */
    get transformMatrix() {
        if (!this._transformMatrix) {
            this._updateTransformMatrix();
        }
        return this._transformMatrix;
    }

    /**
     * Sets position in world space (direct assignment - overrides velocity/acceleration)
     * 
     * @param {number} x - New X coordinate
     * @param {number} y - New Y coordinate
     */
    set position([x, y]) {
        super.position = [x, y];
        this._enableMatrixCaching && this._transformMatrix.update({position: [x, y]});
        
        // Notify any listeners if world provides that capability
        if (this.world && this.world.eventEngine) {
            this.world.eventEngine.publish('positionChanged', {
                x: this.x,
                y: this.y,
                timestamp: Date.now(),
                deltaTime: 0.016 // default delta
            });
        }
        
        return this;
    }

    /**
     * Gets position with optional local/world coordinate specification
     * 
     * @param {string} [coordinateSpace='world'] - 'world' or 'local'
     * @returns {Object} Position object
     */
    get position(coordinateSpace = 'world') {
        if (coordinateSpace === 'local') {
            return this._localSpace.position;
        }
        return super.position;
    }

    /**
     * Sets only the X position (keeps Y unchanged)
     * 
     * @param {number} x - New X coordinate
     */
    set x(x) {
        this.position[0] = x;
         this._enableMatrixCaching && this._transformMatrix.update({position: [x, this.position[1]]});
        return this;
    }

    /**
     * Sets only the Y position (keeps X unchanged)
     * 
     * @param {number} y - New Y coordinate
     */
    set y(y) {
        this.position[1] = y;
        this._enableMatrixCaching && this._transformMatrix.update({position: [this.position[0], y]});
        return this;
    }

    /**
     * Sets rotation in radians (positive values rotate clockwise)
     * 
     * @param {number} rotation - New rotation angle in radians
     */
    set rotation(rotation) {
        // Normalize rotation to 0-2π range for predictable behavior
        const normalized = rotation % (Math.PI * 2);
        super.rotation = normalized;
        this._enableMatrixCaching && this._transformMatrix.update({rotation: normalized});
        
        // Notify listeners if world provides that capability
        if (this.world && this.world.eventEngine) {
            this.world.eventEngine.publish('rotationChanged', {
                rotation: this.rotation,
                timestamp: Date.now(),
                deltaTime: 0.016
            });
        }
        
        return this;
    }

    /**
     * Sets scale factor (uniform or non-uniform depending on argument)
     * 
     * @param {number|Number[]} scale - A uniform scaling factor if a single number, non-uniform if an array
     */
    set scale(scale) {
        super.scale = !Array.isArray(scale) ? Math.max(0.01, scale) : [Math.max(0.01, scale[0]), Math.max(0.01, scale[1])]; // Prevent zero or negative scale
        this._enableMatrixCaching && this._transformMatrix.update({scale: scale});
        
        if (this.world && this.world.eventEngine) {
            this.world.eventEngine.publish('scaleChanged', {
                scale: this.scale,
                timestamp: Date.now(),
                deltaTime: 0.016
            });
        }
        
        return this;
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
            localSpace: this.localSpace,
            matrixCachingEnabled: this.matrixCachingEnabled,
            _transformMatrix: this.transformMatrix
        }};
    }

    //-------------------------------
    // Lifecycle Methods
    //-------------------------------

    /**
     * Override update to include matrix caching logic
     * 
     * @param {number} time - Current world time
     * @param {number} deltaTime - Time elapsed since last frame in milliseconds
     * @param {Object} [options] - Optional configuration
     * @param {Array} [options.events=[]] - Array to push collision events to
     */
    update(time, deltaTime, options = {}) {
        super.update(time, deltaTime, options);

        // Update transform matrix for rendering performance
        this._updateTransformMatrix();

        return this;
    }

    /**
     * Updates the cached transform matrix based on current properties
     * 
     * @private
     */
    _updateTransformMatrix() {
        if (!this._enableMatrixCaching) {
            return;
        }
        
        this._transformMatrix.update({
            scale: this.scale, 
            rotation: this.rotation, 
            position: this.position
        });
    }

    /**
     * Adds delta to position (used for smooth movement)
     * 
     * @param {number} dx - Delta X to add
     * @param {number} dy - Delta Y to add
     */
    addPosition(dx, dy) {
        this.position[0] += dx;
        this.position[1] += dy;
        this._enableMatrixCaching && this._transformMatrix.update({
            position: [this.position[0], this.position[1]]
        });
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
        super.rotation = normalized;
         this._enableMatrixCaching && this._transformMatrix.update({
            rotation: normalized
         });
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
        const m = this._getTransformMatrix();
        return [m[0] * localX + m[2] * localY + this.x,
            m[1] * localX + m[3] * localY + this.y
        ];
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
        const m = this.transformMatrix;
        const det = m[0] * m[3] - m[2] * m[1];
        
        // Inverse matrix calculation for 2D affine transform
        return [ ((m[3] * (worldX - this.x)) - (m[2] * (worldY - this.y))) / det,
            (-(m[0] * (worldX - this.x)) + (m[1] * (worldY - this.y))) / det
        ];
    }

    deserialize(data) {
        super.deserialize(data);
        
        this.localSpace = data.localSpace;
        this.matrixCachingEnabled = data.matrixCachingEnabled;
    }

}

export default Transform2dComponent;
