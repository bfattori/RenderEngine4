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
                offset += EDV[v.type].size;
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
        const m = {}, offs = 0;
        this.forEach((val, key) => {
            if (val.len === 1) {
                m[key] = (value) => {
                    // simple value
                    if (value) {
                        this.segment['set' + EDV[this.get(key)].type](this.getByteOffset(key), value);
                    } else {
                        return this.segment['get' + EDV[this.get(key)].type](this.getByteOffset(key));
                    }
                };
            } else {
                m[key] = (value, $$MEM) => {
                    // array of values
                    if (value) {
                        this.segment['set' +  EDV[this.get(key)].type + 'Array'](this.getByteOffset(key), value);
                    } else {
                        return this.segment['get' +  EDV[this.get(key)].type + 'Array'](this.getByteOffset(key));
                    }
                };
            }
        });

        Util.lombok(this, m);
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
                total += EDV[v.type].size;
              } else {
                // include total bytes of array length
                total += EDV[v.type].size * v.len;
              }
            });
            this.#sizeOf = total;
        }
        return this.#sizeOf;
    }
}

export { MemShape };

export default class EDV extends DataView {
    #options = null;

    // standard types
    static Int8 =       {type: 'Int8',      size: 1};
    static UInt8 =      {type: 'Uint8',     size: 1};
    static Int16 =      {type: 'Int16',     size: 2};
    static UInt16 =     {type: 'Uint16',    size: 2};
    static Int32 =      {type: 'Int32',     size: 4};
    static UInt32 =     {type: 'Uint32',    size: 4};
    static Int64 =      {type: 'BigInt64',  size: 8};
    static UInt64 =     {type: 'BigUint64', size: 8};
    static Float16 =    {type: 'Float16',   size: 2};
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
    static VecF16 =     {type: 'VecF16',    size: 4};
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
        // const small = color.length >= 3 && color.length <= 4;
        // let coded = parseInt(small ? `${color[0]}${color[0]}` : color.substring(0, 2), 16) << 24;
        // coded += parseInt(small ? `${color[1]}${color[1]}` : color.substring(2, 4), 16) << 16;
        // coded += parseInt(small ? `${color[2]}${color[2]}` : color.substring(4, 6), 16) << 8;
        // if (color.length === 4) {
        //     coded += parseInt(`${color[3]}${color[3]}`, 16);
        // } else if (color.length === 6) {
        //     coded += parseInt(color.substring(6, 8), 16);
        // } else {
        //   // assume fully opaque for 3 digit hex color codes
        //   coded += 255;
        // }
        return parseInt(color, 16);
    }

    /**
     * Decode a 32-bit unsigned integer into a hex color
     * @param {Uint32} uint32 - 32-bit unsigned integer
     * @returns {String} Hex color format (#rrggbbaa)
     */
    #decodeColor32(uint32) {
        return uint32.toString(16);
        // const r = (uint32 >> 24 & 0xFF);
        // const g = (uint32 >> 16 & 0xFF);
        // const b = (uint32 >> 8 & 0xFF);
        // const a = uint32 & 0x000000FF;
        // return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
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
      const buf = new Uint16Array(this.buffer, offset + EDV.UInt16.size, stringVal.length);
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
      const buf = new Uint16Array(this.buffer, offset + EDV.UInt16.size, len);
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
        this.setInt8(offset + EDV.Int8.size, vec8[1]);
    }

    /**
     * Retrieve a 2-element 8-bit signed vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVec8(offset) {
        return [this.getInt8(offset), this.getInt8(offset + EDV.Int8.size)];
    }

    /**
     * Store a 2-element 8-bit unsigned vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecU8 - 2-element array
     */
    setVecU8(offset, vecU8) {
        this.setUint8(offset, vecU8[0]);
        this.setUint8(offset + EDV.UInt8.size, vecU8[1]);
    }

    /**
     * Retrieve a 2-element 8-bit unsigned vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVecU8(offset) {
        return [this.getUint8(offset), this.getUint8(offset + EDV.UInt8.size)];
    }

    /**
     * Store a 2-element 16-bit signed vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vec16 - 2-element array
     */
    setVec16(offset, vec16) {
        this.setInt16(offset, vec16[0]);
        this.setInt16(offset + EDV.Int16.size, vec16[1]);
    }

    /**
     * Retrieve a 2-element 16-bit signed vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVec16(offset) {
        return [this.getInt16(offset), this.getInt16(offset + EDV.Int16.size)];
    }

    /**
     * Store a 2-element 16-bit unsigned vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecU16 - 2-element array
     */
    setVecU16(offset, vecU16) {
        this.setUint16(offset, vecU16[0]);
        this.setUint16(offset + EDV.UInt16.size, vecU16[1]);
    }

    /**
     * Retrieve a 2-element 16-bit unsigned vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVecU16(offset) {
        return [this.getUint16(offset), this.getUint16(offset + EDV.UInt16.size)];
    }

    /**
     * Store a 2-element 32-bit signed vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vec32 - 2-element array
     */
    setVec32(offset, vec32) {
        this.setInt32(offset, vec32[0]);
        this.setInt32(offset + EDV.Int32.size, vec32[1]);
    }

    /**
     * Retrieve a 2-element 32-bit signed vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVec32(offset) {
        return [this.getInt32(offset), this.getInt32(offset + EDV.Int32.size)];
    }

    /**
     * Store a 2-element 32-bit unsigned vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecU32 - 2-element array
     */
    setVecU32(offset, vecU32) {
        this.setUint32(offset, vecU32[0]);
        this.setUint32(offset + EDV.UInt32.size, vecU32[1]);
    }

    /**
     * Retrieve a 2-element 32-bit unsigned vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVecU32(offset) {
        return [this.getUint32(offset), this.getUint32(offset + EDV.UInt32.size)];
    }

    /**
     * Store a 2-element 64-bit signed vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vec64 - 2-element array
     */
    setVec64(offset, vec64) {
        this.setBigInt64(offset, vec64[0]);
        this.setBigInt64(offset + EDV.Int64.size, vec64[1]);
    }

    /**
     * Retrieve a 2-element 64-bit signed vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVec64(offset) {
        return [this.getBigInt64(offset), this.getBigInt64(offset + EDV.Int64.size)];
    }

    /**
     * Store a 2-element 64-bit unsigned vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecU64 - 2-element array
     */
    setVecU64(offset, vecU64) {
        this.setBigUint64(offset, vecU64[0]);
        this.setBigUint64(offset + EDV.UInt64.size, vecU64[1]);
    }

    /**
     * Retrieve a 2-element 64-bit unsigned vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVecU64(offset) {
        return [this.getBigUint64(offset), this.getBigUint64(offset + EDV.UInt64.size)];
    }

    /**
     * Store a 2-element 16-bit floating point vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecF16 - 2-element array
     */
    setVecF16(offset, vecF16) {
        this.setFloat16(offset, vecF16[0]);
        this.setFloat16(offset + EDV.Float16.size, vecF16[1])
    }

    /**
     * Retrieve a 2-element 16-bit floating point vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVecF16(offset) {
        return [this.getFloat16(offset), this.getFloat16(offset + EDV.Float16.size)];
    }

    /**
     * Store a 2-element 32-bit floating point vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecF32 - 2-element array
     */
    setVecF32(offset, vecF32) {
        this.setFloat32(offset, vecF32[0]);
        this.setFloat32(offset + EDV.Float32.size, vecF32[1]);
    }

    /**
     * Retrieve a 2-element 32-bit floating point vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVecF32(offset) {
        return [this.getFloat32(offset), this.getFloat32(offset + EDV.Float32.size)];
    }

    /**
     * Store a 2-element 64-bit floating point vector
     * @param {number} offset - The bute offset
     * @param {Array<number>} vecF64 - 2-element array
     */
    setVecF64(offset, vecF64) {
        this.setFloat64(offset, vecF64[0]);
        this.setFloat64(offset + EDV.Float64.size, vecF64[1]);
    }

    /**
     * Retrieve a 2-element 64-bit floating point vector
     * @param {number} offset - The byte offset
     * @returns {Array<number>} A 2-element array
     */
    getVecF64(offset) {
        return [this.getFloat64(offset), this.getFloat64(offset + EDV.Float64.size)];
    }

    /**
     * Store an array of 8-bit signed integers (-128 to 127)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} int8Array - The array to store
     */
    setInt8Array(offset, int8Array) {
        this.setUint16(offset, int8Array.length);
        const buf = new Int8Array(this.buffer, offset + EDV.UInt16.size, int8Array.length);
        buf.set(int8Array, 0);
    }

    /**
     * Retrieve an array of 8-bit signed integers
     * @param {number} offset - The byte offset to the array
     * @returns {Int8Array<ArrayBuffer>} An array of 8-bit signed integers
     */
    getInt8Array(offset) {
        const len = this.getUint16(offset);
        return new Int8Array(this.buffer, offset + EDV.UInt16.size, len);
    }

    /**
     * Store an array of 16-bit signed integers (-32768 to 32767)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} int8Array - The array to store
     */
    setInt16Array(offset, int16Array) {
        this.setUint16(offset, int16Array.length);
        const buf = new Int16Array(this.buffer, offset + EDV.UInt16.size, int16Array.length);
        buf.set(int16Array, 0);
    }

    /**
     * Retrieve an array of 16-bit signed integers
     * @param {number} offset - The byte offset to the array
     * @returns {Int16Array<ArrayBuffer>} An array of 16-bit signed integers
     */
    getInt16Array(offset) {
        const len = this.getUint16(offset);
        return new Int16Array(this.buffer, offset + EDV.UInt16.size, len);
    }

    /**
     * Store an array of 32-bit signed integers (-2147483648 to 2147483647)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} int32Array - The array to store
     */
    setInt32Array(offset, int32Array) {
        this.setUint16(offset, int32Array.length);
        const buf = new Int32Array(this.buffer, offset + EDV.UInt16.size, int32Array.length);
        buf.set(int32Array, 0);
    }

    /**
     * Retrieve an array of 32-bit signed integers
     * @param {number} offset - The byte offset to the array
     * @returns {Int32Array<ArrayBuffer>} An array of 32-bit signed integers
     */
    getInt32Array(offset) {
        const len = this.getUint16(offset);
        return new Int32Array(this.buffer, offset + EDV.UInt16.size, len);
    }

    /**
     * Store an array of 64-bit signed integers (-2^63 to 2^63 - 1)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} int64Array - The array to store
     */
    setInt64Array(offset, int64Array) {
        this.setUint16(offset, int64Array.length);
        const buf = new Int64Array(this.buffer, offset + EDV.UInt16.size, int64Array.length);
        buf.set(int64Array, 0);
    }

    /**
     * Retrieve an array of 64-bit signed integers
     * @param {number} offset - The byte offset to the array
     * @returns {BigInt64Array<ArrayBuffer>} An array of 64-bit signed integers
     */
    getInt64Array(offset) {
        const len = this.getUint16(offset);
        return new BigInt64Array(this.buffer, offset + EDV.UInt16.size, len);
    }

    /**
     * Store an array of 16-bit floating points (-65504 to 65504)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} float16Array - The array to store
     */
    setFloat16Array(offset, float16Array) {
        this.setUint16(offset, float16Array.length);
        const buf = new Float16Array(this.buffer, offset + EDV.UInt16.size, float16Array.length);
        buf.set(float16Array, 0);
    }

    /**
     * Retrieve an array of 16-bit floating points
     * @param {number} offset - The byte offset to the array
     * @returns {Float16Array<ArrayBuffer>} An array of 16-bit floating points
     */
    getFloat16Array(offset) {
        const len = this.getUint16(offset);
        return new Float16Array(this.buffer, offset + EDV.UInt16.size, len);
    }

    /**
     * Store an array of 32-bit floating points (-3.4^38 to 3.4^38)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} float32Array - The array to store
     */
    setFloat32Array(offset, float32Array) {
        this.setUint16(offset, float32Array.length);
        const buf = new Float32Array(this.buffer, offset + EDV.UInt16.size, float32Array.length);
        buf.set(float32Array, 0);
    }

    /**
     * Retrieve an array of 32-bit floating points
     * @param {number} offset - The byte offset to the array
     * @returns {Float32Array<ArrayBuffer>} An array of 32-bit floating points
     */
    getFloat32Array(offset) {
        const len = this.getUint16(offset);
        return new Float32Array(this.buffer, offset + EDV.UInt16.size, len);
    }

    /**
     * Store an array of 64-bit floating points (-1.8^308 to 1.8^308)
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} float64Array - The array to store
     */
    setFloat64Array(offset, float64Array) {
        this.setUint16(offset, float64Array.length);
        const buf = new Float64Array(this.buffer, offset + EDV.UInt16.size, float64Array.length);
        buf.set(float64Array, 0);
    }

    /**
     * Retrieve an array of 64-bit floating points
     * @param {number} offset - The byte offset to the array
     * @returns {Float64Array<ArrayBuffer>} An array of 64-bit floating points
     */
    getFloat64Array(offset) {
        const len = this.getUint16(offset);
        return new Float64Array(this.buffer, offset + EDV.UInt16.size, len);
    }

    /**
     * Store an array of hex color values
     * @param {number} offset - The byte offset to the array
     * @param {Array<number>} color32Array - Array of hex colors store
     */
    setColor32Array(offset, color32Array) {
        this.setUint16(offset, color32Array.length);
        const buf = new Uint32Array(this.buffer, offset + EDV.UInt16.size, color32Array.length);
        color32Array.forEach((el, i) => {
          buf[i] = this.#encodeColor32(el);
        });
    }

    /**
     * Retrieve an array of hex color values
     * @param {number} offset - The byte offset to the array
     * @returns {Array<String>} An array of hex color values
     */
    getColor32Array(offset) {
        const len = this.getUint16(offset);
        const buf = new Uint32Array(this.buffer, offset + EDV.UInt16.size, len);
        const arr = [];
        buf.map(el => arr.push(this.#decodeColor32(el)));
        return arr;
    }
}
