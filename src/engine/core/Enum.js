import RenderEngineError from './RenderEngineError.js';
import Util from './Util.js';

/**
 * `Enum` is a Java-like enumeration class that can be used to define constants. It is similar to Java's Enum class,
 * but is not a 1:1 mapping. Instead, it implements `Map` to store the names of the enum values as keys
 * and their corresponding values as `Symbols`. Each `Symbol` is a system-unique value that enforces the constant type, but
 * evaluating the enum value as a `number` returns its ordinal value in the `Enum`. Evaluating it as a `String` will return
 * the static value associated with the `Enum`.
 * 
 * @example 
 *  const TYPE = new Enum('CIRCLE', 'SQUARE', 'TRIANGLE');
 *  const obj1 = {
 *    name: 'MyObject',
 *    type: TYPE.CIRCLE,
 *    radius: 50        
 *  };
 * 
 *  const obj2 = {
 *    name: 'OtherObject',
 *    type: TYPE.TRIANGLE,
 *    color: '#f00'
 *  };
 * 
 *  [obj1, obj2].forEach(obj => {
 *    console.log(obj.name, +obj.type, `${obj.type`});  // outputs: MyObject 0 CIRCLE OtherObject 2 TRIANGLE
 *    console.log(obj.type); // outputs: Symbol(Symbol.toPrimitive)
 *    console.log(obj.type === TYPE.CIRCLE);  // outputs: true
 *    console.log(`${obj.type}` === 'CIRCLE');  // outputs: true
 *    console.log(obj.type === 'CIRCLE'); // outputs false
 *  });
 * 
 * @param {Array<String>|Object|Function} values - An array of strings representing the names of the enum values, or an object where 
 *    the keys represent the enum values, and the values represent a static value to associate with the enum value. A function will need to return
 *    either and `Array<String>` or an `Object`.
 * 
 * @returns {Enum} The new Enum instance. 

 */
export default class Enum extends Map {
  constructor(... values) {
    // super the Map empty
    super();

    // convert an array into an object where the values 
    // are the return of `toString()` of the value itself
    if (values.length > 1) {
      const obj = {};
      values.map(item => {
        obj[item] = item.toString();
      });
      values = [obj];
    }

    // Map the values
    const mapped = this.#map(values);
    
    // lock down the object, provide no setters
    Util.lombok(this, Object.freeze(mapped), false);
  }

  /**
   * Initialize the map with properties, and values for the enum values. If a function is passed as the first
   * argument of `values` it should return either an `Array<String>` with the names of enum values, or an `Object` where
   * the keys represent the enum values, and the values represent a static value to associate with the enum value.
   * 
   * @param {Array<String>|Object|Function} values - The initial values or properties for the Enum
   */
  #map(values) {
    const $this = this;
    if (typeof values[0] === 'function') {
      return this.#map(values[0]());
    } else if (typeof values[0] === 'object') {
      const obj = values[0];
      const mapped = {};
      Object.keys(obj).forEach((item, ordinal) => {
        if (typeof obj[item] === 'function')
          // if the value itself is a function, evaluate it
          // to determine the value to associate with the enum's value.
          obj[item] = obj[item](item);

        // store the symbol for the value at the ordinal, 
        // and remember the ordinal and value in a closure
        this.set(ordinal, Symbol(obj[item]));
        const capturedValue = obj[item];
        
        mapped[item] = {
          // see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toPrimitive
          [Symbol.toPrimitive](hint) {
            if (hint === "number") {
              return ordinal;
            } else if (hint === "string") {
              return capturedValue;
            }
          },
          get enum() {
            return true;
          }
        }
      });
      return mapped;
    } else {
      throw new RenderEngineError('Invalid enum value type. Expected a function or an object.')
    }
  }

  /**
   * Get the enum value at the ordinal position in the `Enum`.
   * @param {number} ordinal - The ordinal position of the enum value within the `Enum`.
   * @returns {Symbol}
   */
  at(ordinal) {
    return this.get(ordinal);
  }
}