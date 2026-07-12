/**
 * VectorRenderContext - Renders vector-style graphics using an intermediate language
 * Consumed by subclasses (Canvas, WebGL) for actual frame output
 * 
 * @extends RenderContext
 */
import Console from '../../core/Console.js';
import RenderContext from './RenderContext.js';
import processText from '../../ui/VectorText.js';
import { IdentityMatrix, Matrix2d } from '../../core/Matrix.js';
import { VECTOR_IL } from '../assemblers/CanvasVectorAssembler.js';

const twoPi = 6.2831;   // approx. Math.PI * 2

function getColor(r, g, b, a) {
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
 * @class VectorRenderContext
 * 
 * Provides vector-style graphics rendering using an intermediate language format
 * that is consumed by a rendering engine to produce the visual output. During scene
 * generation, the class will generate primitive instructions that reproduce vector
 * drawing operations. This simplifies the communication, allowing for a variety of
 * rendering engines. 
 * 
 * This approach reduces the complexity of rendering operations and
 * simplifies integration, supporting shape container instructions for grouping multiple 
 * shapes into a single instruction, which can be useful for optimizing performance by 
 * reducing the number of draw calls.
 * 
 * @extends RenderContext
 * @module RenderContext/VectorRenderContext
 */
export default class VectorRenderContext extends RenderContext {
  static get DEFAULT_COLOR() {
    return '#000000';
  }

  static get DEFAULT_FILL_COLOR() {
    return '#00000000';
  }

  static get DEFAULT_LINE_WIDTH() {
    return 1;
  }

  static get DEFAULT_FONT_SIZE() {
    return 4;
  }

  // Color state - RGB values (0-1 range) with optional alpha
  #previousColor = [];  // Previous color stack
  #currentColor = VectorRenderContext.DEFAULT_COLOR;   // Current active color
  
  // Width/Line thickness state
  #previousWidth = [];
  #currentWidth = VectorRenderContext.DEFAULT_LINE_WIDTH;
  
  // Font size state
  #previousFontSize = [];
  #currentFontSize = VectorRenderContext.DEFAULT_FONT_SIZE;
  #lastFontSize = 0; 
      
  // Shape state tracking for container instructions
  #activeShapeStack = [];  // Stack for LINESEG/RECTANGLE/etc. containers
  #activeCurvePoints = []; // Points for Bezier curves

  #fill = false;
  #previousFillColor = [];
  #currentFillColor = VectorRenderContext.DEFAULT_FILL_COLOR;

  #shapeTable = new Map();
  #shapeId = 100;

  #screenDimensions = [800, 600];
  #worldDimensions = [800, 600];

  /**
   * Creates a new VectorRenderContext instance
   * @constructor
   * @param {Renderer} renderer - The renderer for the context
   * @param {Object} options - Configuration options for the render context
   * @param {number} [options.screenDimensions=[800,600]] - The viewport dimensions
   * @param {number} [options.worldDimensions=[800,600]] - The world dimensions
   * @param {number} [options.maxPlanes=3] - The number of rendering planes
   * @param {boolean} [options.enableCulling=true] - Whether culling is enabled
   */
  constructor(renderer, options) {
    super(renderer, options);
  }

  get cursor() {
    return super.cursor;
  }

  // Adjust transformation
  set cursor([x, y]) {
    super.cursor = [x, y];
    this.setCursorPosition(x, y);
  }

  set screenDimensions(dims) {
    super.viewport = dims;
    this.renderer.init(this);
  }

  get lineColor() {
    return this.#currentColor;
  }

  set lineColor(c) {
    if (c) {
      this.#previousColor.push(this.#currentColor);
      this.#currentColor = c;
    } else {
      this.popLineColor;
      return;
    }

    // Add color instruction
    this.addInstruction(`${VECTOR_IL.COLOR} ${this.lineColor}`);
  }  

  get popLineColor() {
    this.#currentColor = this.#previousColor.length > 0 ? this.#previousColor.pop() : VectorRenderContext.DEFAULT_COLOR;

    // Add color instruction
    this.addInstruction(`${VECTOR_IL.COLOR} ${this.lineColor}`);
    return undefined;
  }

  resetColor() {
    this.#currentColor = this.DEFAULT_COLOR;
    this.#previousColor = [];
  }

  get fillColor() {
    return this.#currentFillColor;
  }

  set fillColor(f) {
    if (f) {
      this.#previousFillColor.push(this.#currentFillColor);
      this.#currentFillColor = f;
    } else {
      this.popFillColor;
      return;
    }
    
    this.addInstruction(`${VECTOR_IL.FILL} ${this.fillColor}`);
  }

  get popFillColor() {
    this.#currentFillColor = this.#previousFillColor.length > 0 ? this.#previousFillColor.pop() : VectorRenderContext.DEFAULT_FILL_COLOR;
  
    // Add color instruction
    this.addInstruction(`${VECTOR_IL.COLOR} ${this.fillColor}`);
    return undefined;
  }

  resetFillColor() {
    this.#currentFillColor = this.DEFAULT_COLOR;
    this.#previousFillColor = [];
  }

  get lineWidth() {
    return this.#currentWidth;
  }

  set lineWidth(w) {
    if (w) {
      this.#previousWidth.push(this.#currentWidth);
      this.#currentWidth = w;
    } else {
      this.popLineWidth;
    }

    // Add width instruction
    this.addInstruction(`${VECTOR_IL.WIDTH} ${this.lineWidth}`);
  }

  get popLineWidth() {
    this.#currentWidth = this.#previousWidth.length > 0 ? this.#previousWidth.pop() : VectorRenderContext.DEFAULT_LINE_WIDTH;

    // Add width instruction
    this.addInstruction(`${VECTOR_IL.WIDTH} ${this.lineWidth}`);
    return undefined;
  }

  resetLineWidth() {
    this.#currentWidth = this.DEFAULT_LINE_WIDTH;
    this.#previousWidth = [];
  }

  #deltaFontSize() {
    return this.#lastFontSize - this.#currentFontSize;
  }

  get fontSize() {
    return this.#currentFontSize;
  }

  set fontSize(s) {
    if (s) {
      this.#lastFontSize = this.#currentFontSize;
      this.#previousFontSize.push(this.#currentFontSize);
      this.#currentFontSize = s;
    } else {
      this.popFontSize;
    }

    // Add fontsize instruction
    const delta = this.#deltaFontSize();
    if (delta != 0) {
      this.addInstruction(`${VECTOR_IL.FONTSIZE} ${delta}`);
    }
  }

  get popFontSize() {
    this.#lastFontSize = this.#currentFontSize;
    this.#currentFontSize = this.#previousFontSize.length > 0 ? this.#previousFontSize.pop() : VectorRenderContext.DEFAULT_FONT_SIZE;

    this.addInstruction(`${VECTOR_IL.FONTSIZE} ${this.#deltaFontSize()}`);
    return undefined;
  }

  resetFontSize() {
    this.#currentFontSize = this.DEFAULT_FONT_SIZE;
    this.#previousFontSize = [];
    this.#lastFontSize = 4;
  }
  /**
   * Reset all render context state for a new frame
   */
  reset() {
    super.reset();
    this.clearInstructionBuffer();
    if (this.world?.stackDepth > 1) {
      Console.warn('Stack depth is greater than 1 at frame reset.')
    }
  }
  
  setCursorPosition(x, y) {
    this.addInstruction(`${VECTOR_IL.TRANSLATE} ${x} ${y}`);
  }

  /**
   * Push a transformation onto the stack and apply it to the context.
   * @param {Matrix2d} transformationMatrix 
   */
  pushTransform(transformationMatrix = null) {
    transformationMatrix = transformationMatrix || this.world.currentTransform;
    super.pushTransform(transformationMatrix);
  }

  popTransform() {
    const xform = super.popTransform();
    return xform;
  }

  /**
   * Throw out the transformation stack and reset it to the identity matrix.
   */
  resetTransforms() {
    super.resetTransforms();
    this.addInstruction(`${VECTOR_IL.ABS_TRANSFORM} ${IdentityMatrix.toCanvas()}`);
  }

  transform(matrix) {
    matrix.mul(this.world.currentTransform);
    this.addInstruction(`${VECTOR_IL.TRANSFORM} ${matrix.toCanvas()}`);
  }

  absTransform(matrix) {
    this.addInstruction(`${VECTOR_IL.ABS_TRANSFORM} ${matrix.toCanvas()}`);
  }

  translate(x, y) {
    this.addInstruction(`${VECTOR_IL.TRANSLATE} ${x} ${y}`);
  }

  rotate(angle) {
    this.addInstruction(`${VECTOR_IL.ROTATE} ${angle}`);
  }

  scale(sX, sY) {
    this.addInstruction(`${sX === sY ? VECTOR_IL.USCALE + ' ' + sX : VECTOR_IL.SCALE + ' ' + sX + ' ' + sY}`);
  }

  skew(sX, sY) {
    this.addInstruction(`${VECTOR_IL.SKEW} ${sX} ${sY}`);
  }

  //--------------------------------------
  // HIGH-LEVEL VECTOR API
  //--------------------------------------

  get API() {
    return this.getAPI();
  }

  /**
   * @returns {Object} Returns the high-level API methods for vector drawing.
   */
  getAPI() {
    const context = this;
    return {
      /**
       * Translate the current transform by X and Y
       * @param {number} x 
       * @param {number} y 
       * @returns {Object} Returns this for chaining
       */
      translate: (x, y) => {
        context.translate(x, y);
        return context.API;
      },

      /**
       * Rotate the current transform by angle radians
       * @param {number} angle - Rotation angle in radians
       * @returns {Object} Returns this for chaining
       */
      rotate: (angle) => {
        context.rotate(angle);
        return context.API;
      },

      /**
       * Scale the current transform by X and Y
       * @param {number} x 
       * @param {number} y 
       * @returns {Object} Returns this for chaining
       */
      scale: (x, y) => {
        context.scale(x, y);
        return context.API;
      },

      /**
       * Uniformly scale the transform by a scalar value
       * @param {number} scalar 
       * @returns {Object} Returns this for chaining
       */
      uniformScale: (scalar) => {
        context.API.scale(scalar, scalar);
        return context.API;
      },

      /**
       * Skew the transform by sX and sY
       * @param {number} sX 
       * @param {number} sY 
       * @returns {Object} Returns this for chaining
       */
      skew: (sX, sY) => {
        context.skew(sX, sY);
        return context.API;
      },

      /**
       * Apply the transform in he matrix to the current world matrix.
       * @param {Matrix2d} matrix 
       * @returns {Object} Returns this for chaining
       */
      transform: (matrix) => {
        context.transform(matrix);
        return context.API;
      },

      /**
       * Apply an absolute transform, ignoring the current world matrix.
       * @param {Matrix2d} matrix 
       * @returns {Object} Returns this for chaining
       */
      absTransform: (matrix) => {
        context.absTransform(matrix);
        return context.API;
      },

      /**
       * Push the world transformation matrix onto the transform stack. This is useful for applying transformations to the entire scene.
       * @param {Matrix2d} transformationMatrix - Optional matrix to push. If empty, the current world transform is pushed.
       */
      pushTransform: (transformationMatrix) => {
        context.pushTransform(transformationMatrix);
        return context.API;
      },

      /**
       * Pop the last transformation matrix off the transform stack.
       * @returns {Matrix2d} The previous transform matrix
       */
      popTransform: () => {
        return context.popTransform();
      },

      /**
       * Peek at the top-most entry on the transform stack, but does not remove it or apply it.
       * @returns {Matrix2d} The top-most entry on the transform stack
       */
      peekTransform: () => {
        return context.peekTransform();
      },

      /**
       * Hard reset the transform to the Identity Matrix and empty the transform stack.
       * @returns {Object} Returns this for chaining
       */
      reset: () => {
        context.resetTransforms();
        return context.API;
      },

      /**
       * Set line color with decorator pattern - tracks previous value. If no values are provided,
       * it will set the line color to the previous color on the stack, until the stack is empty. Then
       * it will set to the default color.
       * @param {number|string} r - Red value (0-1) or hex string E.g. "#da7d12"
       * @param {number|string} g - Green value (0-1) 
       * @param {number|string} b - Red value (0-1)
       * @param {number|string} a - Alpha value (0-1)
       * @returns {Object} Returns this for chaining
       */
      color: (r, g = null, b = null, { a = 1 } = {}) => {
        if (r || (r && g && b)) {
          context.lineColor = getColor(r, g, b, a);        
        } else {
          context.lineColor = undefined;
        }
        return context.API;
      },

      /**
       * Set fill color with decorator pattern - tracks previous value. If no values are provided,
       * it will set the fill color to the previous color on the stack, until the stack is empty. Then
       * it will set to the default color.
       * @param {number|string} r - Red value (0-1) or hex string E.g. "#da7d12"
       * @param {number|string} g - Green value (0-1) 
       * @param {number|string} b - Red value (0-1)
       * @param {number|string} a - Alpha value (0-1)
       * @returns {Object} Returns this for chaining
       */
      fillColor: (r, g = null, b = null, { a = 1 } = {}) => {
        if (r || (r && g && b)) {
          context.fillColor = getColor(r, g, b, a);
        } else {
          context.fillColor = undefined;
        }
        return context.API;
      },
      
      /**
       * Reset line color to default color and reset memory stack.
       * @returns {Object} Returns this for chaining
       */
      resetColor: () => {
        context.resetColor();
        return context.API;
      },
      
      /**
       * Reset fill color to default color and reset memory stack.
       * @returns {Object} Returns this for chaining
       */
      resetFill: () => {
        context.resetFillColor();
        return context.API;
      },

      /**
       * Set line width with decorator pattern - tracks previous value.
       * @param {number} w - Line thickness in pixels. If not provided, restoresd the previous line with.
       * @returns {Object} Returns this for chaining
       */
      width: (w) => {
        context.lineWidth = w;        
        return context.API;
      },
      
      /**
       * Reset line width to default width and reset memory stack.
       * @returns {Object} Returns this for chaining
       */
      resetWidth: () => {
        context.resetLineWidth();
        return context.API;
      },
      
      /**
       * Set font size with decorator pattern - tracks previous value.
       * @param {number} s - Font size in pixels. If empty, pops the last font size off the stack
       * @returns {Object} Returns this for chaining
       */
      fontSize: (s) => {
        context.fontSize = s;
        return context.API;
      },
      
      /**
       * Reset font size to defailt size and reset memory stack.
       * @returns {Object} Returns this for chaining
       */
      resetFontSize: () => {
        context.resetFontSize();
        return context.API;
      },
      
      /**
       * Perform a "carriage return", advancing the cursor down one line and resetting the
       * cursor back to the value in index 0 of `context.cursorLimits`.
       */
      carriageReturn: () => {
        context.carriageReturn();
        return context.API;
      },

      /**
       * Set the cursor X position
       * @param {number} x - The cursor X position
       */
      cursorX: (x) => {
        context.cursorX = x;
        return context.API;
      },

      /**
       * Set the cursor Y position
       * @param {number} y - The cursor Y position
       */
      cursorY: (y) => {
        context.cursorY = y;
        return context.API;
      },

      /**
       * Sets the cursor X & Y simultaneously
       * @param {number} x - X coordinate in screen space
       * @param {number} y - Y coordinate in screen space
       */
      cursor: (x, y) => {
        context.cursor = [x, y];
        return context.API;
      },

      /**
       * Moves the cursor relatively along each axis.
       * @param {number} x - Relative X to add to the cursor X
       * @param {number} y - Relative Y to add to the cursor Y
       */
      cursorDelta: (deltaX, deltaY) => {
        context.cursorDeltaX = deltaX;
        context.cursorDeltaY = deltaY;
        return context.API;
      },

      /**
       * Get the cursor position: [x, y]
       * @returns {Array<number>} [x, y] - The X and Y position of the cursor
       */
      getCursor: () => {
        return context.cursor;
      },

      /**
       * Draw a point at specified coordinates
       * @param {Array} [pos=[x, y]] - Point coordinates [x, y] in screen space
       * @param {Object} [options] - Optional settings
       * @param {string|boolean} [options.round] - Round to nearest integer coordinate
       * @param {string|boolean} [options.square] - Use square (instead of round) coordinates
       * @returns {Object} Returns this for chaining
       */
      point: ([x, y], { round = false, square = false } = {}) => {
        // Convert to screen coordinates if using world coordinates
        let screenPos = [x, y];
        
        if (context.enableCulling) {
          const screenPosObj = context.worldToScreen(x, y);
          if (screenPosObj && screenPosObj.screen) {
            screenPos = [screenPosObj.screen.x, screenPosObj.screen.y];
          } else {
            // Object outside view bounds - skip rendering
            return [];
          }
        }
        
        // Apply rounding or squaring to coordinates
        let pointX = Math.round(screenPos[0]);
        let pointY = Math.round(screenPos[1]);
        
        if (round === false && square) {
          // Keep as-is but marked for square handling
          pointX = screenPos[0];
          pointY = screenPos[1];
        } else if (square) {
          // Use exact coordinates (no rounding)
          pointX = screenPos[0];
          pointY = screenPos[1];
        }
        
        const pointInst = [];
        context.addInstruction(`${VECTOR_IL.POINT} ${pointX} ${pointY}`);
        return context.API;
      },
      
      /**
       * Draw a line between two points (absolute coordinates)
       * @param {number} x - X coordinate for the start point in screen/world space
       * @param {number} y - Y coordinate for the start point in screen/world space
       * @param {number} ex - X coordinate for the end point in screen/world space
       * @param {number} ey - Y coordinate for the end point in screen/world space
       * @returns {Object} Returns this for chaining
       */
      line: (x, y, ex, ey) => {
        // Convert to screen coordinates if using world coordinates
        let startScreen = [x, y];
        let endScreen = [ex, ey];
        
        if (context.enableCulling) {
          const startObj = context.worldToScreen(x, y);
          const endObj = context.worldToScreen(ex, ey);
          
          if (startObj && endObj) {
            startScreen = startObj;
            endScreen = endObj;
          } else {
            // Start or end point outside view bounds - skip rendering
            return context.API;
          }
        }
        
        context.addInstruction(`${VECTOR_IL.LINE} ${startScreen[0]} ${startScreen[1]} ${endScreen[0]} ${endScreen[1]}`);
        return context.API;
      },

      /**
       * 
       * @param {number} x - The x coordinate for the line 
       * @param {number} y - The y coordinate for the line 
       * @returns {Object} Returns this for chaining
       */
      lineRel: (x, y) => {
        // Convert to screen coordinates if using world coordinates
        let startScreen = [x, y];
        
        if (context.enableCulling) {
          const startObj = context.worldToScreen(x, y);
          
          if (startObj) {
            startScreen = [startObj[0], startObj[1]];
          } else {
            // Start or end point outside view bounds - skip rendering
            return context.API;
          }
        }

        context.addInstruction(`${VECTOR_IL.LINEREL} ${startScreen[0]} ${startScreen[1]}`);
        return context.API;
      },
      
      /**
       * Draw a line segment container for grouped lines
       * @param {boolean} filled - Closed line segment will be filled with fill color
       * @param {Array} [start=[x, y]] - Start point in screen/world space
       * @param {...Array} [point=[x, y]] - Follow on points in screen/world space
       * @returns {Object} Returns this for chaining
       */
      lineSegment: (filled, [x1, y1], ... coords) => {
        context.addInstruction(`${VECTOR_IL.LINESEG} ${filled ? '1' : '0'}`);
        
        // first line of segment
        const lineTo = coords.shift();
        context.API.line(x1, y1, lineTo[0], lineTo[1]);

        // run out the remainder of the coordinates in the line segment
        for (let rel of coords) {
          context.API.lineRel(rel[0], rel[1]);
        }
        
        context.addInstruction(`${VECTOR_IL.ENDSEG}`);
        return context.API;
      },

      /**
       * Helper to generate the appropriate structure for quadratic curves
       * to use with the <code>curve()</code> method.
       * @param {number} controlX - The X control point 
       * @param {number} controlY - The Y control point
       * @param {number} endX - The X end point of the curve
       * @param {number} endY - The Y end point of the curve
       * @returns {Array<number>} A 4-element Quadratic control and end points
       */
      quadratic: (controlX, controlY, endX, endY) => {
        return [controlX, controlY, endX, endY];
      },

      /**
       * Helper to generate the appropriate structure for Bezier curves
       * to use with the <code>curve()</code> method.
       * @param {number} controlX - The X control point 
       * @param {number} controlY - The Y control point
       * @param {number} endX - The X end point of the curve
       * @param {number} endY - The Y end point of the curve
       * @returns {Array<number>} A 4-element Quadratic control and end points
       */
      bezier: (controlX1, controlY1, controlX2, controlY2, endX, endY) => {
        return [controlX1, controlY1, controlX2, controlY2, endX, endY];
      },

      /**
       * Draw a curve from a starting point, and a set of control points, either
       * filled or not. See the helper methods for generating points for the curve.
       * {@link #quadratic} and {@link #bezier}
       * @param {boolean} filled - True to fill the curve
       * @param {Array<number>} [x1, y1] - The starting point of the curve 
       * @param  {...any} coords - The remaining coordinates of the curve expressed as 
       *                           either 4-element (quadratic) or 6-element (bezier) arrays
       * @returns {Object} Returns the API for chaining
       */
      curve: (filled, [x1, y1], ... coords) => {
        context.addInstruction(`${VECTOR_IL.CURVE} ${filled ? '1' : '0'} ${x1} ${y1}`);
        
        // the rest of the coordinates need to be either 4 coordinates (quadratic) or 6 coordinates (bezier)
        for (let rel of coords) {
          if (rel.length === 4) {
            context.addInstruction(`${VECTOR_IL.QUAD} ${rel[0]} ${rel[1]} ${rel[2]} ${rel[3]}`)
          } else if (rel.length === 6) {
            context.addInstruction(`${VECTOR_IL.BEZIER} ${rel[0]} ${rel[1]} ${rel[2]} ${rel[3]} ${rel[4]} ${rel[5]} ${rel[6]}`);
          } else {
            throw new RenderContextError(this, "Invalid number of coordinates for a curve (4 or 6)");
          }
        }
        
        context.addInstruction(`${VECTOR_IL.ENDCURVE}`);
        return context.API;
      },
      
      /**
       * Draw an arc, or arc segment
       * @param {number} cx - Center X coordinate in screen space
       * @param {number} cy - Center Y coordinate in screen space
       * @param {number} rX - X radius of the ellipse
       * @param {number} rY - Y radius of the ellipse
       * @param {number} startAngle - Starting angle in radians (0 = 3 o'clock)
       * @param {number} endAngle - Ending angle in radians
       * @param {boolean} filled - filled arc
       * @returns {Object} Returns this for chaining
       */
      arc: (cx, cy, rX, rY, startAngle = 0, endAngle = twoPi, filled = false) => {
        let center = [cx, cy]; 

        if (context.enableCulling) {
          const startObj = context.worldToScreen(cx, cy);
          
          if (startObj) {
            center = [startObj[0], startObj[1]];
          } else {
            // Center is outside the context
            return context.API;
          }
        }

        context.addInstruction(`${VECTOR_IL.ARC} ${cx} ${cy} ${rX} ${rY} ${startAngle} ${endAngle} ${filled ? 1 : 0}`);
        return context.API;
      },

      /**
       * Draw an ellipse
       * @param {number} cx - Center X coordinate in screen space
       * @param {number} cy - Center Y coordinate in screen space
       * @param {number} rX - X radius of the arc
       * @param {number} rY - Y radius of the arc
       * @returns {Object} Returns this for chaining
       */
      ellipse: (cx, cy, rX, rY, filled) => {
        return context.API.arc(cx, cy, rX, rY, 0, twoPi, filled);
      },

      /**
       * Draw a circle
       * @param {number} cx - Center X coordinate in screen space
       * @param {number} cy - Center Y coordinate in screen space
       * @param {number} r - Radius of the arc
       * @returns {Object} Returns this for chaining
       */
      circle: (cx, cy, r, filled) => {
        return context.API.arc(cx, cy, r, r, 0, twoPi, filled);
      },
      
      /**
       * Draw a rectangle using line segments
       * @param {number} x1 - Left X coordinate (or top-left corner)
       * @param {number} y1 - Top Y coordinate
       * @param {number} x2 - Right X coordinate (or bottom-right corner)
       * @param {number} y2 - Bottom Y coordinate
       * @returns {Object} Returns this for chaining
       */
      rectangle: (x1, y1, x2, y2, filled) => {
        // Convert to absolute coordinates from top-left corner
        context.API.lineSegment(filled, 
            [x1, y1],
            [x2, y1],
            [x2, y2],
            [x1, y2],
            [x1, y1]
          );

        return context.API;
      },
      
      /**
       * Draw a square at position with given side length
       * @param {number} x - Center X coordinate or top-left corner
       * @param {number} y - Center Y coordinate or top corner
       * @param {number} side - Side length of the square
       * @returns {Object} Returns this for chaining
       */
      square: (x, y, side, filled) => {
        return context.API.rectangle(x, y, x + side, y + side, filled);
      },
      
      /**
       * Draw a polygon with variable vertices
       * @param {...Array} vertices - Array of [x, y] vertex coordinates
       * @returns {Object} Returns this for chaining
       */
      polygon: (filled, ...vertices) => {
        // Close the shape by connecting last point to first
        const [firstVertex, ...restVertices] = vertices;
        
        if (vertices.length === 0) {
          return [];
        }
        
        // close the polygon
        restVertices.push(firstVertex);

        // Draw each edge of the polygon
        context.API.lineSegment(filled, firstVertex, ...restVertices);
        return context.API;
      },
      
      /**
       * Draw a regular polygon
       * @param {number} cx - Center X coordinate
       * @param {number} cy - Center Y coordinate
       * @param {number} sides - Number of sides
       * @returns {Object} Returns this for chaining
       */
      regularPolygon: (cx, cy, sides, filled) => {
        const vertices = [];
        
        // Calculate vertices for regular polygon
        for (let i = 0; i < sides; i++) {
          const angle = (Math.PI * 2 * i) / sides - Math.PI / 2; // Start from bottom
          const x = cx + Math.cos(angle) * (100); // Use unit radius as placeholder
          const y = cy + Math.sin(angle) * (100);
          vertices.push([x, y]);
        }
        
        return context.API.polygon(filled, ...vertices);
      },

      /**
       * Text rendering method - generates IL instructions for text content with formatting
       * @param {string} text - Text content to render
       * @param {Object} options - Configuration options
       * @param {string|number} [options.color] - Initial color (hex string or RGB values) (Default: '#000000')
       * @param {number} [options.lineWidth] - Initial line width (default: 1)
       * @param {number} [options.fontsize] - Initial font size (Default: 12)
       * @param {Object} [options.formatting] - Initial formatting states: {bold, italics, underline}
       * @returns {Object} Returns this for chaining
       */
      text(text, options) {
        // Validate input
        if (typeof text !== 'string' || text.length === 0) {
          return context.API;
        }

        options = { ...{ formatting: { bold: false, italics: false, underline: false } }, ...options };

        this.pushTransform();

        // Apply initial color if provided
        if (options.color && options.color !== context.lineColor) {
          if (typeof options.color === 'string') {
            context.lineColor = options.color;
          } else if (typeof options.color === 'number') {
            const r8 = Math.round(options.color * 255).toString(16).padStart(2, '0');
            const g8 = Math.round(options.color * 255).toString(16).padStart(2, '0');
            const b8 = Math.round(options.color * 255).toString(16).padStart(2, '0');
            context.lineColor = `#${r8}${g8}${b8}`;
          }
        }

        // Apply initial font size if provided
        context.fontSize = options.fontSize || context.fontSize;
        context.lineWidth = options.lineWidth || context.lineWidth;

        if (options.formatting.bold)
            context.addInstruction(`${VECTOR_IL.TOGGLE} BOLD\n`);

        if (options.formatting.italics)
            context.addInstruction(`${VECTOR_IL.TOGGLE} ITALICS\n`);
        
        if (options.formatting.underline)
            context.addInstruction(`${VECTOR_IL.TOGGLE} UNDERLINE\n`);

        // Process text and generate instructions
        processText.call(context, text);
        this.popTransform();

        return context.API;
      }
    };
  }
}
