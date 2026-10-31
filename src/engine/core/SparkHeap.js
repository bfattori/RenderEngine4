import Config from './Config.js';
import Context from '../Context.js';
import RenderEngineError from './RenderEngineError.js';
import Spark from './Sparky.js';

const ctx = Context.getInstance();

class SparkError extends RenderEngineError {
    #memInfo = null;

    constructor(message, coreDump) {
        super(`🗲 SparkError 🗲 ${message}`);
        this.#memInfo = coreDump;
    }

    get mem() {
        return this.#memInfo;
    }
}

// Spark logger mech
const spLog = function(...args) {
    if (!ctx.debug) return;
    console.debug("🗲 SparkHeap 🗲", ...args);
}

/**
 * @class SparkHeap
 * @classdesc
 * The `SparkHeap` is the memory manager for the `Spark` data views. The manager is
 * designed _specifically_ to eliminate as much memory thrashing as possible, given it is being
 * used in a game environment. 
 * 
 * During normal operation, several thousand bytes may be allocated and freed - potentially _per frame._ 
 * When using the standard JavaScript heap allocator, this many operations can lead to throwing away memory 
 * pointers and triggering garbage collection and performance degradation.
 * 
 * `Spark` is optimized for this use case by allocating memory and is segmented it into several byte-boundaries
 * are defined to break apart the memory space into byte-aligned allocation (a problem when a `DataView` does not align
 * with a byte-boundary). When a `TypedArray` is allocated, attempting to point it at a non-byte-aligned offset will
 * throw a `RangeError`. This attempts to remove that limitation by segmenting the buffer into 8, 16, 32, and 64 bit segments
 * upon which `TypedArray` can be used to create a view, rather than a new allocation.
 * 
 * `SparkHeap` can be configured before the engine is initialized.
 * @example 
 *    self.SPARK_OPTIONS = {
 *      heapSize: 1024 * 2048   // 2MB
 *    };
 * 
 *    // Initialize the engine
 *    await RenderEngine.init(import.meta.url, {
 *      flags: {
 *      ...
 */
export default class SparkHeap {
    static BYTE_8 = 1;
    static BYTE_16 = 2;
    static BYTE_32 = 4;
    static BYTE_64 = 8;

    static IB_8 = 0;
    static IB_16 = 1;
    static IB_32 = 2;
    static IB_64 = 3;

    #config = null;
    #internalHeap;
    #segSize;
    #segmentTP = new Uint32Array(4);        // segment front byte-boundary
    #segmentBB = new Uint32Array(4);        // segment end byte-boundary
    #segmentHD = new Uint32Array(4);        // segment head allocator
    #BOUNDARY_LAYER;
    
    constructor() {
        spLog("Initializing -")
        this.#config = new SparkHeapConfig();
        this.#allocateHeap();
    }

    #allocateHeap() {
        spLog(`   alloc ${this.#config.heapSize} bytes`);
        this.#internalHeap = new ArrayBuffer(this.#config.heapSize);

        spLog(`     - [Unit ${this.#config.baseUnit} bytes]`);

        // spacing between segments
        this.#BOUNDARY_LAYER = this.#config.baseUnit * this.#config.boundaryElementOffset;
        spLog(`     - BoundaryLayer :: ${this.#BOUNDARY_LAYER}b`);

