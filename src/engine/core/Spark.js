import Util from './Util.js';

class MemShape extends Map {
    #sizeOf = 0;
    #offsets = new Map();
    
    #currentMemorySegment = null;

    constructor(iterable) {
        super(iterable);
    }

    set(key, type, length = 1) {
        super.set(key, {type: type, len: length});
    }

    get(key) {
        return super.get(key).type;
    }

    inherit(fromWhat) {
        fromWhat.forEach((v, k) => {
            this.set(k, v.type, v.len);
        });
    }

    getByteOffset(key) {
        if (this.#offsets.size === 0) {
            let offset = 0;
            this.forEach((v, k) => {
                this.#offsets.set(k, offset);
                offset += Spark[v.type].size;
            });
        }
        return this.#offsets.get(key);
    }

    length(key) {
        return super.get(key).len;
    }

    getOrInsert(key, type, length = 1) {
        return super.getOrInsert(key, {type: type, len: length});
    }

    getOrInsertComputed(key, fn) {
        return super.getOrInsertComputed(key, fn());
    }

    set segment(dataView) {
        this.#currentMemorySegment = dataView;
    }

    get segment() {
        return this.#currentMemorySegment;
    }

    /**
     * Builds the memory shape that allows rapid access to
     * memory with simple property getters and setters.
     */
    build() {
        const m = {};
        this.forEach((val, key) => {
            if (val.len === 1) {
                m[key] = (value) => {
                    // simple value
                    if (value) {
                        this.#currentMemorySegment['set' + Spark[this.get(key)].type](this.getByteOffset(key), value);
                    } else {
                        return this.#currentMemorySegment['get' + Spark[this.get(key)].type](this.getByteOffset(key));
                    }
                };
            } else {
                m[key] = (value) => {
                    // array of values
                    if (value) {
                        this.#currentMemorySegment['set' +  Spark[this.get(key)].type + 'Array'](this.getByteOffset(key), value, this.length(key));
                    } else {
                        return this.#currentMemorySegment['get' +  Spark[this.get(key)].type + 'Array'](this.getByteOffset(key), this.length(key));
                    }
                };
            }
        });

        Util.lombok(this, m);
    }

    /**
     * Builds the memory shape that allows rapid access to
     * memory with simple property getters and setters.
     */
    newBuild() {
        const m = {};
        this.forEach((val, key) => {
            m[key] = (value) => {
                if (value) {
                    this.#setter(val.type, value, this.getByteOffset(key), val.len);
                } else {
                    return this.#getter(val.type, this.getByteOffset(key), val.len);
                }
            };
        });

        Util.lombok(this, m);
    }

    #setter(type, value, byteOffset, len = 1) {
        if (len === 1) {
            switch(type) {
                case 'Int8': this.#currentMemorySegment.setInt8(byteOffset, value); break;
                case 'UInt8': this.#currentMemorySegment.setUint8(byteOffset, value); break; 
                case 'Int16': this.#currentMemorySegment.setInt16(byteOffset, value); break; 
                case 'UInt16': this.#currentMemorySegment.setUint16(byteOffset, value); break; 
                case 'Int32': this.#currentMemorySegment.setInt32(byteOffset, value); break;
                case 'UInt32': this.#currentMemorySegment.setUint32(byteOffset, value); break; 
                case 'Int64': this.#currentMemorySegment.setBigInt64(byteOffset, value); break; 
                case 'UInt64': this.#currentMemorySegment.setBigUint64(byteOffset, value); break; 
                case 'Float32': this.#currentMemorySegment.setFloat32(byteOffset, value); break; 
                case 'Float64': this.#currentMemorySegment.setFloat64(byteOffset, value); break; 
            }
        } else {
            switch(type) {
                case 'Int8': this.#currentMemorySegment.setInt8Array(byteOffset, value, len); break; 
                case 'Int16': this.#currentMemorySegment.setInt16Array(byteOffset, value, len); break; 
                case 'Int32': this.#currentMemorySegment.setInt32Array(byteOffset, value, len); break; 
                case 'Int64': this.#currentMemorySegment.setBigInt64Array(byteOffset, value, len); break; 
                case 'Float32': this.#currentMemorySegment.setFloat32Array(byteOffset, value, len); break; 
                case 'Float64': this.#currentMemorySegment.setFloat64Array(byteOffset, value, len); break; 
            }
        }
    }

    #getter(type, byteOffset, len = 1) {
        if (len === 1) {
            switch(type) {
                case 'Int8': return this.#currentMemorySegment.getInt8(byteOffset); 
                case 'Uint8': return this.#currentMemorySegment.getUint8(byteOffset); 
                case 'Int16': return this.#currentMemorySegment.getInt16(byteOffset); 
                case 'Uint16': return this.#currentMemorySegment.getUint16(byteOffset); 
                case 'Int32': return this.#currentMemorySegment.getInt32(byteOffset); 
                case 'Uint32': return this.#currentMemorySegment.getUint32(byteOffset); 
                case 'BigInt64': return this.#currentMemorySegment.getBigInt64(byteOffset); 
                case 'BigUint64': return this.#currentMemorySegment.getBigUint64(byteOffset); 
                case 'Float32': return this.#currentMemorySegment.getFloat32(byteOffset); 
                case 'Float64': return this.#currentMemorySegment.setFloat64(byteOffset); 
            }
        } else {
            switch(type) {
                case 'Int8': return this.#currentMemorySegment.getInt8Array(byteOffset, len); 
                case 'Int16': return this.#currentMemorySegment.getInt16Array(byteOffset, len); 
                case 'Int32': return this.#currentMemorySegment.getInt32Array(byteOffset, len); 
                case 'BigInt64': return this.#currentMemorySegment.getBigInt64Array(byteOffset, len); 
                case 'Float32': return this.#currentMemorySegment.getFloat32Array(byteOffset, len); 
                case 'Float64': return this.#currentMemorySegment.getFloat64Array(byteOffset, len); 
            }
        }
    }


    /**
     * Returns the size of this shape in bytes
     * @returns {number} The size in bytes
     */
    get sizeOf() {
        if (this.#sizeOf === 0) {
            let total = 0;
            this.forEach(v => {
              if (v.len === 1) {
                total += Spark[v.type].size;
              } else {
                // include total bytes of array length
                total += Spark[v.type].size * v.len;
              }
            });
            this.#sizeOf = total;
        }
        return this.#sizeOf;
    }
}

