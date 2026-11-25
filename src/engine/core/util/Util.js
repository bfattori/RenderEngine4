import $Math from '../lang/Math.js';

export default class Util {
    
    static RESTRICTED_PROPERTIES = ['ordinal','opts'];

    /**
     * Select a random item from the provided set.
     * @param  {...any} items - The set of values to choose from
     * @returns {*}
     */
    static selectRandomOf(... items) {
        return items[$Math.randomRange(0, items.length, true)];
    }

    /**
     * Returns `true` if the item is an `Object`
     * @param {*} item - Any value to test
     * @returns {boolean}
     */
    static isObject(item) {
        return (item && (item.constructor.name === 'Object' && `${item}` === '[object Object]') && !Array.isArray(item));
    }

    /**
     * Deep merge two objects. If a key exists in both objects and the 
     * values are objects themselves, they will be merged recursively.

     * @param {Object} target - The target object to receive the source.
     * @param {Object} source - The source object to merge into the target.
     * @returns {Object} A new object that is the result of merging source into target
     */
    static deepMerge(target, source) {
        if (target === null && source) target = {};
        
        // Create a deep copy of target to keep the function pure
        const output = Object.assign({}, target);

        if (Util.isObject(target) && Util.isObject(source)) {
            Object.keys(source).forEach(key => {
            if (Util.isObject(source[key])) {
                if (!(target.hasOwnProperty(key))) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    // Recursive call for nested objects
                    output[key] = Util.deepMerge(target[key], source[key]);
                }
            } else {
                // Simple primitive overwrite
                Object.assign(output, { [key]: source[key] });
            }
            });
        }
        return output;
    }

    /**
     * Instrument an object with getters and setters specified either in an array (uninitialized), or with an 
     * object containing values to initialize the properties. The instrumented object will have getter and setter 
     * methods for each property. Globally disable the creation of setters by setting `setters` to `false`, or 
     * create setters for _specific properties only_ by passing an array of properties to be assigned a setter.
     * _This modifies the target object directly._
     * 
     * @param {Object} target - The object to instrument with the getters and setters 
     * @param {Array<String>|Object} values - An array of properties, or an object with properties and initial values
     * @param {Array<String>|boolean} setters - A boolean indicating setters should be created for all properties, or 
     * an array of specific properties that should have setters. The default is `true`.
     */
    static lombok(target, values, setters = true) {
        
        /**
         * Creates getter and setter for the property name, unless the setter
         * has been excluded from instrumentation.
         * @param {String} propName - The property name
         */
        const instrumentProperty = (propName) => {
            const getter = () => {
                if (typeof values[propName] === 'function') {
                    return values[propName]();
                }
                return values[propName];
            };

            // only create a setter if the property is allowed one
            const setter = (Array.isArray(setters) && setters.includes(propName)) || setters ? (val) => {
                if (typeof values[propName] === 'function') {
                    values[propName](val);
                } else {
                    values[propName] = val;
                }
                if (target.$propUpdated)
                    target.$propUpdated(propName, val);
            } : undefined;

            // the property definition
            const propDefinition = {
                get: getter,
                set: setter,
                enumerable: true,
                configurable: true
            };

            Object.defineProperty(target, propName, propDefinition);
        }
        
        // a cache of the prop accessors created on the object
        target.$getters = target.$getters || [];

        // remove previously assigned accessors that should no longer exist
        if (target.$getters.length !== 0) {
            const mKeys = Object.keys(values);
            const dKeys = mKeys.filter(key => target.$getters.includes(key));
            for (const dk of dKeys) {
                delete target[dk];
                target.$getters.splice(target.$getters.indexOf[dk], 1);
            } 
        }

        // create new getters and setters
        if (Array.isArray(values)) {
            target.$getters = [...target.$getters, ...values];
            values.forEach(k => {
                // filter for restricted property names
                if (!Util.RESTRICTED_PROPERTIES.includes(k)) {
                    const hasDescriptor = target.$getters.includes(k);
                    if (!hasDescriptor || typeof hasDescriptor.get !== 'function') {
                        // only create getters/setters not already present
                        instrumentProperty(k);
                    }
                }
            });
        } else {
            const props = Object.keys(values);
            for (const propName of props) {
                if (!Util.RESTRICTED_PROPERTIES.includes(propName)) {
                    const hasDescriptor = target.$getters.includes(propName);
                    if (!hasDescriptor || typeof hasDescriptor.get !== 'function') {
                        // only create getters/setters not already present
                        target.$getters.push(propName);
                        instrumentProperty(propName);
                    }
                }
            }
        }
    }

    /**
     * Create a SHA-256 hash for the mesage
     * @param {String} message - The message to digest
     * @returns {Array<number>} The digest as an array of 32-bit integers.
     */
    static async hashDigest(message) {
        // Encode the string as a Uint8Array
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        return new Uint8Array(hashBuffer);
    }

    /**
     * Returns a hexadecimal string representing the hash of the message
     * @param {String} message - The message to digest 
     * @returns {String} The hash as a hexadecimal string
     */
    static async hexHash(message) {
        // Hash message and convert bytes to a hexadecimal string
        const values = await Util.hashDigest(message);
        return values.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}