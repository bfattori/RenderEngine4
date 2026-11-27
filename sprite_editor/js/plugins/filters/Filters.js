
export default class Filtering {
  // ====================================================================
  // Filtering operations
  // ====================================================================
  
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
}

class Kernels {
  // 2d kernels  
  static Blur = { matrix: [1, 1, 1, 1, 1, 1, 1, 1, 1], divisor: 6, offset: 0 };
  static GaussianBlur = { matrix: [1, 2, 1, 2, 4, 2, 1, 2, 1], divisor: 16, offset: 0 };
  static SmoothGaussian = { matrix: [1, 4, 6, 4, 1, 4, 16, 24, 16, 4, 6, 24, 36, 24, 6, 4, 16, 24, 16, 4, 1,  4,  6,  4, 1], divisor: 256, offset: 0 };
  static FindEdges = { matrix: [-1, -1, -1, -1, 8, -1, -1, -1, -1], divisor: 1, offset: 0 };
  static SobelHorizEdges = { matrix: [-1, 0, 1, -2, 0, 2, -1, 0, 1], divisor: 1, offset: 0 };
  static SobelVertEdges = { matrix: [-1, -2, -1, 0, 0, 0, 1, 2, 1], divisor: 1, offset: 0 };
  static PrewittHorizEdges = { matrix:[-1, 0, 1, -1, 0, 1, -1, 0, 1], divisor: 1, offset: 0 };
  static ScharrHorizEdges = { matrix: [-3, 0, 3, -10, 0, 10, -3, 0, 3], divisor: 1, offset: 0 };
  static Sharpen = { matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0], divisor: 1, offset: 0 };
  static SharpenMore = { matrix: [-1, -1, -1, -1, 9, -1, -1, -1, -1], divisor: 1, offset: 0 };
  static Emboss = { matrix: [-2, -1, 0, -1, 1, 1, 0, 1, 2], divisor: 1, offset: 128 };
  static Outline = { matrix: [-1, -1, -1, -1, 8, -1, -1, -1, -1], divisor: 1, offset: 128 };
  static TopLeftEmboss = { matrix: [-1, -1, 0, -1, 0, 1, 0, 1, 1], divisor: 1, offset: 128 };
  static HighPass = { matrix: [-1, -2, -1, -2, 12, -2, -1, -2, -1], divisor: 16, offset: 128 };
  static MotionBlur = { matrix: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1], divisor: 5, offset: 0 };
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
  static Brightness = ({amt} = {amt:40}) => { 
    return [1, 0, 0, 0, amt,  0, 1, 0, 0, amt,  0, 0, 1, 0, amt,  0, 0, 0, 1, 0]; 
  }
  static Contrast = ({amt} = {amt:1.5}) => { 
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
  static Exposure = ({stops}) => {
    const scale = Math.pow(2, stops);
    return new Float32Array([scale, 0, 0, 0, 0, 0, scale, 0, 0, 0, 0, 0, scale, 0, 0, 0, 0, 0, 1, 0]);
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
    "Blur": Kernels.Blur,
    "Gaussian Blur": Kernels.GaussianBlur,
    "Smooth Gaussian": Kernels.SmoothGaussian,
    "Find Edges": Kernels.FindEdges,
    "Sobel (Horizontal edges)": Kernels.SobelHorizEdges,
    "Sobel (Vertical edges)": Kernels.SobelVertEdges,
    "Prewitt (Horizontal edges)": Kernels.PrewittHorizEdges,
    "Scharr (Horizontal edges)": Kernels.ScharrHorizEdges,
    "Sharpen": Kernels.Sharpen,
    "Sharpen More": Kernels.SharpenMore,
    "Emboss": Kernels.Emboss,
    "Top-Left Emboss": Kernels.TopLeftEmboss,
    "Outline": Kernels.Outline,
    "High Pass": Kernels.HighPass,
    "Diagonal Motion Blur": Kernels.MotionBlur,
    "Unsharp": Kernels.Unsharp,
  },

  // Colorspace operations
  color: {
    "Invert": Kernels.Invert,
    "Grayscale": Kernels.Grayscale,
    "Mask": Kernels.Mask,
    "Sepia": Kernels.Sepia,
    "1930s Technicolor": Kernels.Technicolor,
    "Vintage Polaroid": Kernels.Polaroid,
    "Night Vision": Kernels.NightVision,
    "Channel Swap": Kernels.BGRSwap,
    "Protanopia (Red color blindness)": Kernels.Protanopia,
    "Deuteranopia (Green color blindness)": Kernels.Deuteranopia,
    "Tritanopia (Blue color blindness)": Kernels.Tritanopia
    //,"Identity": Kernels.Identity
  }
};

const FilterTools = {
  "Brightness": {
    inputs: [{type:"slider", val:0, min:-10, max:10, name:"Brightness", var:"amt"}],
    filter: ToolFunctions.Brightness
  },
  "Contrast": {
    inputs: [{type:"slider", val:0, min:-3, max:3, decimal:true, name:"Contrast", var:"amt"}],
    filter: ToolFunctions.Contrast
  },
  "Tint": {
    inputs: [{type:"slider", val:0, min:-50, max:50, name:"Tint", var:"tint"}],
    filter: ToolFunctions.Tint
  },
  "Saturation": {
    inputs: [{type:"slider", val:1, min:0, max:2, decimal:true, name:"Saturation", var:"sat"}],
    filter: ToolFunctions.Saturation
  },
  "Hue Rotation": {
    inputs: [{type:"slider", val:0, min:0, max:360, name:"Degrees", var:"degrees"}],
    filter: ToolFunctions.RotateHues
  },
  "Color Temperature": {
    inputs: [{type:"slider", val:0, min:-50, max:50, name:"Warmth", var:"temp"}],
    filter: ToolFunctions.ColorTemperature
  },
  "Exposure": {
    inputs: [{type:"slider", val:0, min:-14, max:14, name:"Stops", var:"stops"}],
    filter: ToolFunctions.Exposure
  },
  "Colorize": {
    inputs: [
      {type:"slider", val:0, min:0, max:255, name:"Red", var:"r"},
      {type:"slider", val:0, min:0, max:255, name:"Green", var:"g"},
      {type:"slider", val:0, min:0, max:255, name:"Blue", var:"b"},
      {type:"slider", val:0, min:0, max:1, decimal:true, name:"Amount", var:"amount"}
    ],
    filter: ToolFunctions.Colorize
  },
  "Chomakey": {
    inputs: [
      {type:"one", options:['Red','Green','Blue'], selected:'Green', name:"Channel", var:"channel"},
      {type:"slider", val:0, min:0, max:1, decimal:true, name:"Amount", var:"amount"}
    ],
    Filter: ToolFunctions.Chromakey
  },
  "Contrast Boost": {
    inputs: [
      {type:"slider", val:1, min:0, max:3, decimal:true, name:"Contrast", var:"contrast"},
      {type:"slider", val:0, min:-128, max:128, name:"Bias", var:"bias"}
    ],
    filter: ToolFunctions.ContrastBoost
  },
  "Adjust Levels": {
    inputs: [
      {type:"slider", val:0, min:0, max:254, name:"Black Level", var:"blackPoint"},
      {type:"slider", val:1, min:1, max:255, name:"White Level", var:"whitePoint"}
    ],
    filter: ToolFunctions.AdjustLevels
  }
};

export {
  FilterKernels,
  FilterTools
};
