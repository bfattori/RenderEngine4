import $Math from './Math.js';
import RenderEngineError from './RenderEngineError.js';
export default class Util {
    
    static RESTRICTED_PROPERTIES = ['ordinal','opts'];

    static color8Hex(color) {
        if (color.charAt(0) === '#' && color.length === 9) return color;
        if (color.length < 6) {
            color = color.substring(1); // remove hash
            let result = `#${color.charAt(1)}${color.charAt(1)}${color.charAt(2)}${color.charAt(2)}${color.charAt(3)}${color.charAt(3)}`;
            if (color.length === 3) {
                result += 'ff';
            } else {
                result += `${color.charAt(4)}${color.charAt(4)}`;
            }
            return result;
        }

        // return a brilliant red so we can see if the conversion failed
        return '#ff0000ff';
    }

    /**
     * Extracts a 4 value array representing the color channel values from either hex (e.g. #ff0000) or rgb (e.g. rgb(255, 0, 0)) colors
     * @param {String} color - Hex color string (e.g. #FF0000) or RGB values (e.g. 255,0,0
     * @returns {Array<number>} A four element array containing the RGBA values
     */
    static extractColorChannels(color) {
        let r = 0, g = 0, b = 0, a = 255;
        if (isNaN(color)) {
            if (color.charAt(0) === '#') {
                // hex short or long (#fff or #ffffff or #ffffffff)
                const small = color.length <= 5;
                color = color.substring(1); // remove hash
                r = parseInt(small ? `${color[0]}${color[0]}` : color.substring(0, 2), 16);
                g = parseInt(small ? `${color[1]}${color[1]}` : color.substring(2, 4), 16);
                b = parseInt(small ? `${color[2]}${color[2]}` : color.substring(4, 6), 16);
                if (color.length > 6) {
                    a = parseInt(color.substring(6, 8), 16);
                }
            } else if (color.charAt(0) === 'r') {
                color = color.split(',');
                r = parseInt(color[0].substring(5));
                g = parseInt(color[1]);
                b = parseInt(color[2]);
                a = parseInt(color[3].substring(0, color[3].length - 1));
            } else {
                throw new RenderEngineError(`Invalid color format ${color} (${r},${g},${b},${a})  - must be #rrggbb[aa] or rgba(r,g,b,a)`);
            }
        }
        return [r,g,b,a];
    }

    static to32bitColor(color) {
        const channels = Util.extractColorChannels(color);
        color = channels[0] & 0xFF << 24 | channels[1] << 16 | channels[2] << 8 | channels[3];
        return color;
    }

    static toHexColor(uint32) {
        return `#${((uint32 & 0xFF000000) >> 24).toString(16).padStart(2, '0')}${((uint32 & 0x00FF0000) >> 16).toString(16).padStart(2, '0')}${((uint32 & 0x0000FF00) >> 8).toString(16).padStart(2, '0')}${(uint32 & 0x000000FF).toString(16).padStart(2, '0')}`;
    }

    /**
     * Get the color for the RBGA values, returning a hex value, or the color name if R is a string.
     * Returns black (#000) if color cannot be decoded
     * @param {number|String} r 
     * @param {number} g 
     * @param {number} b 
     * @param {number} a 
     * @returns The hex color value, or the name of the color
     */
    static getColor(r, g = 0, b = 0, a = 1) {
        // Convert to hex if RGB values provided
        if (!isNaN(r)) {
            r = r <= 1.0 ? r * 255 : r;
            g = g <= 1.0 ? g * 255 : g;
            b = b <= 1.0 ? b * 255 : b;
            a = a <= 1.0 ? a * 255 : a;
            return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
        } else if (typeof r === 'string') {
            // Keep hex or named colors as-is
            return r;
        }
        return "#000000";
    }

