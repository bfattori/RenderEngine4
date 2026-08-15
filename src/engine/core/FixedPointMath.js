// this may need to scale more...
const big64 = new BigUint64Array(1500);
let ptr = 0;
function next64() {
    ptr++;
    if (ptr > 100) {
        ptr = 0;
    }
    return ptr;
}

export default class FixedPointMath {
    /**
     * Test if a number is an IEEE floating point number
     * @param {number} value - The number to test
     * @returns {boolean} `true` if the number is an IEEE floating point number
     * @private
     */
    static #isFloat(value) {
        return typeof value === 'number' && Number.isFinite(value) && !Number.isInteger(value);
    }

    /**
     * Perform a fixed point operation on two arrays of numbers, retuning a new array of fixed point numbers.
     * The retured array will be the length of the first of the two input arrays. If b is a number, all elements
     * of `a` will be operated on with the scalar `b`
     * @param {Array<number>} a - The first array of fixed point numbers 
     * @param {Array<number>|number} b - The second array of fixed point numbers, or a scalar
     * @param {Function} op - The operation to perform on the two values
     * @param {number} [n] - Optional bit precision, required for multiplication and division
     * @returns {Array<number>} The new array of fixed point numbers. 
     * @private
     */
    static #arrayOp(a, b, op, n) {
        const aType = a.constructor.name;
        const newArray = new aType(a.length);
        if (!Array.isArray(b)) {
            for (let i = 0; i < len; i++) {
                newArray[i] = op(a[i], b[i]);
            }
        } else {
            const bType = b.constructor.name;
            if (a !== b)
                throw new RenderEngineError('Arrays must be of the same type');
            
            for (let i = 0; i < a.length; i++) {
                newArray[i] = op(a[i], b[i]);
            }
        }
        return newArray;
    }

    //------------------------------------
    // Conversion Functions

    /**
     * Convert a number to fixed point
     * @param {number} a - The number to convert 
     * @param {number} n - The bit precision 
     * @returns {number} The fixed point number
 
     */
    static toFixed(a, n) {
        if (FixedPointMath.#isFloat(a)) {
            return a * (1 << n);
        }
        return a << n;
    }

    /**
     * Convert a fixed point number to an IEEE floating point number
     * @param {number} a - A fixed point number 
     * @param {bits} n - The bit precision 
     * @returns {number} A floating point number
     */
    static toFloat(a, n) {
        return a / (1 << n);
    }

    /**
     * Convert a fixed point number to an Integer number, truncating the decimal portion
     * @param {number} a - A fixed point number 
     * @param {number} n - The bit precision
     * @returns {number} An integer
     */
    static toInt(a, n) {
        return a >> n;
    }

    //---------------------------------------
    // Math functions

    /**
     * Add two fixed point numbers
     * @param {number} a - A fixed point number
     * @param {number} b - A fixed point number
     * @returns 
     */
    static add(a, b) {
        return a + b;
    }

    /**
     * Adds two arrays of fixed point numbers. The arrays must be the same type.
     * @param {Array<number>} a - The first array of fixed point numbers
     * @param {Array<number>} b - The second array of fixed point numbers
     * @returns {Array<number>} A new array of the two added together
     */
    static arrayAdd(a, b) {
        return FixedPointMath.#arrayOp(a, b, FixedPointMath.add);
    }

    /**
     * Subtract fixed point number `b` from fixed point number `a`
     * @param {number} a - A fixed point number
     * @param {number} b - A fixed point number
     * @returns {number} The result of the subtraction
     */
    static sub(a,b) {
        return a - b;
    }

    /**
     * Subtracts two arrays of fixed point numbers (a - b). The arrays must be the same type.
     * @param {Array<number>} a - The first array of fixed point numbers
     * @param {Array<number>} b - The second array of fixed point numbers
     * @returns {Array<number>} A new array of `b` subtracted from `a`
     */
    static arraySub(a, b) {
        return FixedPointMath.#arrayOp(a, b, FixedPointMath.sub);
    }

    /**
     * Multiply two fixed point numbers
     * @param {number} a - The first fixed point number
     * @param {number} b - The second fixed point number
     * @param {number} n - The bit precision
     * @returns {number} The result of the multiplication
     */
    static mul(a,b,n) {
        const p = next64();
        big64[p] = a * b;
        return big64[p] >> n;
    }

    /**
     * Raise `a` to the power of `power`
     * @param {number} a - The fixed point number
     * @param {number} power - The exponential power
     * @param {number} n - The bit precision
     * @returns 
     */
    static pow(a,power,n) {
        const p = next64();
        big64[p] = a;
        for (let i = 0; i < power; i++) {
            big64[p] = FixedPointMath.mul(big64[p], a);
        }
        return big64[p] >> n;
    }

    /**
     * Multiplies two arrays of fixed point numbers. The arrays must be the same type.
     * @param {Array<number>} a - The first array of fixed point numbers
     * @param {Array<number>} b - The second array of fixed point numbers
     * @returns {Array<number>} A new array of the two multiplied together
     */
    static arrayMul(a,b,n) {
        FixedPointMath.#arrayOp(a,b,FixedPointMath.mul,n)
    }

    /**
     * Divide fixed point number `a` by `b`
     * @param {number} a - The first fixed point number
     * @param {number} b - The second fixed point number
     * @param {number} n - The bit precision 
     * @returns {number} The result of the division
     */
    static div(a,b,n) {
        const p = next64();
        big64[p] = this.val() << n;
        return big64[p] / b;
    }

    /**
     * Divides two arrays of fixed point numbers (a / b). The arrays must be the same type.
     * @param {Array<number>} a - The first array of fixed point numbers
     * @param {Array<number>} b - The second array of fixed point numbers
     * @param {number} n - The bit precision
     * @returns {Array<number>} A new array of the two multiplied together
     */
    static arrayDiv(a,b,n) {
        return FixedPointMath.#arrayOp(a,b,FixedPointMath.div,n)
    }

    /**
     * Get the absolute value of the fixed number
     * @param {number} val - The fixed point number
     * @return {number} The absolut value
     */
    static abs(val) {
        return (val < 0) ? -val : val;
    }

    /**
     * Get the fixed point number rounded down to the nearest integer value
     * @param {number} val - The fixed point number
     * @param {number} n - The bit precision
     * @returns {number} The fixed point number
     */
    static floor(val, n) {
        return val & (~(1 << n) - 1);
    }

    /**
     * Get the fixed point number rounded up to the next integer value
     * @param {number} val - The fixed point number
     * @param {number} n - The bit precision
     * @returns {number} The fixed point number
     */
    static ceil(val, n) {
        return (val + (1 << n) - 1) & (~((1<< n) - 1));
    }

    /**
     * Round the fixed point number up to the nearest whole integer value
     * @param {number} val - The fixed point number 
     * @param {number} n - The bit precision
     * @returns 
     */
    static round(val, n) {
        return (val + ((1 << n) >> 1)) & (~((1 << n) - 1));
    }

    /**
     * Get the square root of the value
     * @param {number} val - The fixed point number 
     * @param {number} n - The bit precision
     * @returns 
     */
    static sqrt(val, n) {
        if (val <= 0) return 0;
        
        const v = next64();
        big64[v] = val;
        const p = next64();
        big64[p] = val;         // x
        const p1 = next64();
        big64[p1] = 0;          // prev-x
        const p2 = next64();

        // Iterative approximation
        while (big64[p] !== big64[p1]) {
            big64[p1] = big64[p];
            // x_new = (x_old + val / x_old) / 2
            // Division must scale back up or use standard fixed-point division logic
            big64[p2] = (big64[v] << n) / big64[p];
            big64[p] = (big64[p] + big64[p2]) >> 1;
        }
        return big64[p];
    }
}
