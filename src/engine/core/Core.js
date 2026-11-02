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

    getF32Array: (size) => {
        const spark = MathPool._heap.malloc(SparkHeap.BYTE_32, size * Float32Array.BYTES_PER_ELEMENT);
        return new Float32Array(spark.buffer, spark.byteOffset, size);
    },

    getVecF32Array: (size) => {
        const spark = MathPool._heap.malloc(SparkHeap.BYTE_32, (size * 2) * Float32Array.BYTES_PER_ELEMENT);
        return new Float32Array(spark.buffer, spark.byteOffset, size * 2);
    }
}

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