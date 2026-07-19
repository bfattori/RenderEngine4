import RenderEngineError from './RenderEngineError.js';

// Canonical identity matrix
const _IdentityMatrix = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1]
];

/**
 * A 2d matrix class to simplify the several manipulations around the engine in row-major order. Initialized to the identity
 * matrix if no parameters passed.
 * The matrix is stored in row-major order. This means that the first element of the array represents the value at (0, 0),
 * the second element at (0, 1), and so on.
 * Takes the form:
 * <code>
 * | m00 m10 m20 |
 * | m01 m11 m21 |
 * | m02 m12 m22 |
 * </code>
 * 
 * @params {Object} options - The options to initialize the matrix with.
 * @param {Number} options.m00 - The value at (0, 0).
 * @param {Number} options.m10 - The value at (1, 0).
 * @param {Number} options.m20 - The value at (2, 0).
 * @param {Number} options.m01 - The value at (0, 1).
 * @param {Number} options.m11 - The value at (1, 1).
 * @param {Number} options.m21 - The value at (2, 1).
 * @param {Number} options.m02 - The value at (0, 2).
 * @param {Number} options.m12 - The value at (1, 2).
 * @param {Number} options.m22 - The value at (2, 2).
 */
export class Matrix2d extends DOMMatrix {
    constructor(...mtxArgs) {
        if (mtxArgs[0] instanceof DOMMatrix) {
            super(mtxArgs[0]);
        } else if (mtxArgs.length > 1) { 
            // a 2d array
            super([mtxArgs[0], mtxArgs[3], mtxArgs[1], mtxArgs[4], mtxArgs[2], mtxArgs[5]]);
        } else {
            super();
        }
    }

    /**
     * Get the current position of this matrix.
     * @returns {Array<number>} The position of this matrix as an array [x, y]. 
     */
    get position() {
        return [this.e, this.f];
    }

    /**
     * Get the rotation of this matrix, in degrees
     * @returns {number} The rotation of the matrix in degrees. 
     */
    get rotation() {
        return Math.atan2(-this.c, this.a) * 180 / Math.PI;
    }

    /**
     * Get the scaling factors along the X and Y coordinates
     * @returns {Array<number>} [sX, sY] where sx is the scaling factor along the X axis and sy is the scaling factor along the Y axis. 
     */
    get scaling() {
        const sX = Math.sqrt((this.a ** 2) + (this.c ** 2));
        const sY = Math.sqrt((this.b ** 2) + (this.d ** 2));
        return [sX, sY];
    }

    /**
     * Multiply this matrix with another matrix. Returns a new matrix.
     * @param {Matrix2d} matrix2d The matrix to multiply this matrix by. 
     * @returns {Matrix2d} A new matrix
     */
    multiply(matrix2d) {
        return Matrix2d.from(super.multiply(matrix2d));
    }

    /**
     * Rotate the matrix by the angle provided, returning a new matrix.
     * @param {number} angle - The rotation angle in degrees
     * @returns {Matrix2d}
     */
    rotate(angle) {
        return Matrix2d.from(super.rotate(angle));
    }

    /**
     * Translate the matrix by the given coordinates
     * @param {number} x 
     * @param {number} y 
     * @returns {Matrix2d}
     */
    translate(x, y) {
        return Matrix2d.from(super.translate(x, y));
    }

    /**
     * Scale matrix by given amounts. Returns a new matrix
     * @param {number} sx 
     * @param {number} sy 
     * @param {number} originX 
     * @param {number} originY 
     * @returns {Matrix2d}
     */
    scale(sx, sy, originX = 0, originY = 0) {
        return Matrix2d.from(super.scale(sx, sy, 1, originX, originY));
    }

    /**
     * Unformly scale the matrix, returning a new matrix.
     * @param {number} scalar 
     * @param {number} originX 
     * @param {number} originY 
     * @returns {Matrix2d}
     */
    uniformScale(scalar, originX, originY) {
        return Matrix2d.from(super.scale(scalar, scalar, 1, originX, originY));
    }

    /**
     * Uniformly scale this matrix.
     * @param {number} scalar 
     * @param {number} originX 
     * @param {number} originY 
     * @returns This matrix
     */
    uniformScaleSelf(scalar, originX, originY) {
        return super.scale(scalar, scalar, originX, originY);
    }

    /**
     * Skew the matrix by the values of sx and sy.
     * @param {number} sx 
     * @param {number} sy 
     * @returns 
     */
    skew(sx, sy = 0) {
        const first = super.skewX(sx);
        return sy === 0 ? first : Matrix2d.from(first.skewY(sy));
    }

    skewSelf(sx, sy = 0) {
        const first = super.skewXSelf(sx);
        return sy === 0 ? first : first.skewYSelf(sy);
    }

    /**
     * Invert the matrix, returning a new matrix.
     * @returns {Matrix2d}
     */
    invert() {
        return Matrix2d.from(super.inverse());
    }

