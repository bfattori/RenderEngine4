/**
 * Transform2d - 2D transform component with matrix math support
 * 
 * Extends TransformPart to provide 2D Cartesian coordinate system support
 * including rotation, scale operations, and matrix-based transformations for improved performance.
 * 
 * @class Transform2d
 * @extends TransformPart
 */
import TransformPart from './TransformPart.js';
import Constants from '../../Constants.js';
import { Matrix2d } from '../../core/Matrix.js';

class Transform2dPart extends TransformPart {
    #transformMatrix = Matrix2d.identity();
    #enableMatrixCaching = true;
    
    /**
     * Creates a new Transform2d instance
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
    constructor(priority = Constants.TRANSFORM_PRIORITY, name = 'Transform2dPart', options = {}) {
        super(priority, name, options);
    }

    //-------------------------------
    // Getters and Setters
    //-------------------------------

    /**
     * Gets whether matrix caching is enabled
     * @returns {boolean} True if matrix caching is enabled, false otherwise
     */
    get matrixCachingEnabled() {
        return this.#enableMatrixCaching;
    }

    /**
     * Enables or disables matrix caching for optimized rendering
     * @param {boolean} enabled - Whether to enable matrix caching
     */
    set matrixCachingEnabled(enabled) {
        this.#enableMatrixCaching = enabled;
        if (enabled) {
            this.applyTransformLogic();
        }
    }

    /**
     * Gets the current transform matrix
     * @returns {Array} The transform matrix [[m00, m01, m02], [m10, m11, m12], [m20, m21, m22]]
     */
    get transformMatrix() {
        if (!this.#transformMatrix) {
            this.applyTransformLogic();
        }
        return this.#transformMatrix;
    }

    /**
     * Sets position in world space (direct assignment - overrides velocity/acceleration)
     * 
     * @param {number} x - New X coordinate
     * @param {number} y - New Y coordinate
     */
    set position([x, y]) {
        super.position = [x, y];
        return this;
    }

    /**
     * Gets local position
     * @returns {Object} Position object
     */
    get position() {
        return super.position;
    }

    get rotation() {
        return super.rotation;
    }

    get scale() {
        return super.scale;
    }

    /**
     * Gets world position
     * @returns {Object} Position object
     */
    get worldPosition() {
        return super.worldPosition;
    }

    /**
     * Sets only the X position (keeps Y unchanged)
     * 
     * @param {number} x - New X coordinate
     */
    set x(x) {
        this.position[0] = x;
        return this;
    }

    /**
     * Sets only the Y position (keeps X unchanged)
     * 
     * @param {number} y - New Y coordinate
     */
    set y(y) {
        this.position[1] = y;
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
        return this;
    }

    /**
     * Sets scale factor (uniform or non-uniform depending on argument)
     * 
     * @param {number|Number[]} scale - A uniform scaling factor if a single number, non-uniform if an array
     */
    set scale(scale) {
        super.scale = !Array.isArray(scale) ? Math.max(0.01, scale) : [Math.max(0.01, scale[0]), Math.max(0.01, scale[1])]; // Prevent zero or negative scale
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
     * Updates the cached transform matrix based on current properties
     * 
     * @private
     */
    applyTransformLogic() {
        if (!this.#enableMatrixCaching) {
            return;
        }

        this.#transformMatrix.update({
            scale: this.scale, 
            rotation: this.rotation, 
            position: this.position
        });
        super.applyTransformLogic();
    }

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
        return this.#transformMatrix.mul(this.world.currentTransform);
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
        return this.#transformMatrix.invert().mul(this.world.currentTransform);

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

}

export default Transform2dPart;
