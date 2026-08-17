import $Math from './Math.js';
export default class Util {
    
    static RESTRICTED_PROPERTIES = ['ordinal','opts'];

    /**
     * Get the color for the RBGA values, returning a hex value, or the color name if R is a string.
     * Returns black (#000) if color cannot be decoded
     * @param {number|String} r 
     * @param {number} g 
     * @param {number} b 
     * @param {number} a 
     * @returns The hex color value, or the name of the color
     */
    static getColor(r, g, b, a) {
        // Convert to hex if RGB values provided
        if (!isNaN(r)) {
            const r8 = Math.round(r * 255).toString(16).padStart(2, '0');
            const g8 = g !== null ? Math.round(g * 255).toString(16).padStart(2, '0') : '00';
            const b8 = Math.round(b * 255).toString(16).padStart(2, '0');
            const alphaHex = a !== undefined && a < 1 ? 
            Math.round(a * 255).toString(16).padStart(2, '0') : '';
            
            return `#${r8}${g8}${b8}${alphaHex}`;
        } else if (typeof r === 'string') {
            // Keep hex or named colors as-is
            return r;
        }
        return "#000000";
    }

    /**
     * Get a random color between the value and 240 for each component
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     * @returns {String} A color
     */
    static getRandomColor(r, g, b) {
        r = r/255;
        g = g/255;
        b = b/255;
        return Util.getColor($Math.randomRange(r, 1.0), $Math.randomRange(g, 1.0), $Math.randomRange(b, 1.0), 1.0);
    }

    /**
     * Instrument an object with getters and setters specified either in an array (uninitialized), or with an object containing values
     * @param {Object} target - The object to instrument with the getters and setters 
     * @param {Array<String>|Object} values - An array of properties, or an object with properties and initial values
     * @param {Array<String>|boolean} setters - A boolean indicating setters should be created for all properties, or an array of specific properties that should have setters.
     */
    static lombok(target, values, setters = true) {
        target.$getters = target.$getters || [];

        // remove getters for properties that no longer exist
        if (target.$getters.length !== 0) {
            const mKeys = Object.keys(values);
            const dKeys = mKeys.filter(key => !target.$getters.includes(key));
            for (const dk of dKeys) {
                delete this[dk];
            } 
        }

        // create getters and setters
        if (Array.isArray(values)) {
            target.$getters = [...target.$getters, ...values];
            values.forEach(k => {
                if (!Util.RESTRICTED_PROPERTIES.includes(k)) {
                    const hasDescriptor = target.$getters.includes(k);
                    if (!hasDescriptor || typeof hasDescriptor.get !== 'function') {
                        // only create getters/setters not already present
                        if ((Array.isArray(setters) && setters.includes(k)) || setters) {
                            Object.defineProperty(target, k, {
                                get() {
                                    return values[k];
                                },
                                set(val) {
                                    values[k] = val;
                                },
                                enumerable: true,
                                configurable: true
                            });
                        } else {
                            Object.defineProperty(target, k, {
                                get() {
                                    return values[k];
                                },
                                enumerable: true,
                                configurable: true
                            });
                        }
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
                        if ((Array.isArray(setters) && setters.includes(propName)) || setters) {
                            Object.defineProperty(target, propName, {
                                get() {
                                    return values[propName];
                                },
                                set(val) {
                                    values[propName] = val;
                                },
                                enumerable: true,
                                configurable: true
                            });
                        } else {
                            Object.defineProperty(target, propName, {
                                get() {
                                    return values[propName];
                                },
                                enumerable: true,
                                configurable: true
                            });
                        }
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