import $Math from './Math.js';
export default class Util {
    
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
        if (typeof r === 'number') {
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
    static getRandomColor(r,g,b) {
        r = r/255;
        g = g/255;
        b = b/255;
        return Util.getColor($Math.randomRange(r, 0.9 - r), $Math.randomRange(g, 0.9 - g), $Math.randomRange(b, 0.9 - b));
    }
}