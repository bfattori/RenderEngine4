
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