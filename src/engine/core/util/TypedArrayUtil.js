
import RenderEngineError from '../RenderEngineError.js';

export default class TypedArrayUtil {
  /**
   * Similar to `Array.unshift()`, this provides a way to unshift values into a
   * `TypedArray` without creating a new one. This is useful when you need to add elements
   * to the start of an array without copying all existing elements. The limitation is that
   * the length of the array doesn't grow, so elements at the end are discarded when they
   * are pushed out.
   * @param {TypedArray} typedArray - The array to manipulate
   * @param  {...any} values - The values to add to the front of the array
   * @returns {TypedArray} `typedArray` with `values` added into the front of the array.
   * @throws {RenderEngineError} If `typedArray` is not a typed array
   */
  static unshift(typedArray, ...values) {
    if (!ArrayBuffer.isView(typedArray) || typedArray instanceof DataView) {
      throw new RenderEngineError('TypedArrayUtil', new SyntaxError('unshift(typedArray, ...values) - The first argument must be a typed array.'));
    }
    
    const numItems = values.length;
    if (numItems === 0) return typedArray;

    // 1. Shift existing elements to the right, dropping the overflowing ones at the end
    typedArray.copyWithin(numItems, 0);

    // 2. Insert the new items at the beginning
    for (let i = 0; i < Math.min(numItems, typedArray.length); i++) {
      typedArray[i] = values[i];
    }

    return typedArray;
  }

  /**
   * Convenience method to return the byte sizes of the various
   * memory types by name.
   * @param {String} type - Memory storage type name
   * @returns {number} The number of bytes to store the value type
   */
  static sizeOf(type) {
    switch (type.toLowerCase()) {
      case 'int8':
      case 'uint8': return 1; break;
      case 'int16':
      case 'uint16':
      case 'float16': return 2; break;
      case 'int32':
      case 'uint32':
      case 'color32':
      case 'float32': return 4; break;
      case 'int64':
      case 'uint64':
      case 'bigint64':
      case 'bigunt64':
      case 'float64': return 8; break;
    }
    return 0;
  }
}