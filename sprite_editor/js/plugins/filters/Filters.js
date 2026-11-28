
export default class Filtering {
  static INPUTS = {
    slider: 'range',
    manyOf: 'checkbox',
    oneOf: 'radio',
    select: 'select',
    text: 'text'
  };

  static TYPE = {
    Image: "image",
    Color: "color",
    Tool: "tool"
  };
  
  // ====================================================================
  // Filtering operations
  // ====================================================================
  
  // from: https://dev.to/ndesmic/playing-with-image-convolution-filters-5a2e

  /**
   * 
   * @param {ImageData} imageData 
   * @param {Array<number>} kernel 
   * @param {number} divisor 
   * @param {number} offset 
   * @returns {ImageData}
   */
  static apply2dKernel(imageData, kernel, divisor = 1, offset = 0) {
    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    const dst = output.data;

    // Assume square odd-dimension kernel (e.g., 3x3, 5x5)
    const kSize = Math.sqrt(kernel.length);
    const half = Math.floor(kSize / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0;

        for (let ky = 0; ky < kSize; ky++) {
          // Clamp out-of-bounds coordinates to the edge pixel
          const sy = Math.min(height - 1, Math.max(0, y + ky - half));

          for (let kx = 0; kx < kSize; kx++) {
            const sx = Math.min(width - 1, Math.max(0, x + kx - half));
            const srcIdx = (sy * width + sx) * 4;
            const weight = kernel[ky * kSize + kx];

            r += data[srcIdx] * weight;
            g += data[srcIdx + 1] * weight;
            b += data[srcIdx + 2] * weight;
          }
        }

        const dstIdx = (y * width + x) * 4;
        // Uint8ClampedArray automatically clamps values to [0, 255]
        dst[dstIdx]     = (r / divisor) + offset;
        dst[dstIdx + 1] = (g / divisor) + offset;
        dst[dstIdx + 2] = (b / divisor) + offset;
        dst[dstIdx + 3] = data[dstIdx + 3]; // Preserve original alpha
      }
    }

    return output;
  }

  /**
   * 
   * @param {ImageData} imageData 
   * @param {Array<number>} matrix 
   * @returns {ImageData}
   */
  static applyColorSpace(imageData, matrix) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Uint8ClampedArray automatically clamps results to [0, 255]
      data[i]     = r * matrix[0]  + g * matrix[1]  + b * matrix[2]  + a * matrix[3]  + matrix[4];
      data[i + 1] = r * matrix[5]  + g * matrix[6]  + b * matrix[7]  + a * matrix[8]  + matrix[9];
      data[i + 2] = r * matrix[10] + g * matrix[11] + b * matrix[12] + a * matrix[13] + matrix[14];
      data[i + 3] = r * matrix[15] + g * matrix[16] + b * matrix[17] + a * matrix[18] + matrix[19];
    }

    return imageData;
  }

  static parseAperture(input) {
    if (typeof input !== 'string') return null;

    // Match optional "f" or "1", optional "/" or ":", and a positive decimal/integer
    const match = input.trim().match(/^(?:f|1)?\s*[/:]?\s*(\d+(?:\.\d+)?|\.\d+)$/i);
    if (!match) return null;

    const value = parseFloat(match[1]);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  static parseShutterSpeed(input) {
    const denominator = parseFloat(input.split("/")[1]);
    return 1 / denominator;
  }

  static getEV100(aperture, shutterSeconds, iso = 100) {
    return Math.log2((100 * aperture * aperture) / (shutterSeconds * iso));
  }

  static getRelativeStops(base, target) {
    const apertureRatio = (base.aperture / target.aperture) ** 2;
    const shutterRatio = target.shutter / base.shutter;
    const isoRatio = target.iso / base.iso;
    return Math.log2(apertureRatio * shutterRatio * isoRatio);
  }
}

class Kernels {
  // 2d kernels  
  static Blur = [1, 1, 1, 1, 1, 1, 1, 1, 1];
  static MoreBlur = [0.25, 0.25, 0.25, 0.25, 0.25,
                     0.25, 0.35, 0.50, 0.35, 0.25,
                     0.25, 0.50, 1.00, 0.50, 0.25,
                     0.25, 0.35, 0.50, 0.36, 0.25,
                     0.25, 0.25, 0.25, 0.25, 0.25];
  static LessBlur = [0.05, 0.95, 0.05, 
                     0.95, 2.00, 0.95, 
                     0.05, 0.95, 0.05];
  static GaussianBlur = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  static SmoothGaussian = [1, 4, 6, 4, 1, 4, 16, 24, 16, 4, 6, 24, 36, 24, 6, 4, 16, 24, 16, 4, 1,  4,  6,  4, 1];
  
