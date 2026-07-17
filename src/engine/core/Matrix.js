import RenderEngineError from './RenderEngineError.js';

// Canonical identity matrix
const _IdentityMatrix = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1]
];

// Canonical shearing matrix
const _ShearingMatrix = [ 
    [1, 0.267, 0],              // 15-degree slant (tan(15) = 0.26794919243) , alternative is 12-degree slant (tan(12) = 0.21255656167)
    [0, 1, 0],
    [0, 0, 1]
];

const degreesToRad = 57.29536;
const radToDegrees = 0.01745;

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
    #props = {scale:[1,1],rotation:0,position:[0,0]};
    
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

    get position() {
        return this.#props.position;
    }

    get rotation() {
        return this.#props.rotation;
    }

    get scaling() {
        return this.#props.scale;
    }

    /**
     * Multiply this matrix with another matrix. Updates the source matrix.
     * @param {Matrix2d} matrix2d The matrix to multiply this matrix by. 
     * @returns {Matrix2d} This matrix
     */
    mul(matrix2d) {
        if (!matrix2d.constructor instanceof Matrix2d) {
            throw new RenderEngineError('Invalid matrix type. Must be a Matrix2d or DOMMatrix.');
        }
        return this.multiplySelf(matrix2d);
    }

    /**
     * Multiply this matrix with another matrix. Returns a new matrix.
     * @param {Matrix2d} matrix2d The matrix to multiply this matrix by. 
     * @returns {Matrix2d} A new matrix
     */
    multiply(matrix2d) {
        if (!matrix2d.constructor instanceof Matrix2d) {
            throw new RenderEngineError('Invalid matrix type. Must be a Matrix2d or DOMMatrix.');
        }
        return new Matrix2d(super.multiply(matrix2d));
    }

    #rotateMatrix(angle, method) {
        if (typeof angle === 'number') {
            angle = angle * radToDegrees;
        } else if (Array.isArray(angle)) {
            angle = angle.map(a => a * radToDegrees);
        } else {
            throw new RenderEngineError('Invalid angle type');
        }
        this.#props.rotation = angle;
        this[method](angle);
        return this;
    }

    absRotate(angle) {
        return this.#rotateMatrix(angle, 'rotate');
    }

    rotate(angle) {
        return this.#rotateMatrix(angle, 'rotateSelf');
    }

    #translateMatrix(x, y, method) {
       this.#props.position = [x, y];
       this[method](x, y);
       return this;
    }

    absTranslate(x, y) {
        return this.#translateMatrix(x, y, 'translate');
    }

    translate(x, y) {
        return this.#translateMatrix(x, y, 'translateSelf');
    }

    #scaleMatrix(sx, sy, ox = 0, oy = 0, method) {
        this.#props.scale = [sx, sy];
        this[method](sx, sy, 1, ox, oy);
        return this;
    }

    absScale(sx, sy, originX, originY) {
        return this.#scaleMatrix(sx, sy, originX, originY, 'scale');
    }

    scale(sx, sy, originX, originY) {
        return this.#scaleMatrix(sx, sy, originX, originY, 'scaleSelf');
    }

    absUniformScale(scale, originX, originY) {
        this.#props.scale = [scale, scale];
        this.#scaleMatrix(scale, scale, 1, originX, originY, 'scale');
    }

    uniformScale(scale, originX, originY) {
        this.#props.scale = [scale, scale];
        this.#scaleMatrix(scale, scale, 1, originX, originY, 'scaleSelf');
    }

    absSkew(sx, sy) {
        this.#props.skew = [sx, sy];
        this.skewX(sx);
        if (sy !== 0) {
            this.skewY(sy);
        }
        return this;
    }

    skew(sx, sy) {
        this.#props.skew = [sx, sy];
        this.skewXSelf(sx);
        if (sy !== 0) {
            this.skewYSelf(sy);
        }
        return this;
    }

    #invertMatrix(method) {
        this[method]();
    }

    absInvert() {
        return this.#invertMatrix('inverse');
    }

    invert() {
        return this.#invertMatrix('invertSelf');
    }

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
     * at the same time, or one at a time. 
     * @param {Number[]} scale The [x, y] scale to apply (or the current scale)
     * @param {Number} rotation The rotation to apply (or the current rotation)
     * @param {Number[]} position The [x, y] position to apply (or the current position)
     * @return This matrix
     */
    setTo({position, rotation, scale}) {
        return this.#modify({position, rotation, scale});
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
        return a.mul(b);
    }

    static identity() {
        return new Matrix2d(IdentityMatrix);
    }
}

// copies to export
const IdentityMatrix = new Matrix2d(_IdentityMatrix[0][0], _IdentityMatrix[1][0], _IdentityMatrix[2][0], 
                                    _IdentityMatrix[0][1], _IdentityMatrix[1][1], _IdentityMatrix[2][1],
                                    _IdentityMatrix[0][2], _IdentityMatrix[1][2], _IdentityMatrix[2][2]);

const ShearingMatrix = new Matrix2d(_ShearingMatrix[0][0], _ShearingMatrix[1][0], _ShearingMatrix[2][0], 
                                    _ShearingMatrix[0][1], _ShearingMatrix[1][1], _ShearingMatrix[2][1],
                                    _ShearingMatrix[0][2], _ShearingMatrix[1][2], _ShearingMatrix[2][2]);

const NullMatrix = null;

export {
    IdentityMatrix,
    ShearingMatrix,          // used to italicize text
    NullMatrix
};