    /**
     * Modify the values in the matrix directly
     * @param {object} param0 
     * @param {boolean} self 
     * @returns 
     */
    #modify({position, rotation, scale}, self = false) {
        scale ? Array.isArray(scale) || (scale = [scale, scale]) : undefined;
        if (scale) {
            this[`scale${self?'Self':''}`](scale[0], scale[1]);
        }
        if (rotation !== undefined) {
            this[`rotate${self?'Self':''}`](rotation);
        }
        if (position) {
            this[`translate${self?'Self':''}`](position[0], position[1]);
        }
        return this;

    }

    /**
     * Update the matrix scaling, rotation, or position values
     * at the same time, or one at a time. 
     * @param {Number[]} scale The [x, y] scale to apply (or the current scale)
     * @param {Number} rotation The rotation to apply (or the current rotation)
     * @param {Number[]} position The [x, y] position to apply (or the current position)
     * @return This matrix
     */
    update({position, rotation, scale}) {
        return this.#modify({position, rotation, scale}, true);
    }

    /**
     * Set the matrix scaling, rotation, or position values directly
     * at the same time, or one at a time. Returns a new matrix;
     * @param {Number[]} scale The [x, y] scale to apply (or the current scale)
     * @param {Number} rotation The rotation to apply (or the current rotation)
     * @param {Number[]} position The [x, y] position to apply (or the current position)
     * @return {Matrix2d}
     */
    setTo({position, rotation, scale}) {
        return Matrix2d.from(this.#modify({position, rotation, scale}));
    }

    /**
     * Outputs the maxtrix as a string in the format used by the HTML5 canvas context's transform() method.
     * @returns The matrix as a string
     */
    toCanvas() {
        return `${this.a} ${this.b} ${this.c} ${this.d} ${this.e} ${this.f}`;
    }

    /**
     * Returns a Matrix2d from several different forms of input formats.
     * @param {Array<number>|String|DOMMatrix|Matrix2d} other - An object to cast to a new {@link Matrix2d}
     * @returns A new <code>Matrix2d</code> instance
     * @throws {RenderEngineError} If the input is not a valid matrix type
     * @static
     */
    static from(other) {
        if (Array.isArray(other)) {
            return Matrix2d.fromArray(other);
        } else if (other instanceof DOMMatrix) {
            return new Matrix2d(other);
        } else if (typeof other === "string") {
            return Matrix2d.fromArray(other.split(' ').map(e => parseFloat(e)));
        }
        throw new RenderEngineError('Invalid matrix type');
    }

    /**
     * Returns a new Matrix2d from the given matrix
     * @param {Matrix2d|DOMMatrix} matrix 
     * @returns 
     */
    static fromMatrix(matrix) {
        return new Matrix2d(matrix);
    }

    /**
     * Create a <code>Matrix2d</code> from 3 arrays of 3-element arrays.
     * A row-aligned matrix is in the form:
     * <pre>
     * | m00 m10 m20 |
     * | m01 m11 m21 |
     * | m02 m12 m22 |
     * </pre>
     * 
     * @param {Array[]} matrixArray An array of arrays in row-major order.
     * @returns {Matrix2d} A 3x3 matrix
     * @example Matrix2d.fromArray([ [m00, m10, m20], [m01, m11, m21], [m02, m12, m22] ]);
     */
    static fromArray(matrixArray) {
        return Matrix2d.fromFloat32Array(matrixArray);
    }

    /**
     * Multiplies two 2D matrices and returns a new <code>Matrix2d</code>. This method does
     * not modify either input matrix.
     * 
     * A matrix takes the form:
     * <pre>
     * | m00 m10 m20 |
     * | m01 m11 m21 |
     * | m02 m12 m22 |
     * </pre>
     * 
     * @param {Matrix2d} a - First matrix ([[m00, m01, m02], [m10, m11, m12], [m20, m21, m22]])
     * @param {Matrix2d} b - Second matrix ([[m00, m01, m02], [m10, m11, m12], [m20, m21, m22]])
     * @returns {Matrix2d} A new matrix representing the matrices multiplied.
     */
    static multiply(a, b) {
        a = Array.isArray(a) ? Matrix2d.fromArray(a) : a;
        b = Array.isArray(b) ? Matrix2d.fromArray(b) : b;
        return a.multiply(b);
    }

    /**
     * The identity matrix.
     * @returns {Matrix2d} A new matrix representing the identity matrix.
     */
    static identity() {
        return new Matrix2d(IdentityMatrix);
    }
}

// copies to export
const IdentityMatrix = new Matrix2d(_IdentityMatrix[0][0], _IdentityMatrix[1][0], _IdentityMatrix[2][0], 
                                    _IdentityMatrix[0][1], _IdentityMatrix[1][1], _IdentityMatrix[2][1],
                                    _IdentityMatrix[0][2], _IdentityMatrix[1][2], _IdentityMatrix[2][2]);

const NullMatrix = null;

export {
    IdentityMatrix,
    NullMatrix
};
