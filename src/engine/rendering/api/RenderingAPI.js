import Constants from '../../Constants.js';
import { Matrix2d } from '../../core/Matrix.js';
import Util from '../../core/Util.js';
import $Math from '../../core/Math.js';
import IL from '../assemblers/IntermediateLanguages.js';
import VectorTextParser from '../../ui/text/VectorTextParser.js';
import RasterTextParser from '../../ui/text/RasterTextParser.js';

/**
 * @returns {Object} Returns the high-level API methods for vector drawing.
 */
export default function getAPI() {
    const context = this;
    const textParsers = {
        vector: VectorTextParser.getInstance(context),
        raster: RasterTextParser.getInstance(context)
    };

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

        // Font state
        previousFont: [],
        currentFont: Constants.RASTER_DEFAULTS.FONT_NAME,
        lastFont: null, 

        // Font style state
        fontStyle: { ...Constants.RASTER_DEFAULTS.FONT_STYLE },
        previousFontStyle: [],
        currentFontStyle: { ...Constants.RASTER_DEFAULTS.FONT_STYLE },

        // Transform state
        currentTransform: Matrix2d.identity(),
        
        // raster ops
        raster: {
            scale: [1, 1]
        },

        // Text cursor state
        cursor: {
            x: 0,
            y: 0
        },

        margins: {
            left: 0,
            right: 0
        }
    };
    
    return {
        //-----------------------------------------------
        systemText(str) {
            context.addInstruction(`${IL.SYSTEXT} ${str}`);
            return context.API;
        },

        //-----------------------------------------------
        // TRANSFORMATION & MOVEMENT
        
        /**
         * Translate the current transform by X and Y
         * @param {number} x 
         * @param {number} y 
         * @returns {Object} Returns this for chaining
         */
        translate: (x, y) => {
            context.addInstruction(`${IL.TRANSLATE} ${x} ${y}`);
            state.currentTransform.translateSelf(x, y);
            return context.API;
        },

        /**
         * Rotate the current transform by angle radians
         * @param {number} angle - Rotation angle in radians
         * @returns {Object} Returns this for chaining
         */
        rotate: (angle) => {
            context.addInstruction(`${_IL.ROTATE} ${angle}`);
            state.currentTransform.rotateSelf(angle);
            return context.API;
        },

        /**
         * Scale the current transform by X and Y
         * @param {number} x 
         * @param {number} y 
         * @returns {Object} Returns this for chaining
         */
        scale: (x, y) => {
            context.addInstruction(`${x === y ? IL.USCALE + ' ' + x : IL.SCALE + ' ' + x + ' ' + y}`);
            state.currentTransform.scaleSelf(x, y);
            return context.API;
        },

        /**
         * (RASTER) Scale the current transform by X and Y
         * @param {number} x 
         * @param {number} y 
         * @returns {Object} Returns this for chaining
         */
        rasterScale: (x, y) => {
            context.addInstruction(`${x === y ? IL.RSCALEU + ' ' + x : IL.RSCALE + ' ' + x + ' ' + y}`);
            state.currentTransform.scale(x, y);
            return context.API;
        },


        /**
         * Uniformly scale the transform by a scalar value
         * @param {number} scalar 
         * @returns {Object} Returns this for chaining
         */
        uniformScale: (scalar) => {
            context.addInstruction(`${IL.USCALE} ${scalar}`);
            state.currentTransform.scale(scalar, scalar);
            return context.API;
        },

        /**
         * Uniformly scale the transform by a scalar value
         * @param {number} scalar 
         * @returns {Object} Returns this for chaining
         */
        rasterUniformScale: (scalar) => {
            context.addInstruction(`${IL.RSCALEU} ${scalar}`);
            state.currentTransform.uniformScale(scalar, scalar);
            return context.API;
        },

        /**
         * Skew the transform by sX and sY
         * @param {number} sX 
         * @param {number} sY 
         * @returns {Object} Returns this for chaining
         */
        skew: (sX, sY) => {
            context.addInstruction(`${IL.SKEW} ${sX} ${sY || 0}`);
            state.currentTransform.skewSelf(sX, sY);
            return context.API;
        },

        /**
         * Apply the transform in he matrix to the current world matrix.
         * @param {Matrix2d} matrix 
         * @returns {Object} Returns this for chaining
         */
        transform: (matrix) => {
            context.addInstruction(`${IL.TRANSFORM} ${matrix.toCanvas()}`);
            state.currentTransform = matrix;
            return context.API;
        },

        /**
         * Apply an absolute transform, ignoring the current world matrix.
         * @param {Matrix2d} matrix 
         * @returns {Object} Returns this for chaining
         */
        absTransform: (matrix) => {
            context.addInstruction(`${IL.ABS_TRANSFORM} ${matrix.toCanvas()}`);
            state.currentTransform = matrix;
            return context.API;
        },

        /**
         * Save the surface state
         */
        push: () => {
            context.addInstruction(IL.PUSH);
            return context.API;
        },

        /**
         * Push the world transformation matrix onto the transform stack. This is useful for applying transformations to the entire scene.
         * @param {Matrix2d} transform - Optional matrix to push. If empty, the current world transform is pushed.
         */
        pushTransform: (transform) => {
            context.pushTransform(transform);
            state.currentTransform = transform;
            return context.API;
        },

        /**
         * Restore the surface state
         */
        pop: () => {
            context.addInstruction(IL.POP);
            return context.API;
        },

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
            state.currentTransform = Matrix2d.identity();
            return context.API;
        },

        /**
         * Move the drawing position to X and Y coordinates.
         * @param {number} x - The X coordinate
         * @param {number} y - The Y coodinate
         * @returns {Object} Returns this for chaining
         */
        moveTo: (x, y) => {
            context.addInstruction(`${IL.MOVETO} ${x} ${y}`);
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
            const c = Util.getColor(r, g, b, a);
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
                context.addInstruction(`${IL.COLOR} ${state.currentColor}`);
            
            return context.API;
        },

        /**
         * Get the current context color
         * @returns {String} The current context color
         */
        getColor: () => {
            return state.currentColor;
        },

        /**
         * Set the current line (stroke) color, overriding the value on the stack and
         * not modifying the stack.
         * @param {number|String} r - Color name or red component
         * @param {number} g - Green component
         * @param {number} b - Blue component
         * @param {number} a - Alpha component
         * @returns {Object} Returns this for chaining
         */
        setColor: (r, g = null, b = null, a = 1) => {
            const c = Util.getColor(r, g, b, a);
            if (c !== state.currentColor) {
                state.currentColor = c;
                context.addInstruction(`${IL.COLOR} ${state.currentColor}`)
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
            context.addInstruction(`${IL.COLOR} ${state.currentColor}`);
            return context.API;
        },

        /**
         * Set fill color with decorator pattern - tracks previous value. If no values are provided,
         * it will set the fill color to the previous color on the stack, until the stack is empty. Then
         * it will set to the default color.
         * @param {number|string} r - Red value (0-1) or CSS color string E.g. "#da7d12"
         * @param {number|string} g - Green value (0-1) 
         * @param {number|string} b - Red value (0-1)
         * @param {number|string} a - Alpha value (0-1)
         * @returns {Object} Returns this for chaining
         */
        fillColor: (r, g = null, b = null, a = 1) => {
            const f = Util.getColor(r, g, b, a);
            let same = false;
            if (f) {
                if (f === state.currentFillColor) same = true;
                state.previousFillColor.push(state.currentFillColor);
                state.currentFillColor = f;
            } else if (!f) {
                state.currentFillColor = state.previousFillColor.length > 0 ? state.previousFillColor.pop() : Constants.VECTOR_DEFAULTS.DEFAULT_FILL_COLOR;
            }

            if (!same)
                context.addInstruction(`${IL.FILL} ${state.currentFillColor}`);
            
            return context.API;
        },
        
        /**
         * Get the current fill color
         * @returns {String} The current fill color
         */
        getFillColor: () => {
            return state.currentFillColor;
        },

        /**
         * Set the fill color, overriding the value on the stack and
         * not modifying the stack.
         * @param {number|String} r - Color string or red component
         * @param {number} g - Green component
         * @param {number} b - Blue component
         * @param {number} a - Alpha component
         * @returns {Object} This for chaining
         */
        setFillColor: (r, g = null, b = null, a = 1) => {
            const f = Util.getColor(r, g, b, a);
            if (f !== state.currentFillColor) {
                state.currentFillColor = f;
                context.addInstruction(`${IL.FILL} ${f}`);
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
            context.addInstruction(`${IL.FILL} ${state.currentFillColor}`);
            return context.API;
        },

        /**
         * Set the raster font name - tracks previous value. If no values are provided,
         * it will set the font name to the previous name on the stack, until the stack is empty. Then
         * it will set to the default font name.
         * @param {String} fontName - The name of the font
         * @returns {Object} Returns this for chaining
         */
        font: (fontName) => {
            let same = false;
            if (fontName) {
                if (fontName === state.currentFont) same = true;
                state.previousFont.push(state.currentFont);
                state.currentFont = fontName;
            } else if (!fontName) {
                state.currentFont = state.previousFont.length > 0 ? state.previousFont.pop() : Constants.RASTER_DEFAULTS.FONT_NAME;
            }

            if (!same)
                context.addInstruction(`${IL.FONT} ${state.currentFont}`);
            
            return context.API;
        },
        
        /**
         * Get the current font
         * @returns {String} The current font
         */
        getFont: () => {
            return state.currentFont;
        },

        /**
         * Set the raster font name, overriding the value on the stack and
         * not modifying the stack.
         * @param {String} fontName - The font name
         * @returns {Object} This for chaining
         */
        setFont: function (fontName) {
            if (fontName !== state.currentFont) {
                state.currentFont = fontName;
                context.addInstruction(`${IL.FONT} ${fontName}`);
            }
            return context.API;
        },
        
        /**
         * Reset fill color to default color and reset memory stack.
         * @returns {Object} Returns this for chaining
         */
        resetFont: () => {
            state.currentFont = Constants.RASTER_DEFAULTS.FONT_NAME;
            state.previousFont = [];
            context.addInstruction(`${IL.FONT} ${fontName}`);
            return context.API;
        },        

        /**
         * Set line (stroke) width with decorator pattern - tracks previous value.
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
                context.addInstruction(`${IL.WIDTH} ${state.currentWidth}`);
            
            return context.API;
        },

        /**
         * Get the current line (stroke) width
         * @returns {number} The line width
         */
        getWidth: () => {
            return state.currentWidth;
        },

        /**
         * Set the current line (stroke) width, overriding the value on the stack and
         * not modifying the stack.
         * @param {number} w 
         * @returns {Object} This for chaining
         */
        setWidth: (w) => {
            if (w !== state.currenWidth) {
                state.currentWidth = w;
                context.addInstruction(`${IL.WIDTH} ${w}`);
            }
            return context.API;
        },
        
        /**
         * Reset line (strok) width to default width and reset memory stack.
         * @returns {Object} Returns this for chaining
         */
        resetWidth: () => {
            state.currentWidth = Constants.VECTOR_DEFAULTS.LINE_WIDTH;
            state.previousWidth = [];
            context.addInstruction(`${IL.WIDTH} ${state.currentWidth}`);
            return context.API;
        },
        
        /**
         * Set font size with decorator pattern - tracks previous value.
         * @param {number} size - Font size in pixels. If empty, pops the last font size off the stack
         * @returns {Object} Returns this for chaining
         */
        fontSize: (size) => {
            let same = false;
            let last = state.currentFontSize;
            let next = Math.max(0, Math.min(size, Constants.VECTOR_DEFAULTS.MAX_FONT_SIZE));
            if (size && size > 0 && size <= Constants.VECTOR_DEFAULTS.MAX_FONT_SIZE) {
                if (size === state.currentFontSize) same = true;
                state.previousFontSize.push(state.currentFontSize);
                next = size;
                state.currentFontSize = next;
            } else if (!size) {
                next = state.previousFontSize.length > 0 ? state.previousFontSize.pop() : Constants.VECTOR_DEFAULTS.FONT_SIZE;
                state.currentFontSize = next;
            }

            // Add fontsize instruction
            if (!same) {
                context.addInstruction(`${IL.FONTSIZE} ${next} ${last}`);
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

        /**
         * Set the font size, overriding the value on the stack and
         * not modifying the stack.
         * @param {number} s - The font size
         * @returns 
         */
        setFontSize: (s) => {
            let last = state.currentFontSize;
            let next = Math.max(0, Math.min(s, Constants.VECTOR_DEFAULTS.MAX_FONT_SIZE));
            if (next !== state.currentFontSize) {
                context.addInstruction(`${IL.FONTSIZE} ${next} ${last}`);
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
            context.addInstruction(`${IL.FONTSIZE} ${state.currentFontSize} ${prev}`);
            return context.API;
        },
        
        //------------------------------
        // CURSOR MANAGEMENT

        /**
         * Perform a "carriage return", advancing the cursor down one line and resetting the
         * cursor back to the value in index 0 of <code>context.cursorLimits</code>.
         * @returns {Object} This for chaining
         */
        carriageReturn: () => {
            const oldC = context.API.getCursor()
            const newC = [state.margins.left, state.cursor.y + context.lineHeight];
            context.API.translate(newC[0] - oldC.x, newC[1] - oldC.y);
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
         * @param {number} x - X coordinate in screen space
         * @param {number} y - Y coordinate in screen space
         */
        cursor: (x, y) => {
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
            state.margins.left = left;
            state.margins.right = right;
        },

        /**
         * Get the cursor position: [x, y]
         * @returns {Array<number>} The X and Y position of the cursor
         */
        getCursor: () => {
            return state.cursor;
        },

        /**
         * Moves the cursor relatively along each axis.
         * @param {number} deltaX - Relative X to add to the cursor X
         * @param {number} deltaY - Relative Y to add to the cursor Y
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
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @param {boolean} round - `true` draws the point as a circle, `false` (default) as a rectangle.
         * @returns {Object} Returns this for chaining
         */
        point: (x, y, round = false) => {
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
            
            context.addInstruction(`${IL.POINT} ${pointX} ${pointY} ${state.currentWidth} ${round ? 1 : 0}`);
            return context.API;
        },
        
        /**
         * Draw a line between two points (absolute coordinates)
         * @param {number} x - X coordinate for the start point in screen/world space
         * @param {number} y - Y coordinate for the start point in screen/world space
         * @param {number} eX - X coordinate for the end point in screen/world space
         * @param {number} eY - Y coordinate for the end point in screen/world space
         * @returns {Object} Returns this for chaining
         */
        line: (x, y, eX, ey) => {
            // Convert to screen coordinates if using world coordinates
            let startScreen = [x, y];
            let endScreen = [eX, ey];
            
            if (context.enableCulling) {
                const startObj = context.worldToScreen(x, y);
                const endObj = context.worldToScreen(eX, ey);
                
                if (startObj && endObj) {
                    startScreen = startObj;
                    endScreen = endObj;
                } else {
                    // Start or end point outside view bounds - should we clamp to the boundary?
                    return context.API;
                }
            }
            
            context.addInstruction(`${IL.LINE} ${startScreen[0]} ${startScreen[1]} ${endScreen[0]} ${endScreen[1]}`);
            return context.API;
        },

        /**
         * Draw a line segment, starting at the end of the last drawing operation.
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

            context.addInstruction(`${IL.LINEREL} ${startScreen[0]} ${startScreen[1]}`);
            return context.API;
        },
        
        /**
         * Draw a line segment container for grouped lines
         * @param {boolean} filled - Closed line segment will be filled with fill color
         * @param {number} x - The starting X coordinate for the line segment
         * @param {number} y - The starting Y coordinate for the line segment
         * @param {...Array<number>} coords - Points in screen/world space
         * @returns {Object} Returns this for chaining
         */
        lineSegment: (filled, x, y, ... coords) => {
            context.addInstruction(`${IL.LINESEG} ${filled ? '1' : '0'}`);
            
            // first line of segment
            const lineTo = coords.shift();
            context.API.line(x, y, lineTo[0], lineTo[1]);

            // run out the remainder of the coordinates in the line segment
            for (let rel of coords) {
                context.API.lineRel(rel[0], rel[1]);
            }
            
            context.addInstruction(`${IL.ENDSEG}`);
            return context.API;
        },

        /**
         * Helper generates the appropriate structure for **Quadratic curves**
         * to use with the {@link #curve} method.
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
         * Helper generates the appropriate structure for **Bezier curves**
         * to use with the {@link #curve} method.
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
         * @param {number} x - The starting X coordinate of the curve 
         * @param {number} y - The starting Y coordinate of the curve 
         * @param  {...any} coords - The remaining coordinates of the curve expressed as 
         *                           either 4-element (quadratic) or 6-element (bezier) arrays
         *                           using the two helper methods.
         * @returns {Object} Returns the API for chaining
         */
        curve: (filled, x, y, ... coords) => {
            context.addInstruction(`${IL.CURVE} ${filled ? '1' : '0'} ${x} ${y}`);
            
            // the rest of the coordinates need to be either 4 coordinates (quadratic) or 6 coordinates (bezier)
            for (let rel of coords) {
                if (rel.length === 4) {
                    context.addInstruction(`${IL.QUAD} ${rel[0]} ${rel[1]} ${rel[2]} ${rel[3]}`)
                } else if (rel.length === 6) {
                    context.addInstruction(`${IL.BEZIER} ${rel[0]} ${rel[1]} ${rel[2]} ${rel[3]} ${rel[4]} ${rel[5]} ${rel[6]}`);
                } else {
                    throw new RenderContextError(this, "Invalid number of coordinates for a curve (4 or 6)");
                }
            }
            
            context.addInstruction(`${IL.ENDCURVE}`);
            return context.API;
        },
        
        /**
         * Draw an arc (ellipse), or arc segment.
         * @param {number} cx - Center X coordinate in screen space
         * @param {number} cy - Center Y coordinate in screen space
         * @param {number} rX - X radius of the ellipse
         * @param {number} rY - Y radius of the ellipse
         * @param {number} startAngle - Starting angle in radians (0 = 3 o'clock)
         * @param {number} endAngle - Ending angle in radians
         * @param {boolean} filled - filled arc
         * @returns {Object} Returns this for chaining
         */
        arc: (cx, cy, rX, rY, startAngle = 0, endAngle = $Math.TWO_PI, filled = false) => {
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

            context.addInstruction(`${IL.ARC} ${center[0]} ${center[1]} ${rX} ${rY} ${startAngle} ${endAngle} ${filled ? 1 : 0}`);
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
            return context.API.arc(cx, cy, rX, rY, 0, $Math.TWO_PI, filled);
        },

        /**
         * Draw a circle
         * @param {number} cx - Center X coordinate in screen space
         * @param {number} cy - Center Y coordinate in screen space
         * @param {number} r - Radius of the arc
         * @returns {Object} Returns this for chaining
         */
        circle: (cx, cy, r, filled) => {
            return context.API.arc(cx, cy, r, r, 0, $Math.TWO_PI, filled);
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
            context.API.lineSegment(filled, x1, y1,
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
         * @param {...Array<number>} vertices - Array of [x, y] vertex coordinates
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
            context.API.lineSegment(filled, firstVertex[0], firstVertex[1], ...restVertices);
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

        //-----------------------------------
        // Complex types

        /**
         * Render a compiled vector shape to the context.
         * @param {number} opaqueId - The shape opaque Id returned from the Assembler
         * @returns 
         */
        shape: (opaqueId) => {
            context.addInstruction(`${IL.SHAPE} ${opaqueId}`);
            return context.API;
        },

        /**
         * Draw a sprite
         * 
         * @param {Sprite} sprite - The sprite to render
         * @param {number} x - The x coordinate
         * @param {number} y - The y coordinate 
         * @returns 
         */
        sprite: (sprite, x, y) => {
            context.addInstruction(`${IL.SPRITE} ${sprite.opaqueId} ${x} ${y}`);
            return context.API;
        },

        /**
         * Draw a tile. Tiles are either static, or have animation, but no states.
         * 
         * @param {Number} opaqueId - The Id representing the Tile as returned from the assembler 
         */
        tile: (tile, x, y) => {
            context.addInstruction(`${IL.TILE} ${tile.opaqueId} ${x} ${y}`);
            return context.API;
        },

        /**
         * Draws a tilemap. TileMaps are a rectangular grid of proportionally-sized tiles.
         * 
         * @param {Number} opaqueId - The Id representing the TileMap as returned from the assembler
         */
        tileMap: (tileMap, x, y) => {
            context.addInstruction(`${IL.TILEMAP} ${tileMap.opaqueId} ${x} ${y}`);
            return context.API;
        },

        /**
         * Vector text rendering. Uses internal line drawing methods to generate a vector-style
         * font. Supports various formatting options and colorizing.
         * @param {string} text - Text content to render
         * @param {Object} options - Configuration options
         * @param {Array<number>} textSize - After the text is processed this array will be populated with the overall size of the text rendered.
         * @param {string|number} [options.color] - Initial color (hex string or RGB values) (Default: '#000000')
         * @param {number} [options.lineWidth] - Initial line width (default: 1)
         * @param {number} [options.fontsize] - Initial font size (Default: 10)
         * @param {Object} [options.formatting] - Initial formatting states: {bold, italics, underline}
         * @returns {Object} Returns this for chaining
         */
        vecText(text, options, textSize = [0, 0]) {
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
            const result = textParsers.vector.parse(text);
            textSize[0] = result.width;
            textSize[1] = result.height;

            return context.API;
        },

        /**
         * Raster text rendering. This uses the native surface (Canvas, WebGL, SVG) text rendering.
         * @param {string} text - Text content to render
         * @param {Object} style - Text styling options
         * @returns {Object} Returns this for chaining
         */
        text(text, style = {}) {
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
            const result = textParsers.raster.parse(text);
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