import { Logger } from '../lang/Console.js';
import { SparkHeapConfig } from '../config/Config.js';
import Context from '../../Context.js';
import RenderEngineError from '../RenderEngineError.js';
import Spark from './Spark.js';

const ctx = Context.getInstance();
let log;

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
    #log;
    
    constructor(config = null) {
        this.#config = config || new SparkHeapConfig();
        log = new Logger(SparkHeap, config ? `:${config.name}:` : ':System:', false, self.console);
        this.#allocateHeap();
    }

    #allocateHeap() {
        // heap buffer
        this.#internalHeap = new ArrayBuffer(this.#config.heapSize);
        
        // spacing between segments
        this.#BOUNDARY_LAYER = this.#config.baseUnit * this.#config.boundaryElementOffset;

        // set up allocation segments
        const pctReserve = this.#config.reserveSize,
            reservedSegSize = Math.floor(this.#config.heapSize * pctReserve);
            
        let heapAlloc = this.#config.heapSize;
        heapAlloc = heapAlloc >= 1048576 ? `${heapAlloc/1048576}MB` : heapAlloc >= 1024 ? `${heapAlloc/1024}KB` : `${heapAlloc}B`;
        log.verbose(`alloc ${heapAlloc} (${this.#config.baseUnit}B unit), ${this.#BOUNDARY_LAYER}B boundary, fav +${Math.floor(pctReserve * 100)}%${reservedSegSize !== 0 ? ' (res: ' + (reservedSegSize / 1024).toFixed(1) + 'KB)' : ''}`);

        switch (this.#config.baseUnit) {
            case SparkHeap.BYTE_8:
                this.#segSize = this.#config.heapSize; 
                this.#segmentBB[SparkHeap.IB_8] = this.#config.heapSize;
                this.#segmentHD[SparkHeap.IB_8] = 0;
                break;
            case SparkHeap.BYTE_16:
                this.#segSize = Math.ceil(this.#config.heapSize / 2);
                this.#segmentBB[SparkHeap.IB_16] = this.#config.heapSize;
                if (pctReserve === 1) {
                    this.#segmentHD[SparkHeap.IB_16] = this.#BOUNDARY_LAYER;
                    this.#segmentHD[SparkHeap.IB_8] = 0;
                    this.#segmentBB[SparkHeap.IB_8] = 0;
                } else if (pctReserve > 0) {
                    this.#segmentHD[SparkHeap.IB_16] = this.#config.heapSize - reservedSegSize;
                } else {
                    this.#segmentHD[SparkHeap.IB_16] = this.#config.heapSize - this.#segSize;

                    // what remains
                    this.#segmentBB[SparkHeap.IB_8] = this.#segmentHD[SparkHeap.IB_16] - this.#BOUNDARY_LAYER;
                    this.#segmentHD[SparkHeap.IB_8] = 0;
                }
                break;
            case SparkHeap.BYTE_32:
                this.#segSize = Math.ceil(this.#config.heapSize / 3);
                this.#segmentBB[SparkHeap.IB_32] = this.#config.heapSize;
                if (pctReserve === 1) {
                    this.#segmentHD[SparkHeap.IB_32] = this.#BOUNDARY_LAYER;
                    this.#segmentHD[SparkHeap.IB_16] = 0;
                    this.#segmentHD[SparkHeap.IB_8] = 0;
                    this.#segmentBB[SparkHeap.IB_16] = 0;
                    this.#segmentBB[SparkHeap.IB_8] = 0;
                } else {
                    if (pctReserve > 0) {
                        this.#segmentHD[SparkHeap.IB_32] = this.#config.heapSize - reservedSegSize;
                        this.#segSize = Math.ceil(this.#segmentHD[SparkHeap.IB_32] / 2);
                    } else {
                        this.#segmentHD[SparkHeap.IB_32] = this.#config.heapSize - this.#segSize;
                    }

                    this.#segmentBB[SparkHeap.IB_16] = this.#segmentHD[SparkHeap.IB_32] - this.#BOUNDARY_LAYER;
                    this.#segmentHD[SparkHeap.IB_16] = this.#segmentBB[SparkHeap.IB_16] - this.#segSize;

                    // remainder
                    this.#segmentBB[SparkHeap.IB_8] = this.#segmentHD[SparkHeap.IB_16] - this.#BOUNDARY_LAYER;
                    this.#segmentHD[SparkHeap.IB_8] = 0;
                }
                break;
            case SparkHeap.BYTE_64:
                this.#segSize = Math.ceil(this.#config.heapSize / 4);
                this.#segmentBB[SparkHeap.IB_64] = this.#config.heapSize;
                if (pctReserve === 1) {
                    this.#segmentHD[SparkHeap.IB_64] = this.#BOUNDARY_LAYER;
                    this.#segmentHD[SparkHeap.IB_32] = 0;
                    this.#segmentHD[SparkHeap.IB_16] = 0;
                    this.#segmentHD[SparkHeap.IB_8] = 0;
                    this.#segmentBB[SparkHeap.IB_32] = 0;
                    this.#segmentBB[SparkHeap.IB_16] = 0;
                    this.#segmentBB[SparkHeap.IB_8] = 0;
                } else {
                    if (pctReserve > 0) {
                        this.#segmentHD[SparkHeap.IB_64] = this.#config.heapSize - reservedSegSize;
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
                }
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
            h16 = this.#segmentHD[SparkHeap.IB_16], t16 = this.#segmentBB[SparkHeap.IB_16] - this.#BOUNDARY_LAYER;

        // adjust the head pointer to the nearest byte boundary (64-bit)
        if (this.#config.baseUnit === SparkHeap.BYTE_64)
            if (h64 % SparkHeap.BYTE_64 !== 0)
                this.#segmentHD[SparkHeap.IB_64] -= (h64 % SparkHeap.BYTE_64);
            
        // adjust the head pointer to the nearest byte boundary (32-bit)
        if (this.#config.baseUnit <= SparkHeap.BYTE_64)
            if (h32 % SparkHeap.BYTE_32 !== 0)
                this.#segmentHD[SparkHeap.IB_32] -= (h32 % SparkHeap.BYTE_32);
         
        // adjust the head pointer to the nearest byte boundary (16-bit)
        if (this.#config.baseUnit <= SparkHeap.BYTE_32)
            if (h16 % SparkHeap.BYTE_16 !== 0)
                this.#segmentHD[SparkHeap.IB_16] -= (h16  % SparkHeap.BYTE_16);

        // store the front boundary pointers of each allocation
        this.#segmentTP[SparkHeap.IB_64] = this.#segmentHD[SparkHeap.IB_64];
        this.#segmentTP[SparkHeap.IB_32] = this.#segmentHD[SparkHeap.IB_32];
        this.#segmentTP[SparkHeap.IB_16] = this.#segmentHD[SparkHeap.IB_16];
        this.#segmentTP[SparkHeap.IB_8] = this.#segmentHD[SparkHeap.IB_8];
    }

    /**
     * The buffer backing the `SparkHeap` allocator. This is the 
     * `ArrayBuffer` that is segmented into 8, 16, 32, and 64-bit 
     * segments for allocation.
     * @return {ArrayBuffer} The buffer backing the `SparkHeap` allocator
     */
    get buffer() {
        return this.#internalHeap;
    }

    /**
     * Log the cuurent allocation table to the console. This is useful for debugging and understanding
     * how the memory is being allocated and used.
     */
    dumpTable() {
        const table = [],

            h64 = this.#segmentHD[SparkHeap.IB_64], t64 = this.#segmentBB[SparkHeap.IB_64],
            h32 = this.#segmentHD[SparkHeap.IB_32], t32 = this.#segmentBB[SparkHeap.IB_32] !== 0 ? this.#segmentBB[SparkHeap.IB_32] - this.#BOUNDARY_LAYER : 0,
            h16 = this.#segmentHD[SparkHeap.IB_16], t16 = this.#segmentBB[SparkHeap.IB_16] !== 0 ? this.#segmentBB[SparkHeap.IB_16] - this.#BOUNDARY_LAYER : 0,
            h8 = this.#segmentHD[SparkHeap.IB_8], t8 = this.#segmentBB[SparkHeap.IB_8];

        if (this.#config.baseUnit === SparkHeap.BYTE_64)
            table.push(`64: ${h64}-${t64} [${(t64-h64) / SparkHeap.BYTE_64}] ${((t64 - h64) / 1024).toFixed(1)}KB`);
        if (this.#config.baseUnit <= SparkHeap.BYTE_64 && t32 !== 0)
            table.push(`32: ${h32}-${t32} [${(t32-h32) / SparkHeap.BYTE_32}] ${((t32 - h32) / 1024).toFixed(1)}KB`);
        if (this.#config.baseUnit <= SparkHeap.BYTE_32 && t16 !== 0)
            table.push(`16: ${h16}-${t16} [${(t16-h16) / SparkHeap.BYTE_16}] ${((t16 - h16) / 1024).toFixed(1)}KB`);

        if (t8 !== 0) 
            table.push(`8: ${h8}-${t8} [${t8-h8}] ${((t8 - h8) / 1024).toFixed(1)}KB`);
        log.verbose('[' + table.join('|') + ']');
    }

    /**
     * RESERVED FOR FUTURE USE
     * @param {number} offs 
     * @param {number} len 
     */
    dumpMemory(offs, len) {
    }

    /**
     * Verify the allocation will succeed.
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
        const sp = new Spark(this.buffer, segHeadPtr, allocSize);
        return sp;
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