        // set up allocation segments
        const favor = this.#config.segmentUseFavorability,
            favoredSize = Math.floor(this.#config.heapSize * favor);

        if (favor > 0)
            spLog(`     - +${Math.floor(favor * 100)}% (${favoredSize}b)`);

        switch (this.#config.baseUnit) {
            case SparkHeap.BYTE_8:
                this.#segSize = this.#config.heapSize; 
                this.#segmentBB[SparkHeap.IB_8] = this.#config.heapSize;
                this.#segmentHD[SparkHeap.IB_8] = 0;
                break;
            case SparkHeap.BYTE_16:
                this.#segSize = Math.ceil(this.#config.heapSize / 2);
                this.#segmentBB[SparkHeap.IB_16] = this.#config.heapSize;
                if (favor > 0) {
                    this.#segmentHD[SparkHeap.IB_16] = this.#config.heapSize - favoredSize;
                } else {
                    this.#segmentHD[SparkHeap.IB_16] = this.#config.heapSize - this.#segSize;
                }
                
                // what remains
                this.#segmentBB[SparkHeap.IB_8] = this.#segmentHD[SparkHeap.IB_16] - this.#BOUNDARY_LAYER;
                this.#segmentHD[SparkHeap.IB_8] = 0;
                break;
            case SparkHeap.BYTE_32:
                this.#segSize = Math.ceil(this.#config.heapSize / 3);
                this.#segmentBB[SparkHeap.IB_32] = this.#config.heapSize;
                if (favor > 0) {
                    this.#segmentHD[SparkHeap.IB_32] = this.#config.heapSize - favoredSize;
                    this.#segSize = Math.ceil(this.#segmentHD[SparkHeap.IB_32] / 2);
                } else {
                    this.#segmentHD[SparkHeap.IB_32] = this.#config.heapSize - this.#segSize;
                }
                this.#segmentBB[SparkHeap.IB_16] = this.#segmentHD[SparkHeap.IB_32] - this.#BOUNDARY_LAYER;
                this.#segmentHD[SparkHeap.IB_16] = this.#segmentBB[SparkHeap.IB_16] - this.#segSize;

                // remainder
                this.#segmentBB[SparkHeap.IB_8] = this.#segmentHD[SparkHeap.IB_16] - this.#BOUNDARY_LAYER;
                this.#segmentHD[SparkHeap.IB_8] = 0;
                break;
            case SparkHeap.BYTE_64:
                this.#segSize = Math.ceil(this.#config.heapSize / 4);
                this.#segmentBB[SparkHeap.IB_64] = this.#config.heapSize;
                if (favor > 0) {
                    this.#segmentHD[SparkHeap.IB_64] = this.#config.heapSize - favoredSize;
                    this.#segSize = Math.ceil(this.#segmentHD[SparkHeap.IB_64] / 3);
                } else {
                    this.#segmentHD[SparkHeap.IB_64] = this.#config.heapSize - this.#segSize;
                }
                this.#segmentBB[SparkHeap.IB_32] = this.#segmentHD[SparkHeap.IB_64] - this.#BOUNDARY_LAYER;
                this.#segmentHD[SparkHeap.IB_32] = this.#segmentBB[SparkHeap.IB_32] - this.#segSize;
                this.#segmentBB[SparkHeap.IB_16] = this.#segmentHD[SparkHeap.IB_32] - this.#BOUNDARY_LAYER;
                this.#segmentHD[SparkHeap.IB_16] = this.#segmentBB[SparkHeap.IB_16] - this.#segSize; 
                this.#segmentBB[SparkHeap.IB_8] = this.#segmentHD[SparkHeap.IB_16] - this.#BOUNDARY_LAYER;
                this.#segmentHD[SparkHeap.IB_8] = 0;
                break;
            default: throw new SparkError(`Unknown base unit type ${this.#config.baseUnit} - halting.`);
        }

        // ensure the boundaries byte-align
        this.#adjustBoundaries();

        this.dumpTable();
    }

    /**
     * Adjusts the head boundary for the segment allocation by aligning it
     * to the nearest byte. This allows for rapid allocations along byte
     * boundaries, a problem with `DataView` in general.
     */
    #adjustBoundaries() {
        const h64 = this.#segmentHD[SparkHeap.IB_64], t64 = this.#segmentBB[SparkHeap.IB_64],
            h32 = this.#segmentHD[SparkHeap.IB_32], t32 = this.#segmentBB[SparkHeap.IB_32] - this.#BOUNDARY_LAYER,
            h16 = this.#segmentHD[SparkHeap.IB_16], t16 = this.#segmentBB[SparkHeap.IB_16] - this.#BOUNDARY_LAYER,
            h8 = this.#segmentHD[SparkHeap.IB_8], t8 = this.#segmentBB[SparkHeap.IB_8];
        
