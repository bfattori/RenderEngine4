
// Canonical identity matrix
const _IdentityMatrix = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1]
];

// Canonical shearing matrix
const _ShearingMatrix = [ 
    [1, 3, 0],
    [0, 1, 0],
    [0, 0, 1]
];

// copies to export
const IdentityMatrix = [... _IdentityMatrix];
const ShearingMatrix = [... _ShearingMatrix];

export {
    IdentityMatrix,
    ShearingMatrix          // used to italicize text
};

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
export class Matrix2d {
    constructor({m00, m10, m20} = _IdentityMatrix[0], {m01, m11, m21} = _IdentityMatrix[1], {m02, m12, m22} = _IdentityMatrix[2]) {
        this._props = {scale:[1,1],rotation:0,position:[0,0]};
        this._matrix = [
            [m00, m10, m20],
            [m01, m11, m21],
            [m02, m12, m22]
        ];
    }

    /**
     * Get the matrix as a 3x3 array
     * @return {Array<Array<number>>} The matrix in row-major order
     */
    get rows() {
        return this._matrix;
    }

    /**
     * Get the matrix as a 3x3 array
     * @return {Array<Array<number>>} The matrix in row-major order
     */
    get array() {
        return this.rows;
    }

    /**
     * Get the matrix as a 3x3 array in column-major order
     * @return {Array<Array<number>>} The matrix in column-major order
     */
    get cols() {
        return [
            [this.m00, this.m01, this.m02],
            [this.m10, this.m11, this.m12],
            [this.m20, this.m21, this.m22]
        ];
    }

    /**
     * Multiply this matrix with another matrix. Updates the source matrix.
     * @param {Matrix2d} matrix2d The matrix to multiply this matrix by. 
     * @returns This matrix
     */
    mul(matrix2d) {
        if (Array.isArray(matrix2d)) {
            matrix2d = Matrix2d.fromArray(matrix2d)
        }
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                let sum = 0;
                for (let k = 0; k < 3; k++) {
                    sum += this._matrix[i][k] * matrix2d._matrix[k][j];
                }
                this._matrix[i][j] = sum;
            }
        }
        return this;
    }

    /**
     * Update the matrix with new scaling, rotation, or position values
     * at the same time, or one at a time. 
     * @param {Number[]} scale The [x, y] scale to apply (or the current scale)
     * @param {Number} rotation The rotation to apply (or the current rotation)
     * @param {Number[]} position The [x, y] position to apply (or the current position)
     * @return This matrix
     */
    update({position, rotation, scale}) {
        scale ? Array.isArray(scale) || (scale = [scale, scale]) : undefined;

        this._props.scale = scale ? scale : this._props.scale;
        this._props.rotation = rotation ? rotation : this._props.rotation;
        this._props.position = position ? position : this._props.position;

        this._matrix = [
            [this._props.scale[0] * Math.cos(this._props.rotation), -this._props.scale[1] * Math.sin(this._props.rotation), this._props.position[0]],
            [this._props.scale[0] * Math.sin(this._props.rotation), this._props.scale[1] * Math.cos(this._props.rotation), this._props.position[1]],
            [0, 0, 1]
        ];
        return this;
    }

    /**
     * Outputs the matrix as a string.
     * @returns The matrix as a string
     */
    toString() {
        return `${this.rows[0][0]} ${this.rows[0][1]} ${this.rows[0][2]} ${this.rows[1][0]} ${this.rows[1][1]} ${this.rows[1][2]} ${this.rows[2][0]} ${this.rows[2][1]} ${this.rows[2][2]}`;
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
        return Matrix2d.fromRows(matrixArray);
    }

    /**
     * Create a <code>Matrix2d</code> from 3 arrays of 3-element arrays.
     * A row-aligned matrix is in the form:
     * <pre>
     * [ m00 m10 m20 ]
     * [ m01 m11 m21 ]
     * [ m02 m12 m22 ]
     * </pre>
     * 
     * @param {Array[]} matrixArray An array of arrays in row-major order.
     * @returns {Matrix2d} A 3x3 matrix
     * @example Matrix2d.fromArray([ [m00, m10, m20], [m01, m11, m21], [m02, m12, m22] ]);
     */
    static fromRows(matrixArray) {
        return new Matrix2d(matrixArray[0], matrixArray[1], matrixArray[2]);
    }

    /**
     * Create a <code>Matrix2d</code> from 3 arrays of 3-element arrays.
     * A column-aligned matrix is in the form:
     * <pre>
     * | m00 | m10 | m20 |
     * | m01 | m11 | m21 |
     * | m02 | m12 | m22 |
     * </pre>
     * 
     * @param {Array[]} cols An array of arrays in column-major order.
     * @returns {Matrix2d} A 3x3 matrix
     * @example Matrix2d.fromArray([ [m00, m01, m02], [m10, m11, m12], [m20, m21, m22] ]);
     */
    static fromCols(cols) {
        return new Matrix2d(
            [cols[0][0], cols[1][0], cols[2][0]],
            [cols[0][1], cols[1][1], cols[2][1]],
            [cols[0][2], cols[1][2], cols[2][2]]
        );
    }

    /**
     * Creates a transformation matrix for 2D transformations
     * @param {Array|number} scale - Scale factors for x and y axes, or a single uniform scale factor
     * @param {number} rotation - Rotation in radians
     * @param {Array} position - Position coordinates [x, y]
     * @returns {Matrix2d} 3x3 transformation matrix for 2D transformations
     * @example
     * // Example usage:
     * const scale = [2, 2]; // Scale by 2 on both axes
     * const rotation = Math.PI / 4; // Rotate 45 degrees
     * const position = [100, 50]; // Move to (100, 50) in world space
     * const transformMatrix = Matrix2d.toMatrix(scale, rotation, position);
     * // Output: A 3x3 matrix representing the combined transformations
     * // transformMatrix.rows[0] = [m00, m01, m02]
     * // transformMatrix.rows[1] = [m10, m11, m12] 
     * // transformMatrix.rows[2] = [m20, m21, m22]
     * Console.log(transformMatrix);
     */
    static fromProperties(scale = [1, 1], rotation, position = [0, 0]) {
        Array.isArray(scale) || (scale = [scale, scale]);
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const scaling = new Matrix2d([[scale[0], 0, 0], [0, scale[1], 0], [0, 0, 1]]);
        const rotationMatrix = new Matrix2d([[cos, -sin, 0], [sin, cos, 0], [0, 0, 1]]);
        const translationMatrix = new Matrix2d([[1, 0, position[0]], [0, 1, position[1]], [0, 0, 1]]);
        return Matrix2d.multiply(translationMatrix, Matrix2d.multiply(rotationMatrix, scaling));
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
}