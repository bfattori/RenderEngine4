/**
 * A set of color utility methods to work with color conversions, generation, and manipulation.
 */
export default class ColorUtil {
  
  /**
   * Return a random value within the <tt>low</tt> to <tt>high</tt> range,
   * optionally as an integer value only (rounded down to nearest integer)
   *
   * @param low {Number} The low part of the range
   * @param high {Number} The high part of the range
   * @param [whole] {Boolean} Return whole values only
   * @return {Number}
   * @memberof R.lang.Math2
   */
  static randomRange(low, high, whole = false) {
      const v = low + (Math.random() * (high - low));
      return (whole ? Math.floor(v) : v);
  }

  /**
   * Upconverts a 3-byte hex color to an 8-byte hex color. If the color is already an 8-byte hex color, 
   * it is returned as-is. If the color is not a valid 3-byte hex color, the color '#ff0000ff' is returned
   * making it obvious the conversion failed.
   * @param {String} color - The color to convert.
   * @returns {String} - The converted color string.
   */
  static color8Hex(color) {
      if (color.charAt(0) === '#' && color.length === 9 || color.length === 7) return color;
      if (color.startsWith('rgb')) {
        const channels = ColorUtil.extractColorChannels(color);
        return `#${channels[0].toString(16).padStart(2, '0')}${channels[1].toString(16).padStart(2, '0')}${channels[2].toString(16).padStart(2, '0')}`;
      }
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
          } else if (color.startsWith('rgb')) {
              color = color.split(',');
              r = parseInt(color[0].includes('a(') ? color[0].substring(5) : color[0].substring(4));
              g = parseInt(color[1]);
              b = parseInt(color[2]);
              a = parseInt(color[0].includes('a(') ? color[3].substring(0, color[3].length - 1) : "255");
          } else {
              throw new RenderEngineError(`Invalid color format ${color} (${r},${g},${b},${a})  - must be #rrggbb[aa] or rgb[a](r,g,b[,a])`);
          }
      }
      return [r,g,b,a];
  }

  /**
   * Converts a string color to a 32-bit value.
   * @param {String} color - A hex color code or an rgb value, including optional alpha channel
   * @returns {number} A 32-bit encoded value of the color
   */
  static to32bitColor(color) {
      const channels = ColorUtil.extractColorChannels(color);
      color = channels[0] & 0xFF << 24 | channels[1] << 16 | channels[2] << 8 | channels[3];
      return color;
  }

  /**
   * Converts a 32-bit integer value to a hexidecimal color code, including alpha
   * @param {number} uint32 - A 32-bit integer
   * @returns 
   */
  static toHexColor(uint32) {
      return `#${((uint32 & 0xFF000000) >> 24).toString(16).padStart(2, '0')}${((uint32 & 0x00FF0000) >> 16).toString(16).padStart(2, '0')}${((uint32 & 0x0000FF00) >> 8).toString(16).padStart(2, '0')}${(uint32 & 0x000000FF).toString(16).padStart(2, '0')}`;
  }

  /**
   * Get the color for the RBGA components, returning a hex value, or the color name if R is a string.
   * Returns brilliant red (#ff0000) if color cannot be decoded making it obvious where errors occurred.
   * @param {number|String} r - The color string, or the red component of the color
   * @param {number} g - The green component of the color
   * @param {number} b - The blue component of the color
   * @param {number} a - The alpha component of the color
   * @returns The hex color value, or unchanged if it's already a hex color, or a web-safe color name
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
      return "#ff0000";
  }

  /**
   * Get the RGBA equivaluent for the given color string.
   * @param {String} color - A hex color, or an rgb color including optional alpha component
   * @returns 
   */
  static getRGBA(color) {
      const channels = ColorUtil.extractColorChannels(color);
      return 'rgba(' + channels[0] + ',' + channels[1] + ',' + channels[2] + ',' + channels[3] + ')';
  }

  /**
   * Get a random color using the starting components to direct the
   * output.
   * @param {number} r - Starting red component (default: 255)
   * @param {number} g - Starting green component (default: 255)
   * @param {number} b - Starting blue component (default: 255)
   * @returns {String} A color
   */
  static getRandomColor(r = 255, g = 255, b = 255) {
    r = r/255;
    g = g/255;
    b = b/255;
    return ColorUtil.getColor(ColorUtil.randomRange(r, 1.0), ColorUtil.randomRange(g, 1.0), ColorUtil.randomRange(b, 1.0), 1.0);
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
}