  static FindEdges = { matrix: [-1, -1, -1, -1, 8, -1, -1, -1, -1], divisor: 1, offset: 0 };
  static Outline = { matrix: [-1, -1, -1, -1, 8, -1, -1, -1, -1], divisor: 1, offset: 128 };
  static Laplacian = { matrix: [0, 1, 0, 1, -4, 1, 0, 1, 0], divisor: 1, offset: 0 };
  
  static SobelHoriz = { matrix: [-1, 0, 1, -2, 0, 2, -1, 0, 1], divisor: 1, offset: 0 };
  static SobelVert = { matrix: [-1, -2, -1, 0, 0, 0, 1, 2, 1], divisor: 1, offset: 0 };
  
  static SFHoriz = { matrix: [-3, 0, 3, -10, 0, 10, -3, 0, 3], divisor: 1, offset: 0 };
  static SFVert = { matrix: [-3, -10, 3, -10, 0, 10, 3, 10, 3], divisor: 1, offset: 0 };
  
  static PrewittHoriz = { matrix:[-1, 0, 1, -1, 0, 1, -1, 0, 1], divisor: 1, offset: 0 };
  static PrewittVert = { matrix:[-1, -1, -1, 0, 0, 0, 1, 1, 1], divisor: 1, offset: 0 };

  static ScharrHoriz = { matrix: [-47, 0, 47, 0, 0, 0, -47, 0, 47], divisor: 1, offset: 0 };
  static ScharrVert = { matrix: [-47, -162, -47, 0, 0, 0, 47, 162, 47], divisor: 1, offset: 0 };
  