    static getRGBA(color) {
        const channels = Util.extractColorChannels(color);
        return 'rgba(' + channels[0] + ',' + channels[1] + ',' + channels[2] + ',' + channels[3] + ')';
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
     * Get a color value with the alpha channel set to the value provided. If the color is already a hex code,
     * it will be modified to include the alpha channel. Otherwise, a new hex color will be generated.
     * 
     * @param {number} alpha - The alpha channel component (0.0 to 1.0)
     * @param {String|number} color - A hex color code (3 or 6 digits), or the red component (0.0 to 1.0)
     * @param {number} g - The green component (0.0 to 1.0), ignored if color is a hex number
     * @param {number} b - The blue component (0.0 to 1.0), ignored if color is a hex number
     * @returns 
     */
    static setAlpha(alpha, color, g, b) {
        let r = color, a = alpha;
        if (isNaN(color)) {
            if (color.charAt(0) === '#') {
                const small = color.length <= 5;
                color = color.substring(1); // remove hash
                r = parseInt(small ? `${color[0]}${color[0]}` : color.substring(0, 2), 16);
                g = parseInt(small ? `${color[1]}${color[1]}` : color.substring(2, 4), 16);
                b = parseInt(small ? `${color[2]}${color[2]}` : color.substring(4, 6), 16);
                if (color.length > 6) {
                    a = parseInt(color.substring(6,8), 16);
                    a *= alpha;
                } else if (color.length === 4) {
                    a = parseInt(`${color[3]}${color[3]}`, 16);
                    a *= alpha;
                } else {
                    a *= 255;
                }
            } else {
                color = color.split(',');
                // 0 - 255
                r = parseInt(color[0].substring(5));
                g = parseInt(color[1]);
                b = parseInt(color[2]);
                // 0.0 - 1.0
                a *= (parseInt(color[3].substring(0, color[3].length - 1)) / 255);
            }
        }
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

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

    static unshift(typedArray, ...values) {
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
     * @param {String} type - Memory storage type
     * @returns {number} The number of bytes to store the value type
     */
    static sizeOf(type) {
        switch (type) {
            case 'Int8':
            case 'UInt8':
            case 'Uint8': return 1; break;
            case 'Int16':
            case 'Uint16':
            case 'UInt16':
            case 'Float16': return 2; break;
            case 'Int32':
            case 'Uint32':
            case 'UInt32':
            case 'Color32':
            case 'Float32': return 4; break;
            case 'Int64':
            case 'Uint64':
            case 'UInt64':
            case 'Float64': return 8; break;
        }
        return 0;
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

    /**
     * Checks if the current context is a web worker.
     * @returns {boolean} `true` if the current context is a web worker, `false` otherwise.
     */
    static isWorker() {
        const isWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
        return isWorker;
    }

    /**
     * Returns an OffscreenCanvas, if available, otherwise it returns
     * an HTMLCanvasElement.
     * @param {number} width - The width of the temporary canvas
     * @param {number} height - The height of the temporary canvas
     * @returns {OffscreenCanvas|HTMLCanvasElement} The temporary canvas
     */
    static getTemporaryCanvas(width, height) {
        if (typeof self['OffscreenCanvas'] !== 'undefined') {
            return new OffscreenCanvas(width, height);
        }

        // TODO: For fallbacks, we should probably come up with a function queue at shutdown to clean these kinds of thing up
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        return c;
    }

    /**
     * Extract the image data from the provided image.  The image can either be an HTML &lt;img&gt; element,
     * or it can be another render context.  This method currently only works with the canvas context.
     * 
     * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap|OffscreenCanvas} image - Image or context
     * @param {Array<number>} cropRect - Optional rectangle to crop to.  If not provided, the entire image is used.
     * @returns {ImageData} Image data object with "width", "height", and an Array of each pixel, represented as
     *     RGBA data where each element is represented by an integer 0-255.
     */
    static extractImageData(image, cropRect, settings) {
        // Get the temporary context
        if (!cropRect) {
            // entire image
            cropRect = [0, 0, image.width, image.height];
        }

        const temp = Util.getTemporaryCanvas(cropRect[2], cropRect[3]);
        temp.getContext('2d').drawImage(image, cropRect[0], cropRect[1], cropRect[2], cropRect[3], 0, 0, croprect[2], cropRect[3]);

        // Return the image data from the temp context
        return temp.getContext('2d').getImageData(cropRect[0], cropRect[1], cropRect[2], cropRect[3], settings);
    }

    /**
     * Create a mask of the provided image where non-transparent pixels (alpha != 0) are masked 
     * fully (R:255, G:255, B:255, A:255) and transparent pixels are fully transparent (R:0, G:0, B:0, A:0). 
     * If `respectTransparency` is `true`, alpha values above zero will be respected (R:255, G:255, B:255, A:preserved)
     *
     * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap|OffscreenCanvas} image - Image or context
     * @param {Array<number>} cropRect - Optional rectangle to crop to.  If not provided, the entire image is used.
     * @param {boolean} respectTransparency - If `true` transparent pixels will retain their alpha value
     * @returns {Blob} A data blob in image/png format
     */
    static async getImageMask(image, cropRect, respectTransparency = false) {
        if (!cropRect) {
            // entire image
            cropRect = [0, 0, image.width, image.height];
        }

        // get an ImageData from the image
        const imgData = Util.extractImageData(image, cropRect);

        // Modify the image data so each pixel is either fully on or off
        for (var pix = 0; pix < imgData.data.length; pix += 4) {
            let alpha = 255;
            if (respectTransparency)
                alpha = imgData.data[pix + 3];

            if (imgData.data[pix + 3] != 0) {
                imgData.data[pix] = 255;
                imgData.data[pix + 1] = 255;
                imgData.data[pix + 2] = 255;
                imgData.data[pix + 3] = alpha;
            } else {
                imgData.data[pix] = 0;
                imgData.data[pix + 1] = 0;
                imgData.data[pix + 2] = 0;
                imgData.data[pix + 3] = 0;
            }
        }

        // Get a temporary canvas
        const ctx = Util.getTemporaryCanvas(cropRect[2], cropRect[3]);
        ctx.getContext('2d').putImageData(imgData, 0, 0);

        // Extract the image data
        return await ctx.convertToBlob();
    }

     /**
     * Get a screen shot of the renderer's surface, optionally cropped to specific dimensions.
     * 
     * @param {Renderer} renderer - The context to get a screenshot of
     * @param {Array<number>} cropRect - Optional rectangle to crop to
     * @return {String} The data URL of the screen shot
     */
    static async screenShot(renderer, cropRect) {
        // cropRect = cropRect || renderContext.getViewport();

        // // Render the screenshot to the temp context
        // var ctx = R.util.RenderUtil.getTempContext(renderContext.constructor, renderContext.getViewport().w, renderContext.getViewport().h);
        // ctx.drawImage(renderContext.getViewport(), renderContext.getSurface(), cropRect);

        // // Return the image data
        // return ctx.getDataURL();
    }
}