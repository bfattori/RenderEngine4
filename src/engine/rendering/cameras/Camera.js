import { Matrix2d, IdentityMatrix } from '../../core/Matrix.js';
import RenderEngineError from '../../core/RenderEngineError.js';

/**
 * Camera is the base class for all camera implementations in the Render Engine 4.
 * @param {Array<number>} position - The initial position of the camera.
 * @param {Array<number>} viewportDimensions - The dimensions of the viewport.
 * @param {Object} options - The options to initialize the camera with.
 * @param {Number} options.rotation - The rotation of the camera in degrees.
 * @param {Array<number>} options.scale - The scale of the camera as a 2D array. Default is [1, 1].
 * @return {Camera} A new instance of Camera
 */
export default class Camera {
    #name = 'Camera';
    #matrix = new Matrix2d(IdentityMatrix);
    #viewport = null;

    constructor(name = 'Camera', position = [0, 0], viewportDimensions = [800, 600], { rotation, scale } = {rotation:0, scale:[1, 1]}) {
        this.#name = name;
        this.#matrix.translate(position[0], position[1]);
        this.#matrix.rotate(rotation);
        this.#matrix.scale(scale[0], scale[1]);
        this.#viewport = viewportDimensions;
    }

    /**
     * Get the name of the camera
     * @returns {String} The name of the camera
     */
    get name() {
        return this.#name;
    }

    /**
     * Get the viewport dimensions
     * @returns {Array<number>} The viewport dimensions as [x, y, width, height]
     */
    get viewport() {
        return [...this.#matrix.translation, ...this.#viewport];
    }

    /**
     * Set the viewport dimensions
     * @param {Array<number>} viewportDimensions - The new viewport dimensions as [x, y, width, height]
     */
    set viewport([x, y, width, height]) {
        this.#matrix.translate(x, y);
        this.#viewport = [width, height];
    }

    /**
     * Get the camera transform
     * @return {Matrix2d} The camera transform matrix
     */
    get worldTransform() {
        return this.#matrix;
    }

    /**
     * Set the camera transform
     * @param {Matrix2d} matrix - The camera transformation matrix
     */
    set worldTransform(matrix) {
        if (!matrix.constructor instanceof DOMMatrix)
            throw new RenderEngineError('Input matrix must be Matrix2d or DOMMatrix');
        this.#matrix = matrix;
    }

    /**
     * The current camera position
     * @returns {Array<number>} - The camera position [x, y]
     */
    get position() {
        return this.#matrix.translation;
    }

    /**
     * Set the camera position
     * @param {Array<number>} position - The new camera position [x, y]
     */
    set position(position) {
        this.#matrix.translate(position[0], position[1]);
    }

    /**
     * Translate the camera relative to its current position.
     * @param {Array<number>} delta - The translation vector [dx, dy]
     */
    translate(delta = [0, 0]) {
        this.#matrix.translate(this.position[0] + delta[0], this.position[1] + delta[1]);
    }

    /**
     * The current camera rotation
     * @returns {number} The camera rotation in radians
     */
    get rotation() {
        return this.#matrix.rotation;
    }

    /**
     * Set the camera rotation
     * @param {number} rotation - The new camera rotation in radians
     */
    set rotation(rotation) {
        this.#matrix.rotate(rotation);
    }

    /**
     * Rotate the camera relative to its current angle.
     * @param {number} delta - The rotation to apply to the current rotation in radians
     */
    rotate(delta) {
        this.#matrix.rotate(this.#matrix.rotation + delta);
    }

    /**
     * The current camera scale
     * @returns {Array<number>} The current camera scale as an array [sx, sy]
     */
    get scale() {
        return this.#matrix.scaling;
    }

    /**
     * Set the camera scale
     * @param {Array<number>} scale - The new camera scale as an array [sx, sy]
     */
    set scale(scale = [1, 1]) {
        if (Number.isInteger(scale)) {
            this.uniformScale(scale);
        }
        this.#matrix.scale(scale[0], scale[1]);
    }

    /**
     * Set the uniform camera scale
     * @param {number} scale - The new uniform camera scale
     */
    set uniformScale(scale = 1) {
        this.#matrix.scale(scale, scale);
    }

    /**
     * Scale the camera viewport relative to the current scale.
     * @param {Array<number>} scale - The new scale deltas as an array [dx, dy]
     */
    scale(scale = [1, 1]) {
        this.scale = [this.scale[0] + scale[0], this.scale[1] + scale[1]];
    }

    /**
     * Scale the camera viewport uniformly relative to the current scale.
     * @param {number} scale - The uniform scale delta
     */
    scaleUniform(scale = 1) {
        this.scale = [this.scale[0] + scale, this.scale[1] + scale];
    }

    /**
     * Returns <code>true</code> if the coordinate is in the viewport.
     * @param {Array<number>} array - A coordinate to check [x, y] 
     * @returns 
     */
    isInViewport([x, y]) {
        return x >= this.viewport[0] && x <= (this.viewport[0] + this.viewport[2]) &&
            y >= this.viewport[1] && y <= (this.viewport[1] + this.viewport[3]);
    }
}