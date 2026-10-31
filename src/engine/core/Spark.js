import Config from './Config.js';

class SparkConfig extends Config {
    constructor() {
        super({

        });
    }

    get varname() {
        return 'SPARK_OPTIONS';
    }
}

export { SparkConfig };

/**
 * @class Spark
 * @classdesc `Spark` is an extension of `DataView`, providing several extra methods to
 * access datatypes native to game development. Tied with the `SparkAllocator`, this provides
 * a way to manage memory while minimizing the need for the browser's garbage collection.
 * Together, this provides a good trade-off for speed and memory usage.
 *
 * @param {ArrayBuffer} heap - The heap space
 */
export default class Spark extends DataView {
    constructor(buffer, offset, lengthInBytes) {
        super(buffer, offset, lengthInBytes);
    }

    /**
     * Encode a hex color eg `#rrggbb[aa]` or `#rgb[a]` as a 32-bit unsigned integer
     * @param {String} color - The hex color to encode
     * @returns {number} 32-bit value
     */
    #encodeColor32(color) {
        color = color.substring(1); // remove hash
        return parseInt(color, 16);
    }

    /**
     * Decode a 32-bit unsigned integer into a hex color
     * @param {Uint32} uint32 - 32-bit unsigned integer
     * @returns {String} Hex color format (#rrggbbaa)
     */
    #decodeColor32(uint32) {
        return uint32.toString(16);
    }

    //--------------------------------------
    // Convenience methods

    /**
     * Covenience method to set a `BigUint64`
     * @param {number} offset - The byte offset
     * @param {BigInt} uint64 - The 64-bit unsigned int
     */
    setUInt64(offset, uint64) {
      this.setBigUint64(offset, uint64);
    }

    /**
     * Covenience method to get a `BigUint64`
     * @param {number} offset - The byte offset
     * @returns {BigInt} The 64-bit unsigned int
     */
    getUInt64(offset) {
      return this.getBigUint64(offset);
    }

    //--------------------------------------
    // 2-element Vector manipulation

    /**
     * Store a 2-element 8-bit signed vector
     * @param {number} offset - The byte offset
     * @param {Array<number>} vec8 - 2-element array
     */
    setVec8(offset, vec8) {
        this.setInt8(offset, vec8[0]);
        this.setInt8(offset + 1, vec8[1]);
    }

    /**
     * Retrieve a 2-element 8-bit signed vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVec8(offset) {
        return [this.getInt8(offset), this.getInt8(offset + 1)];
    }

    /**
     * Store a 2-element 8-bit unsigned vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecU8 - 2-element array
     */
    setVecU8(offset, vecU8) {
        this.setUint8(offset, vecU8[0]);
        this.setUint8(offset + 1, vecU8[1]);
    }

    /**
     * Retrieve a 2-element 8-bit unsigned vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVecU8(offset) {
        return [this.getUint8(offset), this.getUint8(offset + 1)];
    }

    /**
     * Store a 2-element 16-bit signed vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vec16 - 2-element array
     */
    setVec16(offset, vec16) {
        this.setInt16(offset, vec16[0]);
        this.setInt16(offset + 2, vec16[1]);
    }

    /**
     * Retrieve a 2-element 16-bit signed vector
     * @param {number} offset - The byte offset
     * @returns {Int16Array} A 2-element array
     */
    getVec16(offset) {
        return [this.getInt16(offset), this.getInt16(offset + 2)];
    }

    /**
     * Store a 2-element 16-bit unsigned vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecU16 - 2-element array
     */
    setVecU16(offset, vecU16) {
        this.setUint16(offset, vecU16[0]);
        this.setUint16(offset + 2, vecU16[1]);
    }

    /**
     * Retrieve a 2-element 16-bit unsigned vector
     * @param {number} offset - The byte offset
     * @returns {Uint16Array} A 2-element array
     */
    getVecU16(offset) {
        return [this.getUint16(offset), this.getUint16(offset + 2)];
    }

    /**
     * Store a 2-element 32-bit signed vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vec32 - 2-element array
     */
    setVec32(offset, vec32) {
        this.setInt32(offset, vec32[0]);
        this.setInt32(offset + 4, vec32[1]);
    }

    /**
     * Retrieve a 2-element 32-bit signed vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVec32(offset) {
        return [this.getInt32(offset), this.getInt32(offset + 4)];
    }

    /**
     * Store a 2-element 32-bit unsigned vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecU32 - 2-element array
     */
    setVecU32(offset, vecU32) {
        this.setUint32(offset, vecU32[0]);
        this.setUint32(offset + 4, vecU32[1]);
    }

    /**
     * Retrieve a 2-element 32-bit unsigned vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVecU32(offset) {
        return [this.getUint32(offset), this.getUint32(offset + 4)];
    }

    /**
     * Store a 2-element 64-bit signed vector
     * @param {number} offset - The bute offset
     * @param {Array<BigInt>} vec64 - 2-element array
     */
    setVec64(offset, vec64) {
        this.setBigInt64(offset, BigInt(vec64[0]));
        this.setBigInt64(offset + 8, BigInt(vec64[1]));
    }

    /**
     * Retrieve a 2-element 64-bit signed vector
     * @param {number} offset - The byte offset
     * @returns {BigInt64Array} A 2-element array
     */
    getVec64(offset) {
        return [this.getBigInt64(offset), this.getBigInt64(offset + 8)];
    }

    /**
     * Store a 2-element 64-bit unsigned vector
     * @param {number} offset - The bute offset
     * @param {Array<BigInt>} vecU64 - 2-element array
     */
    setVecU64(offset, vecU64) {
        this.setBigUint64(offset, BigInt(vecU64[0]));
        this.setBigUint64(offset + 8, BigInt(vecU64[1]));
    }

    /**
     * Retrieve a 2-element 64-bit unsigned vector
     * @param {number} offset - The byte offset
     * @returns {BigUint64Array} A 2-element array
     */
    getVecU64(offset) {
        return [this.getBigUint64(offset), this.getBigUint64(offset + 8)];
    }

    /**
     * Store a 2-element 32-bit floating point vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecF32 - 2-element array
     */
    setVecF32(offset, vecF32) {
        this.setFloat32(offset, vecF32[0]);
        this.setFloat32(offset + 4, vecF32[1]);
    }

    /**
     * Retrieve a 2-element 32-bit floating point vector
     * @param {number} offset - The byte offset
     * @returns {Float32Array} A 2-element array
     */
    getVecF32(offset) {
        return [this.getFloat32(offset), this.getFloat32(offset + 4)];
    }

    /**
     * Store a 2-element 64-bit floating point vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecF64 - 2-element array
     */
    setVecF64(offset, vecF64) {
        this.setFloat64(offset, vecF64[0]);
        this.setFloat64(offset + 8, vecF64[1]);
    }

    /**
     * Retrieve a 2-element 64-bit floating point vector
     * @param {number} offset - The byte offset
     * @returns {Float64Array} A 2-element array
     */
    getVecF64(offset) {
        return [this.getFloat32(offset), this.getFloat32(offset + 8)];
    }

    //-----------------------------------------
    // Arrays of "Primitive" types

    /**
     * Store an array of 8-bit signed integers (-128 to 127)
     * @param {number} offset - The byte offset to the array
     * @param {Int8Array} int8Array - The array to store
     */
    setInt8Array(offset, int8Array) {
        const view = SPARK_MM.alloc8(int8Array.length);
        const arr = new Int8Array(view.buffer, view.byteOffset, int8Array.length);
        arr.set(int8Array, 0);
        this.setUint32(offset, view.byteOffset);
    }

    /**
     * Retrieve an array of 8-bit signed integers
     * @param {number} offset - The byte offset to the array
     * @returns {Int8Array<ArrayBuffer>} An array of 8-bit signed integers
     */
    getInt8Array(offset, len) {
        const arrPtr = this.getUint32(offset);
        const view = SPARK_MM.readBytes(arrPtr, len);
        return new Int8Array(view.buffer, view.byteOffset, len);
    }

    /**
     * Store an array of 16-bit signed integers (-32768 to 32767)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} int8Array - The array to store
     */
    setInt16Array(offset, int16Array) {
        const view = SPARK_MM.alloc16(int16Array.length);
        const arr = new Int16Array(view.buffer, view.byteOffset, int16Array.length);
        arr.set(int16Array, 0);
        this.setUint32(offset, view.byteOffset);
    }

    /**
     * Retrieve an array of 16-bit signed integers
     * @param {number} offset - The byte offset to the array
     * @returns {Int16Array<ArrayBuffer>} An array of 16-bit signed integers
     */
    getInt16Array(offset, len) {
        const arrPtr = this.getUint32(offset);
        const view = SPARK_MM.readBytes(arrPtr, len * 2);
        return new Int16Array(view.buffer, view.byteOffset, len);
    }

    /**
     * Store an array of 32-bit signed integers (-2147483648 to 2147483647)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} int32Array - The array to store
     */
    setInt32Array(offset, int32Array) {
        const view = SPARK_MM.alloc32(int32Array.length);
        const arr = new Int32Array(view.buffer, view.byteOffset, int32Array.length);
        arr.set(int32Array, 0);
        this.setUint32(offset, view.byteOffset);
    }

    /**
     * Retrieve an array of 32-bit signed integers
     * @param {number} offset - The byte offset to the array
     * @returns {Int32Array<ArrayBuffer>} An array of 32-bit signed integers
     */
    getInt32Array(offset, len) {
        const arrPtr = this.getUint32(offset);
        const view = SPARK_MM.readBytes(arrPtr, len * 4);
        return new Int32Array(view.buffer, view.byteOffset, len);
    }

    /**
     * Store an array of 64-bit signed integers (-2^63 to 2^63 - 1)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} int64Array - The array to store
     */
    setInt64Array(offset, int64Array) {
        const view = SPARK_MM.alloc32(int64Array.length);
        const arr = new BigInt64Array(view.buffer, view.byteOffset, int64Array.length);
        arr.set(int64Array, 0);
        this.setUint32(offset, view.byteOffset);
    }

    /**
     * Retrieve an array of 64-bit signed integers
     * @param {number} offset - The byte offset to the array
     * @returns {BigInt64Array<ArrayBuffer>} An array of 64-bit signed integers
     */
    getInt64Array(offset, len) {
        const arrPtr = this.getUint32(offset);
        const view = SPARK_MM.readBytes(arrPtr, len * 8);
        return new BigInt64Array(view.buffer, view.byteOffset, len);
    }

    /**
     * Store an array of 32-bit floating points (-3.4^38 to 3.4^38)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} float32Array - The array to store
     */
    setFloat32Array(offset, float32Array) {
        const view = SPARK_MM.alloc32(float32Array.length);
        const arr = new Float32Array(view.buffer, view.byteOffset, float32Array.length);
        arr.set(float32Array, 0);

        // store the pointer to the array
        this.setUint32(offset, view.byteOffset);
    }

    /**
     * Retrieve an array of 32-bit floating points
     * @param {number} offset - The byte offset to the array
     * @returns {Float32Array<ArrayBuffer>} An array of 32-bit floating points
     */
    getFloat32Array(offset, len) {
        const arrPtr = this.getUint32(offset);
        const view = SPARK_MM.readBytes(arrPtr, len * 4);
        return new Float32Array(view.buffer, view.byteOffset, len);
    }

    /**
     * Store an array of 64-bit floating points (-1.8^308 to 1.8^308)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} float64Array - The array to store
     */
    setFloat64Array(offset, float64Array) {
        const view = SPARK_MM.alloc64(float64Array.length);
        const arr = new Float64Array(view.buffer, view.byteOffset, float64Array.length);
        arr.set(float64Array);
        this.setUint32(offset, view.byteOffset);
    }

    /**
     * Retrieve an array of 64-bit floating points
     * @param {number} offset - The byte offset to the array
     * @returns {Float64Array<ArrayBuffer>} An array of 64-bit floating points
     */
    getFloat64Array(offset, len) {
        const arrPtr = this.getUint32(offset);
        const view = SPARK_MM.readBytes(arrPtr, len * 8);
        return new Float64Array(view.buffer, view.byteOffset, len);
    }

    //----------------------------------------
    // 2-element Vector arrays

    /**
     * Store an array of VecF32 values
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} vecf32Array - The array of 32-bit vectors to store
     * @param {number} len - The number of elements in the array
     */
    setVecF32Array(offset, vecf32Array, len) {
        this.setFloat32Array(offset, vecf32Array, len * 2);
    }

    /**
     * Retrieve an array of VecF32 values
     * @param {number} offset - The byte offset to the array
     * @returns {Float32Array} An array of 32-bit floating points, 2 values per element interleaved
     */
    getVecF32Array(offset, len) {
        return this.getFloat32Array(offset, len * 2);
    }

    /**
     * Store an array of VecF64 values
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} vecf64Array - The array of 64-bit vectors to store
     * @param {number} len - The number of elements in the array
     */
    setVecF64Array(offset, vecf64Array, len) {
        this.setFloat64Array(offset, vecf64Array, len * 2);
    }

    /**
     * Retrieve an array of VecF64 values
     * @param {number} offset - The byte offset to the array
     * @returns {Float64Array} An array of 64-bit floating points, 2 values per element interleaved
     */
    getVecF64Array(offset, len) {
        return this.getFloat64Array(offset, len * 2);
    }

    //-----------------------------------------
    // "Complex" data types

    /**
     * Store a hex color (#rrggbbaa) as a 32-bit value
     * @param {number} offset - The byte offset
     * @param {String} color - The hexadecimal color string
     */
    setColor32(offset, color) {
        this.setUint32(offset, this.#encodeColor32(color));
    }

    /**
     * Retrieve a 32-bit value as hex color format.
     * @param {number} offset - The byte offset
     * @returns {String} The hex color string (e.g. '#ff000000')
     */
    getColor32(offset) {
        return this.#decodeColor32(this.getUint32(offset));
    }

    /**
     * Stores a string in the buffer, as 16-bit codepoints, 
     * prefixed by the length of the string stored as a Uint16.
     * You must allocate the maximum size of the expected string
     * to be stored in the buffer.
     * 
     * @param {number} offset - The byte offset
     * @param {String} stringVal - The string to store
     */
    setString(offset, stringVal) {
      this.setUint16(offset, stringVal.length);
      const buf = new Uint16Array(this.buffer, offset + Spark.UInt16.size, stringVal.length);
      stringVal.split('').forEach((el, i) => {
        buf.set(el.codePointAt(0), i);
      });
    }

    /**
     * Retrieve a string from the buffer.
     * @param {number} offset - The byte offset
     * @returns {String} The string value
     */
    getString(offset) {
      const len = this.getUint16(offset);
      const buf = new Uint16Array(this.buffer, offset + Spark.UInt16.size, len);
      const arr = [];
      buf.map(el => arr.push(String.fromCodePoint(el)));
      return arr.join('');
    }

    //--------------------------
    // Bitfield manipulations

    /**
     * Set an 8-bit bitfield with a mask
     * @param {number} offset - the byte offset
     * @param {Uint8} mask8Bit - The mask to apply to the bitfield
     */
    setMaskedBitField8(offset, mask8bit) {
        this.setUint8(offset, this.getUint8(offset) | mask8bit);
    }

    /**
     * Return a masked 8-bit bitfield value
     * @param {number} offset - The byte offset
     * @param {Uint8} mask8bit - The 8-bit mask
     * @returns {Uint8} The 8-bit masked value
     */
    getMaskedBitField8(offset, mask8bit) {
      return this.getUint8(offset) & mask8bit;
    }

    /**
     * Set a 16-bit bitfield with a mask
     * @param {number} offset - the byte offset
     * @param {Uint16} mask16Bit - The mask to apply to the bitfield
     */
    setMaskedBitField16(offset, mask16bit) {
        this.setUint16(offset, this.getUint16(offset) | mask16bit);
    }

    /**
     * Return a masked bitfield value
     * @param {number} offset - The byte offset
     * @param {Uint16} mask16bit - The 16-bit mask to apply
     * @returns {Uint16} The 16-bit masked value
     */
    getMaskedBitField16(offset, mask16bit) {
      return this.getUint8(offset) & mask16bit;
    }

    /**
     * Set a 32-bit bitfield with a mask
     * @param {number} offset - the byte offset
     * @param {Uint32} mask32Bit - The mask to apply to the bitfield
     */
    setMaskedBitField32(offset, mask32Bit) {
        this.setUint32(offset, this.getUint32(offset) | mask32Bit);
    }

    /**
     * Return a masked 32-bit bitfield value
     * @param {number} offset - The byte offset
     * @param {Uint32} mask32bit - The 32-bit mask to apply
     * @returns {Uint32} The 32-bit masked value
     */
    getMaskedBitField32(offset, mask32bit) {
      return this.getUint32(offset) & mask32bit;
    }
}