        if (this.#config.baseUnit === SparkHeap.BYTE_64)
            if ((t64 - h64) % SparkHeap.BYTE_64 !== 0)
                this.#segmentHD[SparkHeap.IB_64] -= ((t64 - h64) % SparkHeap.BYTE_64);
            
        if (this.#config.baseUnit <= SparkHeap.BYTE_64)
            if ((t32 - h32) % SparkHeap.BYTE_32 !== 0)
                this.#segmentHD[SparkHeap.IB_32] -= ((t32 - h32) % SparkHeap.BYTE_32);
         
        if (this.#config.baseUnit <= SparkHeap.BYTE_32)
            if ((t16 - h16) % SparkHeap.BYTE_16 !== 0)
                this.#segmentHD[SparkHeap.IB_16] -= ((t16 - h16) % SparkHeap.BYTE_16);

        // store the front boundary pointers of each allocation
        this.#segmentTP[SparkHeap.IB_64] = this.#segmentHD[SparkHeap.IB_64];
        this.#segmentTP[SparkHeap.IB_32] = this.#segmentHD[SparkHeap.IB_32];
        this.#segmentTP[SparkHeap.IB_16] = this.#segmentHD[SparkHeap.IB_16];
        this.#segmentTP[SparkHeap.IB_8] = this.#segmentHD[SparkHeap.IB_8];
    }

    get buffer() {
        return this.#internalHeap;
    }

    dumpTable() {
        const table = ['Mem Alloc ['],

            h64 = this.#segmentHD[SparkHeap.IB_64], t64 = this.#segmentBB[SparkHeap.IB_64],
            h32 = this.#segmentHD[SparkHeap.IB_32], t32 = this.#segmentBB[SparkHeap.IB_32] - this.#BOUNDARY_LAYER,
            h16 = this.#segmentHD[SparkHeap.IB_16], t16 = this.#segmentBB[SparkHeap.IB_16] - this.#BOUNDARY_LAYER,
            h8 = this.#segmentHD[SparkHeap.IB_8], t8 = this.#segmentBB[SparkHeap.IB_8];

        if (this.#config.baseUnit === SparkHeap.BYTE_64)
            table.push(`64: ${h64}-${t64} (${(((t64 - h64) / SparkHeap.BYTE_64) / 1024).toFixed(1)}k)`);
        if (this.#config.baseUnit <= SparkHeap.BYTE_64)
            table.push(`32: ${h32}-${t32} (${(((t32 - h32) / SparkHeap.BYTE_32) / 1024).toFixed(1)}k)`);
        if (this.#config.baseUnit <= SparkHeap.BYTE_32)
            table.push(`16: ${h16}-${t16} (${(((t16 - h16) / SparkHeap.BYTE_16) / 1024).toFixed(1)}k)`);

        table.push(`8: ${h8}-${t8} (${((t8 - h8) / 1024).toFixed(1)}k)`);
        spLog(table.join(' |') + ']');
    }

    dumpMemory(offs, len) {
    }

    /**
     * Verify the allocation can succeed.
     * @param {number} byteSize - One of the byte sizes (BYTE_8, BYTE_16...)
     * @returns {number} The memory segment
     */
    #isByteSizeAvail(byteSize) {
        let segPtr = -1;
        switch(byteSize) {
            case SparkHeap.BYTE_64: segPtr = SparkHeap.IB_64; break;
            case SparkHeap.BYTE_32: segPtr = SparkHeap.IB_32; break;
            case SparkHeap.BYTE_16: segPtr = SparkHeap.IB_16; break;
            case SparkHeap.BYTE_8: segPtr = SparkHeap.IB_8; break;

        }
        
        if (this.#segmentBB[segPtr] === 0) 
            throw new SparkError(`Spark is not configured for ${byteSize * 8}-bit values.`);

        return segPtr;
    }

    /**
     * Returns a memory segment allocation of `len` bytes for the specified datatype.
     * @param {number} byteSize - The element size to allocate (BYTE_32, BYTE_8...)
     * @param {number} len - The number of elements (not bytes) to allocate
     * @returns {Spark} A byte-aligned view of the heap
     */
    malloc(byteSize, len) {
        const segPtr = this.#isByteSizeAvail(byteSize), allocSize = len * byteSize;

        // current head pointer
        let segHeadPtr = this.#segmentHD[segPtr];
        
        // compare to segment boundary
        if (segHeadPtr + allocSize > this.#segmentBB[segPtr]) {
            if (this.#config.throwAllocErrors)
                throw new SparkError(`malloc: Out of memory *0x${segHeadPtr.toString(16).toUpperCase()} (${segPtr} ma:${allocSize}b [${(segHeadPtr + allocSize) - this.#segmentBB[segPtr]}b])`);
            else
                // wrap around to the beginning of the segment (no overflow - destructive)
                segHeadPtr = this.#segmentTP[segPtr];
        }

        // move the head pointer
        this.#segmentHD[segPtr] = segHeadPtr + allocSize;

        // return a view that is byte-aligned to the byteSize
        return new Spark(this.buffer, segHeadPtr, allocSize);
    }

    free(ptr, byteLength) {
        const addo = new Uint8Array(this.buffer, ptr, byteLength);
        addo.fill(0);
    }

    readBytes(ptr, len) {
        return new Spark(this.buffer, ptr, len);
    }

    //-------------------------------
    // Byte-length allocators

    alloc64(len) {
        return this.malloc(SparkHeap.BYTE_64, len);
    }

    /**
     * Returns a memory segment allocation sized in 32-bits
     * @param {number} len - The number of elements (not bytes) to allocate
     * @returns {Spark} A 32-bit aligned view of the heap
     */
    alloc32(len) {
        return this.malloc(SparkHeap.BYTE_32, len);
    }

    /**
     * Returns a memory segment allocation sized in 16-bits
     * @param {number} len - The number of elements (not bytes) to allocate
     * @returns {Spark} A 16-bit aligned view of the heap
     */
    alloc16(len) {
        return this.malloc(SparkHeap.BYTE_16, len);
    }

    /**
     * Returns a memory segment allocation in bytes (8-bit)
     * @param {number} len - The number of elements (bytes) to allocate
     * @returns {Spark} An 8-bit aligned view of the heap
     */
    alloc8(len) {
        return this.malloc(SparkHeap.BYTE_8, len);
    }
}

class SparkHeapConfig extends Config {
    constructor() {
        super({
          /**
           * This is the maximum sized value that will be
           * stored in the heap for all data types.
           * @type {number}
           */
          baseUnit: SparkHeap.BYTE_32,

          /**
           * The total amount of memory to reserve in bytes.
           * @type {number} The number of bytes to allocate
           */
          heapSize: 1048576, // 1MB (1024 * 1024)

          /**
           * Balance the amount of memory to favor the
           * most used type. Zero indicates equal distribution.
           * @type {number} A percentage
           */
          segmentUseFavorability: 0.65,

          /**
           * The offset (in base units) between memory segments.
           * @type {number}
           */
          boundaryElementOffset: 5,
          
          /**
           * When set to `true`, `SparkHeap` will throw `SparkError` when memory is 
           * unavailable to allocate. Otherwise, the head pointer for the segment is reset 
           * to zero allowing for endless allocations. The latter method is destructive in 
           * that it overwrites memory that is possibly in use.
           * @type {boolean}
           */
          throwAllocErrors: false
        });
    }

    /**
     * Override configuration options with this global variable name
     * @returns {String} The variable name
     */
    get varname() {
        return 'SPARK_OPTIONS';
    }
}

export { SparkHeapConfig };

class SparkArray64 extends BigUint64Array {
    #head = null;
    constructor(buffer, offset, lengthInBytes, pointer = -1) {
        super(buffer, offset, lengthInBytes);
        this.#head = pointer;
    }
    get pointer() { return this.#head; }
}

class SparkArray32 extends Uint32Array {
    #head = null;
    constructor(buffer, offset, lengthInBytes, pointer = -1) {
        super(buffer, offset, lengthInBytes);
        this.#head = pointer;
    }
    get pointer() { return this.#head; }
}

class SparkArray16 extends Spark {
    #head = null;
    constructor(buffer, offset, lengthInBytes, pointer = -1) {
        super(buffer, offset, lengthInBytes);
        this.#head = pointer;
    }
    get pointer() { return this.#head; }
}

class SparkArray8 extends Spark {
    #head = null;
    constructor(buffer, offset, lengthInBytes, pointer = -1) {
        super(buffer, offset, lengthInBytes);
        this.#head = pointer;
    }
    get pointer() { return this.#head; }
}

export {
    SparkArray64,
    SparkArray32,
    SparkArray16,
    SparkArray8
};

// initialize the array heap for global scope
self.SPARK_MM = new SparkHeap();