export { MemShape };

export default class Spark extends DataView {
    #options = null;

    // standard types
    static Int8 =       {type: 'Int8',      size: 1};
    static UInt8 =      {type: 'Uint8',     size: 1};
    static Int16 =      {type: 'Int16',     size: 2};
    static UInt16 =     {type: 'Uint16',    size: 2};
    static Int32 =      {type: 'Int32',     size: 4};
    static UInt32 =     {type: 'Uint32',    size: 4};
    static Int64 =      {type: 'BigInt64',     size: 8};
    static UInt64 =     {type: 'BigUint64',    size: 8};
    static Float32 =    {type: 'Float32',   size: 4};
    static Float64 =    {type: 'Float64',   size: 8};

    // non-standard -----------------
    // colors
    static Color32 =    {type: 'Color32',   size: 4};

    // 2d Vectors
    static Vec8 =       {type: 'Vec8',      size: 2};
    static VecU8 =      {type: 'VecU8',     size: 2};
    static Vec16 =      {type: 'Vec16',     size: 4};
    static VecU16 =     {type: 'VecU16',    size: 4};
    static Vec32 =      {type: 'Vec32',     size: 8};
    static VecU32 =     {type: 'VecU32',    size: 8};
    static VecF32 =     {type: 'VecF32',    size: 8};
    static Vec64 =      {type: 'Vec64',     size: 16};
    static VecU64 =     {type: 'VecU64',    size: 16};
    static VecF64 =     {type: 'VecF64',    size: 16};

    // strings are treated as arrays of Uint16s, preceeded with a 2-byte length
    static String =     {type: 'Uint16',    size: 2};

    // booleans are handled as a single byte
    static Boolean =    {type: 'Uint8',     size: 1};