  static Sharpen = { matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0], divisor: 1, offset: 0 };
  static SharpenMore = { matrix: [-1, -1, -1, -1, 9, -1, -1, -1, -1], divisor: 1, offset: 0 };

  static Emboss = { matrix: [2, 1, 0, 1, -1, -1,  0, -1, -2], divisor: 1, offset: 128 };
  static Raised = { matrix: [-2, -1, 0, -1, 1, 1,  0, 1, 2], divisor: 1, offset: 128 };
  
  static TopLeftLight = { matrix: [1, 1, 0, 
                                    1, 0, -1, 
                                    0, -1, -1], divisor: 1, offset: 128 };
  static BottomLeftLight = { matrix: [0, -1, -1, 
                                        1, 0, -1, 
                                        1, 1, 0], divisor: 1, offset: 128 };
  static TopRightLight = { matrix: [0, 1, 1, 
                                    -1, 0, 1, 
                                    -1, -1, 0], divisor: 1, offset: 128 };
  static BottomRightLight = { matrix: [-1, -1, 0, 
                                       -1, 0, 1, 
                                        0, 1, 1], divisor: 1, offset: 128 };

  static HighPass = { matrix: [-1, -2, -1, -2, 12, -2, -1, -2, -1], divisor: 16, offset: 128 };

  static MBlurTopLeft = (amt) => [amt, 0, 0, 0, 0,/* */ 0, amt, 0, 0, 0,/* */ 0, 0, amt, 0, 0,/* */ 0, 0, 0, amt, 0,/* */ 0, 0, 0, 0, amt];
  static MBlurTopRight = (amt) => [0, 0, 0, 0, amt,/* */ 0, 0, 0, amt, 0,/* */ 0, 0, amt, 0, 0,/* */ 0, amt, 0, 0, 0,/* */ amt, 0, 0, 0, 0];
  static MBlurHoriz = (amt) => [0, 0, 0, 0, 0,/* */ 0, 0, 0, 0, 0,/* */ amt, amt, amt, amt, amt,/* */ 0, 0, 0, 0, 0,/* */ 0, 0, 0, 0, 0];
  static MBlurVert = (amt) => [0, 0, amt, 0, 0,/* */ 0, 0, amt, 0, 0,/* */ 0, 0, amt, 0, 0,/* */ 0, 0, amt, 0, 0,/* */ 0, 0, amt, 0, 0];

  static Unsharp = { matrix: [-1,  -4,  -6,  -4, -1, -4, -16, -24, -16, -4, -6, -24, 476, -24, -6, -4, -16, -24, -16, -4, -1,  -4,  -6,  -4, -1], divisor: 256, offset: 0 };

  // Colorspace 2d kernels
  static Identity = [1, 0, 0, 0, 0,  0, 1, 0, 0, 0,  0, 0, 1, 0, 0,  0, 0, 0, 1, 0];
  static Grayscale = [0.2126, 0.7152, 0.0722, 0, 0,  0.2126, 0.7152, 0.0722, 0, 0,  0.2126, 0.7152, 0.0722, 0, 0,  0, 0, 0, 1, 0];
  static Sepia = [0.393, 0.769, 0.189, 0, 0,  0.349, 0.686, 0.168, 0, 0,  0.272, 0.534, 0.131, 0, 0,  0, 0, 0, 1, 0];
  static Invert = [-1, 0, 0, 0, 255,  0, -1, 0, 0, 255,  0, 0, -1, 0, 255,  0, 0, 0, 1, 0];
  static Mask = [0, 0, 0, 0, 0,  0, 0, 0, 0, 0,  0, 0, 0, 0, 0,  0.2126, 0.7152, 0.0722, 0, 0];
  static Technicolor = [1.5, -0.5, 0, 0, 0,  -0.25, 1.25, 0, 0, 0,  -0.25, 0.75, 0.5, 0, 0,  0, 0, 0, 1, 0];
  static Kodachrome = [1.12, 0.08, -0.05, 0, 10,  0.02, 1.05, -0.02, 0, 5,  -0.08, 0.02, 0.90, 0, -5,  0, 0, 0, 1, 0];
  static Polaroid = [1.15, 0.05, 0.05, 0, 18,  0.05, 1.10, 0.05, 0, 14,  0.05, 0.05, 0.95, 0, 22,  0, 0, 0, 1, 0];
  static NightVision = [0.1, 0.4, 0.1, 0, 0,  0.3, 1.2, 0.3, 0, 10,  0.1, 0.4, 0.1, 0, 0,  0, 0, 0, 1, 0];
  static BGRSwap = [0, 0, 1, 0, 0,  0, 1, 0, 0, 0,  1, 0, 0, 0, 0,  0, 0, 0, 1, 0];
  static Protanopia = [0.567, 0.433, 0.000, 0, 0, 0.558, 0.442, 0.000, 0, 0, 0.000, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0];
  static Deuteranopia = [0.625, 0.375, 0.000, 0, 0, 0.700, 0.300, 0.000, 0, 0, 0.000, 0.300, 0.700, 0, 0, 0, 0, 0, 1, 0];
  static Tritanopia = [0.950, 0.050, 0.000, 0, 0, 0.000, 0.433, 0.567, 0, 0, 0.000, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0];
}

