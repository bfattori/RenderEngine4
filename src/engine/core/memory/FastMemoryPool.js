import Constants from '../../Constants.js';
import { Logger } from '../lang/Console.js';
import { SparkHeapConfig } from '../config/Config.js';
import SparkHeap from './SparkHeap.js';

export default class FastMemoryPool {
    #log;
    #name;
    #heap = null;
    
    static #instance = null;

    /**
     * Get the system memory pool for fast allocations.
     * @returns {FastMemoryPool}
     */
    static getInstance() {
        // configures the system fast memory pool
        if (!FastMemoryPool.#instance) {
            FastMemoryPool.#instance = new FastMemoryPool({
                name: 'PoolAllocator',
                baseUnit: SparkHeap.BYTE_32,
                heapSize: Constants.SYSTEM_POOL_SIZE,
                reserveSize: 0.95     // prioritize for 32-bit values
            });
        }

        return FastMemoryPool.#instance;
    }

    constructor(config = {
        name: 'FastMemoryPool',
        baseUnit: SparkHeap.BYTE_64,
        heapSize: Constants.DEFAULT_POOL_SIZE              
    }) {
        this.#log = new Logger(this, `(${config.name})`);

        // allocate a pool of memory for memory allocation operations
        this.#heap = new SparkHeap(new SparkHeapConfig(config));
        this.#name = name;
    }

    get name() {
      return this.#name;
    }

    // general allocator

    #malloc(byteSize, size) {
        return this.#heap.malloc(byteSize, size * byteSize);
    }

    // typed arrays

    #getI8Array(size) {
        const spark = this.#malloc(SparkHeap.BYTE_8, size);
        return new Int8Array(spark.buffer, spark.byteOffset, size);
    }

    #getI16Array(size) {
        const spark = this.#malloc(SparkHeap.BYTE_16, size);
        return new Int16Array(spark.buffer, spark.byteOffset, size);
    }

    #getI32Array(size) {
        const spark = this.#malloc(SparkHeap.BYTE_32, size);
        return new Int32Array(spark.buffer, spark.byteOffset, size);
    }

    #getI64Array(size) {
        const spark = this.#malloc(SparkHeap.BYTE_64, size);
        return new BigInt64Array(spark.buffer, spark.byteOffset, size);
    }

    #getU8Array(size) {
        const spark = this.#malloc(SparkHeap.BYTE_8, size);
        return new Uint8Array(spark.buffer, spark.byteOffset, size);
    }

    #getU16Array(size) {
        const spark = this.#malloc(SparkHeap.BYTE_16, size);
        return new Uint16Array(spark.buffer, spark.byteOffset, size);
    }

    #getU32Array(size) {
        const spark = this.#malloc(SparkHeap.BYTE_32, size);
        return new Uint32Array(spark.buffer, spark.byteOffset, size);
    }

    #getU64Array(size) {
        const spark = this.#malloc(SparkHeap.BYTE_64, size);
        return new BigUint64Array(spark.buffer, spark.byteOffset, size);
    }

    #getF32Array(size) {
        const spark = this.#malloc(SparkHeap.BYTE_32, size);
        return new Float32Array(spark.buffer, spark.byteOffset, size);
    }

    #getF64Array(size) {
        const spark = this.#malloc(SparkHeap.BYTE_64, size);
        return new Float64Array(spark.buffer, spark.byteOffset, size);
    }

    // 2d vectors

    get VecI8() {
        return this.#getI8Array(2);
    }

    get VecU8() {
        return this.#getU8Array(2);
    }

    get VecI16() {
        return this.#getI16Array(2);
    }

    get VecU16() {
        return this.#getU16Array(2);
    }

    get VecI32() {
        return this.#getI32Array(2);
    }

    get VecU32() {
        return this.#getU32Array(2);
    }

    get VecI64() {
        return this.#getI64Array(2);
    }

    get VecU64() {
        return this.#getU64Array(2);
    }

    get VecF32() {
        return this.#getF32Array(2);
    }

    get VecF64() {
        return this.#getF64Array(2);
    }

    // 2d vector arrays

    VecF32Array(size) {
        return this.#getF32Array(size * 2);
    }

    VecF64Array(size) {
        return this.#getF64Array(size * 2);
    }
};

const initializeSystemMM = () => {
    // initialize memory management
    self.SPARK_MM = new SparkHeap();
    self.SPARK_POOL = FastMemoryPool.getInstance();
}

export {
    initializeSystemMM
};