    constructor(buffer, offset, lengthInBytes, options = {}) {
        super(buffer, offset, lengthInBytes);
        this.#options = options;
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
     * Stores a string in the buffer
     * @param {number} offset - The byte offset
     * @param {String} stringVal - The string to store
     */
    setString(offset, stringVal) {
      this.setUint16(offset, stringVal.length);
      const buf = new Uint16Array(this.buffer, offset + Spark.UInt16.size, stringVal.length);
      stringVal.split('').forEach((el, i) => {
        buf[i] = el.codePointAt(0);
      });
    }

    /**
     * Retrieve a string from the buffer
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

    /**
     * Store a boolean value
     * @param {number} offset - The byte offset
     * @param {boolean} value - The boolean to store
     */
    setBoolean(offset, value) {
      this.setUint8(offset, value ? 0xFF : 0);
    }

    /**
     * Retrieve a boolean
     * @param {number} offset - The byte offset
     * @returns {boolean} The boolean value
     */
    getBoolean(offset) {
      return this.getUint8(offset) === 0xFF ? true : false;
    }

    setUInt8(offset, uint8) {
      this.setUint8(offset, uint8);
    }
    
    getUInt8(offset) {
      return this.getUint8(offset);
    }

    setUInt16(offset, uint16) {
      this.setUint16(offset, uint16);
    }

    getUInt16(offset) {
      return this.getUint16(offset);
    }

    setUInt32(offset, uint32) {
      this.setUint32(offset, uint32);
    }

    getUInt32(offset) {
      return this.getUint32(offset);
    }

    setUInt64(offset, uint64) {
      this.setBigUint64(offset, uint64);
    }

    getUInt64(offset) {
      return this.getBigUint64(offset);
    }

    /**
     * Store a 2-element 8-bit signed vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vec8 - 2-element array
     */
    setVec8(offset, vec8) {
        this.setInt8(offset, vec8[0]);
        this.setInt8(offset + Spark.Int8.size, vec8[1]);
    }

    /**
     * Retrieve a 2-element 8-bit signed vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVec8(offset) {
        return [this.getInt8(offset), this.getInt8(offset + Spark.Int8.size)];
    }

    /**
     * Store a 2-element 8-bit unsigned vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecU8 - 2-element array
     */
    setVecU8(offset, vecU8) {
        this.setUint8(offset, vecU8[0]);
        this.setUint8(offset + Spark.UInt8.size, vecU8[1]);
    }

    /**
     * Retrieve a 2-element 8-bit unsigned vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVecU8(offset) {
        return [this.getUint8(offset), this.getUint8(offset + Spark.UInt8.size)];
    }

    /**
     * Store a 2-element 16-bit signed vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vec16 - 2-element array
     */
    setVec16(offset, vec16) {
        this.setInt16(offset, vec16[0]);
        this.setInt16(offset + Spark.Int16.size, vec16[1]);
    }

    /**
     * Retrieve a 2-element 16-bit signed vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVec16(offset) {
        return [this.getInt16(offset), this.getInt16(offset + Spark.Int16.size)];
    }

    /**
     * Store a 2-element 16-bit unsigned vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecU16 - 2-element array
     */
    setVecU16(offset, vecU16) {
        this.setUint16(offset, vecU16[0]);
        this.setUint16(offset + Spark.UInt16.size, vecU16[1]);
    }

    /**
     * Retrieve a 2-element 16-bit unsigned vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVecU16(offset) {
        return [this.getUint16(offset), this.getUint16(offset + Spark.UInt16.size)];
    }

    /**
     * Store a 2-element 32-bit signed vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vec32 - 2-element array
     */
    setVec32(offset, vec32) {
        this.setInt32(offset, vec32[0]);
        this.setInt32(offset + Spark.Int32.size, vec32[1]);
    }

    /**
     * Retrieve a 2-element 32-bit signed vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVec32(offset) {
        return [this.getInt32(offset), this.getInt32(offset + Spark.Int32.size)];
    }

    /**
     * Store a 2-element 32-bit unsigned vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecU32 - 2-element array
     */
    setVecU32(offset, vecU32) {
        this.setUint32(offset, vecU32[0]);
        this.setUint32(offset + Spark.UInt32.size, vecU32[1]);
    }

    /**
     * Retrieve a 2-element 32-bit unsigned vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVecU32(offset) {
        return [this.getUint32(offset), this.getUint32(offset + Spark.UInt32.size)];
    }

    /**
     * Store a 2-element 64-bit signed vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vec64 - 2-element array
     */
    setVec64(offset, vec64) {
        this.setBigInt64(offset, vec64[0]);
        this.setBigInt64(offset + Spark.Int64.size, vec64[1]);
    }

    /**
     * Retrieve a 2-element 64-bit signed vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVec64(offset) {
        return [this.getBigInt64(offset), this.getBigInt64(offset + Spark.Int64.size)];
    }

    /**
     * Store a 2-element 64-bit unsigned vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecU64 - 2-element array
     */
    setVecU64(offset, vecU64) {
        this.setBigUint64(offset, vecU64[0]);
        this.setBigUint64(offset + Spark.UInt64.size, vecU64[1]);
    }

    /**
     * Retrieve a 2-element 64-bit unsigned vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVecU64(offset) {
        return [this.getBigUint64(offset), this.getBigUint64(offset + Spark.UInt64.size)];
    }

    /**
     * Store a 2-element 32-bit floating point vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecF32 - 2-element array
     */
    setVecF32(offset, vecF32) {
        this.setFloat32(offset, vecF32[0]);
        this.setFloat32(offset + Spark.Float32.size, vecF32[1]);
    }

    /**
     * Retrieve a 2-element 32-bit floating point vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVecF32(offset) {
        return [this.getFloat32(offset), this.getFloat32(offset + Spark.Float32.size)];
    }

    /**
     * Store a 2-element 64-bit floating point vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecF64 - 2-element array
     */
    setVecF64(offset, vecF64) {
        this.setFloat64(offset, vecF64[0]);
        this.setFloat64(offset + Spark.Float64.size, vecF64[1]);
    }

    /**
     * Retrieve a 2-element 64-bit floating point vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVecF64(offset) {
        return [this.getFloat64(offset), this.getFloat64(offset + Spark.Float64.size)];
    }

    /**
     * Store an array of 8-bit signed integers (-128 to 127)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} int8Array - The array to store
     */
    setInt8Array(offset, int8Array, len) {
        int8Array.length = len;
        const buf = new Int8Array(this.buffer, offset, len);
        buf.set(int8Array, 0);
    }

    /**
     * Retrieve an array of 8-bit signed integers
     * @param {number} offset - The byte offset to the array
     * @returns {Int8Array<ArrayBuffer>} An array of 8-bit signed integers
     */
    getInt8Array(offset, len) {
        return new Int8Array(this.buffer, offset, len);
    }

    /**
     * Store an array of 16-bit signed integers (-32768 to 32767)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} int8Array - The array to store
     */
    setInt16Array(offset, int16Array, len) {
        int16Array.length = len;
        const buf = new Int16Array(this.buffer, offset, int16Array.length);
        buf.set(int16Array, 0);
    }

    /**
     * Retrieve an array of 16-bit signed integers
     * @param {number} offset - The byte offset to the array
     * @returns {Int16Array<ArrayBuffer>} An array of 16-bit signed integers
     */
    getInt16Array(offset, len) {
        return new Int16Array(this.buffer, offset, len);
    }

    /**
     * Store an array of 32-bit signed integers (-2147483648 to 2147483647)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} int32Array - The array to store
     */
    setInt32Array(offset, int32Array, len) {
        int32Array.length = len;
        const buf = new Int32Array(this.buffer, offset, len);
        buf.set(int32Array, 0);
    }

    /**
     * Retrieve an array of 32-bit signed integers
     * @param {number} offset - The byte offset to the array
     * @returns {Int32Array<ArrayBuffer>} An array of 32-bit signed integers
     */
    getInt32Array(offset, len) {
        return new Int32Array(this.buffer, offset, len);
    }

    /**
     * Store an array of 64-bit signed integers (-2^63 to 2^63 - 1)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} int64Array - The array to store
     */
    setInt64Array(offset, int64Array, len) {
        int64Array.length = len;
        const buf = new BigInt64Array(this.buffer, offset, len);
        buf.set(int64Array, 0);
    }

    /**
     * Retrieve an array of 64-bit signed integers
     * @param {number} offset - The byte offset to the array
     * @returns {BigInt64Array<ArrayBuffer>} An array of 64-bit signed integers
     */
    getInt64Array(offset, len) {
        return new BigInt64Array(this.buffer, offset, len);
    }

    /**
     * Store an array of 32-bit floating points (-3.4^38 to 3.4^38)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} float32Array - The array to store
     */
    setFloat32Array(offset, float32Array, len) {
        float32Array.length = len;
        const buf = new Float32Array(this.buffer, offset, len);
        buf.set(float32Array, 0);
    }

    /**
     * Retrieve an array of 32-bit floating points
     * @param {number} offset - The byte offset to the array
     * @returns {Float32Array<ArrayBuffer>} An array of 32-bit floating points
     */
    getFloat32Array(offset, len) {
        return new Float32Array(this.buffer, offset, len);
    }

    /**
     * Store an array of 64-bit floating points (-1.8^308 to 1.8^308)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} float64Array - The array to store
     */
    setFloat64Array(offset, float64Array, len) {
        float64Array.length = len;
        const buf = new Float64Array(this.buffer, offset, len);
        buf.set(float64Array, 0);
    }

    /**
     * Retrieve an array of 64-bit floating points
     * @param {number} offset - The byte offset to the array
     * @returns {Float64Array<ArrayBuffer>} An array of 64-bit floating points
     */
    getFloat64Array(offset, len) {
        return new Float64Array(this.buffer, offset, len);
    }

    setVecF32Array(offset, vecf32Array, len) {
        vecf32Array.length = len * 2;
        const mem = new Spark(this.buffer, offset, len * Float32Array.BYTES_PER_ELEMENT * 2);
        const buf = new Float32Array(mem.buffer, 0, len * 2);
        buf.set(vecf32Array, 0);
    }

    getVecF32Array(offset, len) {
        const mem = new Spark(this.buffer, offset, len * Float32Array.BYTES_PER_ELEMENT * 2);
        return new Float32Array(mem.buffer, 0, len * 2);
    }
}