class ToolFunctions {
  // Tool functions
  static Contrast = ({amt}) => { 
    return [amt, 0, 0, 0, 128 * (1 - amt),  0, amt, 0, 0, 128 * (1 - amt),  0, 0, amt, 0, 128 * (1 - amt),  0, 0, 0, 1, 0]; 
  }
  static Tint = ({tint}) => {
    const shift = tint * 0.005;
    return new Float32Array([1 + shift * 0.5, 0, 0, 0, tint * 0.2, 0, 1 - shift, 0, 0, -tint * 0.4, 0, 0, 1 + shift * 0.5, 0, tint * 0.2, 0, 0, 0, 1, 0]);
  }
  static Saturation = ({sat}) => {
    const inv = 1 - sat, r = 0.2126 * inv, g = 0.7152 * inv, b = 0.0722 * inv;
    return new Float32Array([r + sat, g, b, 0, 0, r, g + sat, b, 0, 0, r, g, b + sat, 0, 0, 0, 0, 0, 1, 0 ]);
  }
  static RotateHues = ({degrees}) => {
    const rad = (degrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const lumR = 0.2126, lumG = 0.7152, lumB = 0.0722;

    return new Float32Array([
      lumR + cos * (1 - lumR) - sin * lumR,
      lumG - cos * lumG - sin * lumG,
      lumB - cos * lumB + sin * (1 - lumB), 0, 0,

      lumR - cos * lumR + sin * 0.143,
      lumG + cos * (1 - lumG) + sin * 0.140,
      lumB - cos * lumB - sin * 0.283, 0, 0,

      lumR - cos * lumR - sin * (1 - lumR),
      lumG - cos * lumG + sin * lumG,
      lumB + cos * (1 - lumB) + sin * lumB, 0, 0,

      0, 0, 0, 1, 0
    ]);
  }
  static ColorTemperature = ({temp}) => {
    temp = Math.max(-50, Math.min(50, temp));
    return new Float32Array([1 + temp * 0.005, 0, 0, 0, temp * 0.4, 0, 1, 0, 0, 0, 0, 0, 1 - temp * 0.005, 0, -temp * 0.4, 0, 0, 0, 1, 0]);
  }
  static Colorize = ({r, g, b, amount}) => {
    const inv = 1 - amount;
    return new Float32Array([inv, 0, 0, 0, r * amount, 0, inv, 0, 0, g * amount, 0, 0, inv, 0, b * amount, 0, 0, 0, 1, 0]);
  }
  static Chromakey = ({channel, amount}) => {
    const inv = 1 - amount, lumR = 0.2126 * amount, lumG = 0.7152 * amount, lumB = 0.0722 * amount;
    return new Float32Array([
      channel === 'r' ? 1 : lumR + inv, channel === 'r' ? 0 : lumG,       channel === 'r' ? 0 : lumB,       0, 0,
      channel === 'g' ? 0 : lumR,       channel === 'g' ? 1 : lumG + inv, channel === 'g' ? 0 : lumB,       0, 0,
      channel === 'b' ? 0 : lumR,       channel === 'b' ? 0 : lumG,       channel === 'b' ? 1 : lumB + inv, 0, 0,
      0,                                0,                                0,                                1, 0
    ]);
  }
  static ContrastBoost = ({contrast, bias} = {bias:0}) => {
    const offset = 128 * (1 - contrast) + bias;
    return new Float32Array([1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, contrast, offset]);
  }
  static AdjustLevels = ({blackPoint, whitePoint} = {blackPoint:0, whitePoint:1}) => {
    const scale = 255 / Math.max(1, whitePoint - blackPoint);
    const offset = -blackPoint * scale;
    return new Float32Array([scale, 0, 0, 0, offset, 0, scale, 0, 0, offset, 0, 0, scale, 0, offset, 0, 0, 0, 1, 0]);
  }
}

// ====================================================================
// Filter Sets
// ====================================================================

const FilterKernels = {
  // Image operations
  image: {
    "Blur": {
      inputs: [
        {type:Filtering.INPUTS.select, options:['Box', 'Gaussian', 'Smooth Gaussian'], selected:'Box', name:"Blur Type", var:"type"},
        {type:Filtering.INPUTS.oneOf, options:['Low', 'Mid', 'High'], selected:'Low', name:"Strength", var:"amt", when:["type"], is:["Box"]},
      ],
      matrix: ({type, amt}) => {
        let mtx, div;
        switch(type) {
          case 'Box': 
            if (amt === "Low") {
              mtx = Kernels.LessBlur; div = 4;
            } else if (amt === "High") {
              mtx = Kernels.MoreBlur; div = 6;
            } else {
              mtx = Kernels.Blur; div = 6;
            }
            break;
          case 'Gaussian': mtx = Kernels.GaussianBlur; div = 16; break;
          case 'Smooth Gaussian': mtx = Kernels.SmoothGaussian; div = 256; break;
        }
        return { matrix: mtx, divisor: div, offset: 0 };
      }
    },
    "Stylize": {
      inputs: [
        {type:Filtering.INPUTS.select, options:["Invert","High Pass","Unsharp","Grayscale","Sepia","1930s Technicolor","Vintage Polaroid","Night Vision","Channel Swap","Mask"], selected:"Invert", name:"Effect", var:"type", colorspace:true}
      ],
      colorspace: true,
      matrix: ({type}) => {
        switch(type) {
          case "Invert": return Kernels.Invert;
          case "Grayscale": return Kernels.Grayscale;
          case "Sepia": return Kernels.Sepia;
          case "1930s Technicolor": return Kernels.Technicolor;
          case "Vintage Polaroid": return Kernels.Polaroid;
          case "Night Vision": return Kernels.NightVision;
          case "Channel Swap": return Kernels.BGRSwap;
          case "Mask": return Kernels.Mask;
          case "High Pass": return Kernels.HighPass;
          case "Unsharp": return Kernels.Unsharp;

        }
      }
    },
    "Find Edges": {
      inputs: [
        {type:Filtering.INPUTS.select, options:["Normal", "Outline", "Sobel", "Sobel-Feldman", "Prewitt", "Scharr"], selected:'Normal', name:"Algorithm", var:"type"},
        {type:Filtering.INPUTS.oneOf, options:["Horizontal", "Vertical"], selected:"Horizontal", name:"Direction", var:"dir", when:["type"], is:["Sobel", "Sobel-Feldman", "Prewitt", "Scharr"]}
      ],
      matrix: ({type, dir}) => {
        switch(type) {
          case "Normal": return Kernels.FindEdges;
          case "Outline": return Kernels.Outline;
          case "Sobel": return dir === "Horizontal" ? Kernels.SobelHoriz : Kernels.SobelVert;
          case "Sobel-Feldman": return dir === "Horizontal" ? Kernels.SFHoriz : Kernels.SFVert;
          case "Prewitt": return dir === "Horizontal" ? Kernels.PrewittHoriz : Kernels.PrewittVert;
          case "Scharr": return dir === "Horizontal" ? Kernels.ScharrHoriz : Kernels.SharrVert;
        }
      }
    },
    "Sharpen": {
      inputs: [
        {type:Filtering.INPUTS.oneOf, options:["Normal", "More"], selected:"Normal", name:"Amount", var:"amt"}
      ],
      matrix: ({amt}) => {
        if (amt === "normal") return Kernels.Sharpen
        else return Kernels.SharpenMore;
      }
    },
    "Emboss": {
      inputs: [
        {type:Filtering.INPUTS.select, options:["Embossed", "Raised", "Lighting"], selected:"Embossed", name:"Style", var:"style"},
        {type:Filtering.INPUTS.select, options:["Top/Left", "Top/Right", "Bottom/Left", "Bottom/Right"], selected:"Top/Left", name:"Light Direction", var:"dir", when:["style"], is:["Lighting"]}
      ],
      matrix: ({style, dir}) => {
        let mtx;
        switch (style) {
          case "Embossed": return Kernels.Emboss;
          case "Raised": return Kernels.Raised;
          case "Lighting":
            switch(dir) {
              case "Top/Left": return Kernels.TopLeftLight;
              case "Top/Right": return Kernels.TopRightLight;
              case "Bottom/Left": return Kernels.BottomLeftLight;
              case "Bottom/Right": return Kernels.BottomRightLight;
            }
        }
      }
    },
    "Motion Blur": {
      inputs: [
        {type:Filtering.INPUTS.oneOf, options:['90°','45°','135°','0°'], selected:'90°', name:"Direction", var:"dir"},
        {type:Filtering.INPUTS.oneOf, options:['Low','Mid','High'], selected:'Mid', name:"Intensity", var:"amt"}
      ],
      matrix: ({dir, amt}) => {
        let d = 4;
        if (amt === 'Low') { amt = 0.75; d = 5; }
        else if (amt === 'High') { amt = 1.5; d = 6; }
        else amt = 1;
        let mtx;
        switch(dir) {
          case '90°': mtx = Kernels.MBlurHoriz(amt); break;
          case '45°': mtx = Kernels.MBlurTopRight(amt); break;
          case '135°': mtx = Kernels.MBlurTopLeft(amt); break;
          case '0°': mtx = Kernels.MBlurVert(amt); break;
        }
        return { matrix: mtx, divisor: 4, offset: 0};
      }
    },
    "Color Blindness": {
      inputs: [
        {type:Filtering.INPUTS.select, options:["Protanopia (Red)", "Deuteranopia (Green)", "Tritanopia (Blue)"], selected:"Protanopia (Red)", name:"Type", var:"type"}
      ],
      matrix: ({type}) => {
        if (type === "Protanopia (Red)") return Kernels.Protanopia
        else if (type === "Deuteranopia (Green)") return Kernels.Deuteranopia
        else return Kernels.Tritanopia;
      }
    }
  }
};

const FilterTools = {
  "Brightness": {
    inputs: [
      {type:Filtering.INPUTS.slider, val:0, min:-1, max:1, decimal:true, name:"Brightness", var:"amt"}
    ],
    filter: ({amt}) => {
      if (amt === 0) {
        return Kernels.Identity;
      }
      return [amt, 0, 0, 0, 1,  0, amt, 0, 0, 1,  0, 0, amt, 0, 1,  0, 0, 0, amt, 0]; 
    }
  },
  "Contrast": {
    inputs: [{
      type:Filtering.INPUTS.slider, val:0, min:-3, max:3, decimal:true, name:"Contrast", var:"amt"
    }],
    filter: ToolFunctions.Contrast
  },
  "Tint": {
    inputs: [{
      type:Filtering.INPUTS.slider, val:0, min:-50, max:50, name:"Tint", var:"tint"
    }],
    filter: ToolFunctions.Tint
  },
  "Saturation": {
    inputs: [{
      type:Filtering.INPUTS.slider, val:1, min:0, max:2, decimal:true, name:"Saturation", var:"sat"
    }],
    filter: ToolFunctions.Saturation
  },
  "Rotate Hue": {
    inputs: [{
      type:Filtering.INPUTS.slider, val:0, min:0, max:360, name:"Degrees", var:"degrees"
    }],
    filter: ToolFunctions.RotateHues
  },
  "Color Temperature": {
    inputs: [{
      type:Filtering.INPUTS.slider, val:0, min:-50, max:50, name:"Warmth", var:"temp"
    }],
    filter: ToolFunctions.ColorTemperature
  },
  "Exposure": {
    inputs: [
      {type:Filtering.INPUTS.select, options:["1/2", "1/4", "1/8", "1/15", "1/30", "1/60", "1/125", "1/250", "1/500"], selected:"1/30", name:"Shutter Speed", var:"shutter", suffix: "second"},
      {type:Filtering.INPUTS.select, options:["50", "100", "200", "400", "800", "1600", "3200", "6400"], selected:"100", name:"ISO", var:"iso"},
      {type:Filtering.INPUTS.select, options:["f/1.4","f/2","f/2.8","f/4","f/5.6","f/8","f/11","f/16","f/22"], selected:"f/1.4", name:"Aperature", var:"aperature"}
    ],
    filter: ({aperature, iso, shutter}) => {
      const scale = Filtering.getEV100(
        Filtering.parseAperture(aperature), 
        Filtering.parseShutterSpeed(shutter), 
        parseFloat(iso));
      return new Float32Array([scale, 0, 0, 0, 0, 0, scale, 0, 0, 0, 0, 0, scale, 0, 0, 0, 0, 0, 1, 0]);
    }
  },
  "Colorize": {
    inputs: [
      {type:Filtering.INPUTS.slider, val:0, min:0, max:255, name:"Red", var:"r"},
      {type:Filtering.INPUTS.slider, val:0, min:0, max:255, name:"Green", var:"g"},
      {type:Filtering.INPUTS.slider, val:0, min:0, max:255, name:"Blue", var:"b"},
      {type:Filtering.INPUTS.slider, val:0, min:0, max:1, decimal:true, name:"Amount", var:"amount"}
    ],
    filter: ToolFunctions.Colorize
  },
  "Chroma Key": {
    inputs: [
      {type:Filtering.INPUTS.oneOf, options:['Red','Green','Blue'], selected:'Green', name:"Channel", var:"channel"},
      {type:Filtering.INPUTS.slider, val:0, min:0, max:1, decimal:true, name:"Amount", var:"amount"}
    ],
    Filter: ToolFunctions.Chromakey
  },
  "Contrast Boost": {
    inputs: [
      {type:Filtering.INPUTS.slider, val:1, min:0, max:3, decimal:true, name:"Contrast", var:"contrast"},
      {type:Filtering.INPUTS.slider, val:0, min:-128, max:128, name:"Bias", var:"bias"}
    ],
    filter: ToolFunctions.ContrastBoost
  },
  "Adjust Levels": {
    inputs: [
      {type:Filtering.INPUTS.slider, val:0, min:0, max:254, name:"Black Level", var:"blackPoint"},
      {type:Filtering.INPUTS.slider, val:1, min:1, max:255, name:"White Level", var:"whitePoint"}
    ],
    filter: ToolFunctions.AdjustLevels
  }
};

export {
  FilterKernels,
  FilterTools
};
