import { SparkHeapConfig } from './Config.js';
import SparkHeap from './SparkHeap.js';

const MathPool = {
    _heap: null,
    
    init: () => {
        // allocate a pool of memory for math operations
        MathPool._heap = new SparkHeap(new SparkHeapConfig({
            heapSize: 16384,
            reserveSize: 1.0
        }));
    },

    // general allocator

    $malloc: (byteSize, size) => {
        return MathPool._heap.malloc(byteSize, size * byteSize);
    },

    // typed arrays

    getI8Array: (size) => {
        const spark = MathPool.$malloc(SparkHeap.BYTE_8, size);
        return new Int8Array(spark.buffer, spark.byteOffset, size);
    },

    getI16Array: (size) => {
        const spark = MathPool.$malloc(SparkHeap.BYTE_16, size);
        return new Int16Array(spark.buffer, spark.byteOffset, size);
    },

    getI32Array: (size) => {
        const spark = MathPool.$malloc(SparkHeap.BYTE_32, size);
        return new Int32Array(spark.buffer, spark.byteOffset, size);
    },

    getI64Array: (size) => {
        const spark = MathPool.$malloc(SparkHeap.BYTE_64, size);
        return new BigInt64Array(spark.buffer, spark.byteOffset, size);
    },

    getU8Array: (size) => {
        const spark = MathPool.$malloc(SparkHeap.BYTE_8, size);
        return new Uint8Array(spark.buffer, spark.byteOffset, size);
    },

    getU16Array: (size) => {
        const spark = MathPool.$malloc(SparkHeap.BYTE_16, size);
        return new Uint16Array(spark.buffer, spark.byteOffset, size);
    },

    getU32Array: (size) => {
        const spark = MathPool.$malloc(SparkHeap.BYTE_32, size);
        return new Uint32Array(spark.buffer, spark.byteOffset, size);
    },

    getU64Array: (size) => {
        const spark = MathPool.$malloc(SparkHeap.BYTE_64, size);
        return new BigUint64Array(spark.buffer, spark.byteOffset, size);
    },

    getF32Array: (size) => {
        const spark = MathPool.$malloc(SparkHeap.BYTE_32, size);
        return new Float32Array(spark.buffer, spark.byteOffset, size);
    },

    getF64Array: (size) => {
        const spark = MathPool.$malloc(SparkHeap.BYTE_64, size);
        return new Float64Array(spark.buffer, spark.byteOffset, size);
    },

    // 2d vectors

    getVecI8: () => {
        return MathPool.getI8Array(2);
    },

    getVecU8: () => {
        return MathPool.getU8Array(2);
    },

    getVecI16: () => {
        return MathPool.getI16Array(2);
    },

    getVecU16: () => {
        return MathPool.getU16Array(2);
    },

    getVecI32: () => {
        return MathPool.getI32Array(2);
    },

    getVecU32: () => {
        return MathPool.getU32Array(2);
    },

    getVecI64: () => {
        return MathPool.getI64Array(2);
    },

    getVecU64: () => {
        return MathPool.getU64Array(2);
    },

    getVecF32: () => {
        return MathPool.getF32Array(2);
    },

    getVecF64: () => {
        return MathPool.getF64Array(2);
    },

    // 2d vector arrays

    getVecF32Array: (size) => {
        return MathPool.getF32Array(size * 2);
    },

    getVecF64Array: (size) => {
        return MathPool.getF64Array(size * 2);
    }
};

const Core = {
  initialize: () => {
    // initialize the spark memory manager
    self.SPARK_MM = new SparkHeap();

    // initialize the MathPool
    MathPool.init();
  }
};

export default Core;

export {
  MathPool
};