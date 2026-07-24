import Constants from '../../../Constants.js';
import { Matrix2d, IdentityMatrix } from '../../../core/Matrix.js';
import { VECTOR_IL } from '../../assemblers/IntermediateLanguages.js';
import VectorTextParser from '../../../ui/VectorText.js';

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
 * @returns {Object} Returns the high-level API methods for vector drawing.
 */
export default function getAPI() {
    const context = this;
    const textParser = new VectorTextParser;

    const state = {
        // Color state - RGB values (0-1 range) with optional alpha
        previousColor: [],
        currentColor: Constants.VECTOR_DEFAULTS.LINE_COLOR,
        
        // Width/Line thickness state
        previousWidth: [],
        currentWidth: Constants.VECTOR_DEFAULTS.LINE_WIDTH,
        
        // Font size state
        previousFontSize: [],
        currentFontSize: Constants.VECTOR_DEFAULTS.FONT_SIZE,
        lastFontSize: 0, 
           
        // Fill state
        fill: false,
        previousFillColor: [],
        currentFillColor: Constants.VECTOR_DEFAULTS.FILL_COLOR,

        // Transform state
        currentTransform: new Matrix2d(IdentityMatrix),
        
        // Text cursor state
        cursor: {
            x: 0,
            y: 0
        },
        limits: {
            left: 0,
            right: 0
        }
    };
    
    return {
        //-----------------------------------------------
        // TRANSFORMATION & MOVEMENT
        
        /**
         * Translate the current transform by X and Y
         * @param {number} x 
         * @param {number} y 
         * @returns {Object} Returns this for chaining
         */
        translate: (x, y) => {
            context.addInstruction(`${VECTOR_IL.TRANSLATE} ${x} ${y}`);
            state.currentTransform.translate(x, y);
            return context.API;
        },

        /**
         * Rotate the current transform by angle radians
         * @param {number} angle - Rotation angle in radians
         * @returns {Object} Returns this for chaining
         */
        rotate: (angle) => {
            context.addInstruction(`${VECTOR_IL.ROTATE} ${angle}`);
            state.currentTransform.rotate(angle);
            return context.API;
        },

        /**
         * Scale the current transform by X and Y
         * @param {number} x 
         * @param {number} y 
         * @returns {Object} Returns this for chaining
         */
        scale: (x, y) => {
            context.addInstruction(`${x === y ? VECTOR_IL.USCALE + ' ' + x : VECTOR_IL.SCALE + ' ' + x + ' ' + y}`);
            state.currentTransform.scale(x, y);
            return context.API;
        },

        /**
         * Uniformly scale the transform by a scalar value
         * @param {number} scalar 
         * @returns {Object} Returns this for chaining
         */
        uniformScale: (scalar) => {
            context.addInstruction(`${VECTOR_IL.USCALE} ${scalar}`);
            state.currentTransform.uniformScale(scalar);
            return context.API;
        },

        /**
         * Skew the transform by sX and sY
         * @param {number} sX 
         * @param {number} sY 
         * @returns {Object} Returns this for chaining
         */
        skew: (sX, sY) => {
            context.addInstruction(`${VECTOR_IL.SKEW} ${sX} ${sY || 0}`);
            state.currentTransform.skew(sX, sY);
            return context.API;
        },

        /**
         * Apply the transform in he matrix to the current world matrix.
         * @param {Matrix2d} matrix 
         * @returns {Object} Returns this for chaining
         */
        transform: (matrix) => {
            context.addInstruction(`${VECTOR_IL.TRANSFORM} ${matrix.toCanvas()}`);
            state.currentTransform = matrix;
            return context.API;
        },

        /**
         * Apply an absolute transform, ignoring the current world matrix.
         * @param {Matrix2d} matrix 
         * @returns {Object} Returns this for chaining
         */
        absTransform: (matrix) => {
            context.addInstruction(`${VECTOR_IL.ABS_TRANSFORM} ${matrix.toCanvas()}`);
            state.currentTransform = matrix;
            return context.API;
        },

        /**
         * Push the world transformation matrix onto the transform stack. This is useful for applying transformations to the entire scene.
         * @param {Matrix2d} transform - Optional matrix to push. If empty, the current world transform is pushed.
         */
        pushTransform: (transform) => {
            context.pushTransform(transform);
            if (transform) 
                state.currentTransform = transform;
            else
                state.currentTransform = Matrix2d.identity();
            return context.API;
        },

        /**
         * Pop the last transformation matrix off the transform stack.
         * @returns {Matrix2d|null} The previous transform matrix, or <code>null</code>
         */
        popTransform: () => {
            state.currentTransform = context.popTransform();
            return state.currentTransform;
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
        resetTransforms: () => {
            context.resetTransforms();
            state.currentTransform = new Matrix2d(IdentityMatrix);
            return context.API;
        },

        //--------------------------------------------
        // STATE MANAGEMENT

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
            const c = getColor(r, g, b, a);
            let same = false;
            if (c) {
                if (c === state.currentColor) same = true;
                state.previousColor.push(state.currentColor);
                state.currentColor = c;
            } else {
                state.currentColor = state.previousColor.length > 0 ? state.previousColor.pop() : Constants.VECTOR_DEFAULTS.LINE_COLOR;
            }
            // Add color instruction
            if (!same)
                context.addInstruction(`${VECTOR_IL.COLOR} ${state.currentColor}`);
            
            return context.API;
        },

        /**
         * Get the current context color
         * @returns {String} The current context color
         */
        getColor: () => {
            return state.currentColor;
        },

        setColor: (r, g = null, b = null, { a = 1 } = {}) => {
            const c = getColor(r, g, b, a);
            if (c !== state.currentColor) {
                state.currentColor = c;
                context.addInstruction(`${VECTOR_IL.COLOR} ${state.currentColor}`)
            }
            return context.API;
        },

        /**
         * Reset line color to default color and reset memory stack.
         * @returns {Object} Returns this for chaining
         */
        resetColor: () => {
            state.currentColor = Constants.VECTOR_DEFAULTS.FILL_COLOR;
            state.previousColor = [];
            context.addInstruction(`${VECTOR_IL.COLOR} ${state.currentColor}`);
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
            const f = getColor(r, g, b, a);
            let same = false;
            if (f) {
                if (f === state.currentFillColor) same = true;
                state.previousFillColor.push(state.currentFillColor);
                state.currentFillColor = f;
            } else if (!f) {
                state.currentFillColor = state.previousFillColor.length > 0 ? state.previousFillColor.pop() : Constants.VECTOR_DEFAULTS.DEFAULT_FILL_COLOR;
            }

            if (!same)
                context.addInstruction(`${VECTOR_IL.FILL} ${state.currentFillColor}`);
            
            return context.API;
        },
        
        /**
         * Get the current fill color
         * @returns {String} The current fill color
         */
        getFillColor: () => {
            return state.currentFillColor;
        },

        setFillColor: (r, g = null, b = null, { a = 1 } = {}) => {
            const f = getColor(r, g, b, a);
            if (f !== state.currenrFillColor) {
                state.currentFillColor = f;
                context.addInstruction(`${VECTOR_IL.FILL} ${f}`);
            }
            return context.API;
        },
        
        /**
         * Reset fill color to default color and reset memory stack.
         * @returns {Object} Returns this for chaining
         */
        resetFillColor: () => {
            state.currentFillColor = Constants.VECTOR_DEFAULTS.FILL_COLOR;
            state.previousFillColor = [];
            context.addInstruction(`${VECTOR_IL.FILL} ${state.currentFillColor}`);
            return context.API;
        },

        /**
         * Set line width with decorator pattern - tracks previous value.
         * @param {number} w - Line thickness in pixels. If not provided, restoresd the previous line with.
         * @returns {Object} Returns this for chaining
         */
        width: (w) => {
            let same = false;
            if (w) {
                if (w === state.currentWidth) same = true;
                state.previousWidth.push(state.currentWidth);
                state.currentWidth = w;
            } else if (!w) {
                state.currentWidth = state.previousWidth.length > 0 ? state.previousWidth.pop() : Constants.VECTOR_DEFAULTS.LINE_WIDTH;
            }

            // Add width instruction
            if (!same)
                context.addInstruction(`${VECTOR_IL.WIDTH} ${state.currentWidth}`);
            
            return context.API;
        },

        /**
         * Get the current context stroke width
         * @returns {number} The line width
         */
        getWidth: () => {
            return state.currentWidth;
        },

        setWidth: (w) => {
            if (w !== state.currenWidth) {
                state.currentWidth = w;
                context.addInstruction(`${VECTOR_IL.WIDTH} ${w}`);
            }
            return context.API;
        },
        
        /**
         * Reset line width to default width and reset memory stack.
         * @returns {Object} Returns this for chaining
         */
        resetWidth: () => {
            state.currentWidth = Constants.VECTOR_DEFAULTS.LINE_WIDTH;
            state.previousWidth = [];
            context.addInstruction(`${VECTOR_IL.WIDTH} ${state.currentWidth}`);
            return context.API;
        },
        
        /**
         * Set font size with decorator pattern - tracks previous value.
         * @param {number} s - Font size in pixels. If empty, pops the last font size off the stack
         * @returns {Object} Returns this for chaining
         */
        fontSize: (s) => {
            let same = false;
            let last = state.currentFontSize;
            let next = Math.max(0, Math.min(s, Constants.VECTOR_DEFAULTS.MAX_FONT_SIZE));
            if (s && s > 0 && s <= Constants.VECTOR_DEFAULTS.MAX_FONT_SIZE) {
                if (s === state.currentFontSize) same = true;
                state.previousFontSize.push(state.currentFontSize);
                next = s;
                state.currentFontSize = next;
            } else if (!s) {
                next = state.previousFontSize.length > 0 ? state.previousFontSize.pop() : Constants.VECTOR_DEFAULTS.FONT_SIZE;
                state.currentFontSize = next;
            }

            // Add fontsize instruction
            if (!same) {
                context.addInstruction(`${VECTOR_IL.FONTSIZE} ${next} ${last}`);
            }
            return context.API;
        },

        /**
         * Get current font size.
         * @returns {number} Current font scaling (size)
         */
        getFontSize: () => {
            return state.currentFontSize;
        },

        setFontSize: (s) => {
            let last = state.currentFontSize;
            let next = Math.max(0, Math.min(s, Constants.VECTOR_DEFAULTS.MAX_FONT_SIZE));
            if (next !== state.currentFontSize) {
                context.addInstruction(`${VECTOR_IL.FONTSIZE} ${next} ${last}`);
            }
            return context.API;
        },
        
        /**
         * Reset font size to defailt size and reset memory stack.
         * @returns {Object} Returns this for chaining
         */
        resetFontSize: () => {
            const prev = state.currentFontSize;
            state.currentFontSize = Constants.VECTOR_DEFAULTS.FONT_SIZE;
            state.previousFontSize = [];
            context.addInstruction(`${VECTOR_IL.FONTSIZE} ${state.currentFontSize} ${prev}`);
            return context.API;
        },
        
        //------------------------------
        // CURSOR MANAGEMENT

        /**
         * Perform a "carriage return", advancing the cursor down one line and resetting the
         * cursor back to the value in index 0 of <code>context.cursorLimits</code>.
         */
        carriageReturn: () => {
            const oldC = context.API.getCursor()
            const newC = {x: state.limits.left, y: state.cursor.y + context.lineHeight};
            context.API.translate(newC.x - oldC.x, newC.y - oldC.y);
            return context.API;
        },

        /**
         * Set the cursor X position
         * @param {number} x - The cursor X position
         */
        cursorX: (x) => {
            state.cursor.x = x;
            return context.API;
        },

        /**
         * Set the cursor Y position
         * @param {number} y - The cursor Y position
         */
        cursorY: (y) => {
            state.cursor.y = y;
            return context.API;
        },

        /**
         * Sets the cursor X & Y simultaneously
         * @param {Object} coordinates 
         * @param {number} coordinates.x - X coordinate in screen space
         * @param {number} coordinates.y - Y coordinate in screen space
         */
        cursor: ({x, y}) => {
            state.cursor.x = x;
            state.cursor.y = y;
            return context.API;
        },

        /**
         * Sets the cursor margins
         * @param {number} left 
         * @param {number} right 
         */
        setCursorMargins: (left, right) => {
            state.limits.left = left;
            state.limits.right = right;
        },

        /**
         * Get the cursor position: {x, y}
         * @returns {Object} x & y - The X and Y position of the cursor
         */
        getCursor: () => {
            return state.cursor;
        },

        /**
         * Moves the cursor relatively along each axis.
         * @param {number} x - Relative X to add to the cursor X
         * @param {number} y - Relative Y to add to the cursor Y
         */
        cursorDelta: (deltaX, deltaY) => {
            state.cursor.x += deltaX;
            state.cursor.y += deltaY;
            return context.API;
        },

        //-----------------------------------------------
        // DRAWING OPERATIONS

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
            
            context.API.polygon(filled, ...vertices)
            return context.API;
        },

        shape: (opaqueId) => {
            context.addInstruction(`${VECTOR_IL.SHAPE} ${opaqueId}`);
            return context.API;
        },

        /**
         * Text rendering method - generates IL instructions for text content with formatting
         * @param {string} text - Text content to render
         * @param {Object} options - Configuration options
         * @param {Array<number>} textSize - After the text is processed this array will be populated with the overall size of the text rendered.
         * @param {string|number} [options.color] - Initial color (hex string or RGB values) (Default: '#000000')
         * @param {number} [options.lineWidth] - Initial line width (default: 1)
         * @param {number} [options.fontsize] - Initial font size (Default: 10)
         * @param {Object} [options.formatting] - Initial formatting states: {bold, italics, underline}
         * @returns {Object} Returns this for chaining
         */
        text(text, options, textSize = [0, 0]) {
            // Validate input
            if (typeof text !== 'string' || text.length === 0) {
                return context.API;
            }

            options = { ...{ formatting: { bold: false, italics: false, underline: false } }, ...options };

            context.API.uniformScale(1.5);

            // set the cursor position from world transform
            const currentWorldTransform = Matrix2d.identity();
            context.API.cursorX(currentWorldTransform.e);
            context.API.cursorY(currentWorldTransform.f);
            context.API.setCursorMargins(currentWorldTransform.e, context.world.width - currentWorldTransform.e);

            // Apply initial color if provided
            if (options.color && options.color !== context.lineColor) {
                if (typeof options.color === 'string') {
                    context.API.color(options.color);
                } else if (typeof options.color === 'number') {
                    const r8 = Math.round(options.color * 255).toString(16).padStart(2, '0');
                    const g8 = Math.round(options.color * 255).toString(16).padStart(2, '0');
                    const b8 = Math.round(options.color * 255).toString(16).padStart(2, '0');
                    context.API.color(`#${r8}${g8}${b8}`);
                }
            }

            // Apply initial font size if provided
            if (options.fontSize)
                context.API.fontSize(options.fontSize);
            
            if (options.lineWidth) 
                context.API.width(options.lineWidth || context.API.getWidth());
            

            if (options.formatting.bold)
                context.API.width(Constants.VECTOR_DEFAULTS.TEXT_BOLD);

            if (options.formatting.italics)
                this.API.skew(-12);

            if (options.formatting.underline) {}
            //     context.addInstruction(`${VECTOR_IL.TOGGLE} UNDERLINE\n`);

            // Process text to generate render instructions
            const result = textParser.parse.call(context, text);
            textSize[0] = result.width;
            textSize[1] = result.height;

            return context.API;
        },

        /**
         * Retrieves the current transform state from the renderer's surface.
         * @returns {Matrix2d} The current transformational state
         */
        getRenderTransform() {
            return new Matrix2d(context.renderer.surface.getTransform());
        },

        /**
         * Get the internal state of the API context
         */
        get state() {
            return state;
        }
    };
}