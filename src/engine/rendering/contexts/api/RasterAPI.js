import Constants from '../../../Constants.js';
import { Matrix2d, Util, $Math } from '../../../core/lib.js';
import { IL as RASTER_IL } from '../../assemblers/IntermediateLanguages.js';
import RasterTextParser from '../../../ui/text/RasterTextParser.js';

/**
 * Create an API reference for the raster context
 * @returns {Object} The high-level raster API
 */
export default function getAPI() {
    const context = this;
    const textParser = RasterTextParser.getInstance(context);

    const state = {
        // Color state - RGB values (0-1 range) with optional alpha
        previousColor: [],
        currentColor: Constants.RASTER_DEFAULTS.LINE_COLOR,
        
        // Width/Line thickness state
        previousWidth: [],
        currentWidth: Constants.RASTER_DEFAULTS.LINE_WIDTH,
        
        // Font state
        previousFont: [],
        currentFont: Constants.RASTER_DEFAULTS.FONT_NAME,
        lastFont: null, 
           
        previousFontSize: [],
        currentFontSize: Constants.RASTER_DEFAULTS.FONT_SIZE,
        lastFontSize: null,

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
        // TRANSFORMATION & MOVEMENT
        
        /**
         * Translate the current transform by X and Y
         * @param {number} x 
         * @param {number} y 
         * @returns {Object} Returns this for chaining
         */
        translate: (x, y) => {
            context.addInstruction(`${RASTER_IL.TRANSLATE} ${x} ${y}`);
            state.currentTransform.translateSelf(x, y);
            return context.API;
        },

        /**
         * Rotate the current transform by angle radians
         * @param {number} angle - Rotation angle in radians
         * @returns {Object} Returns this for chaining
         */
        rotate: (angle) => {
            context.addInstruction(`${RASTER_IL.ROTATE} ${angle}`);
            state.currentTransform.rotateSelf(angle);
            return context.API;
        },

        /**
         * Scale the current transform by X and Y
         * @param {number} x 
         * @param {number} y 
         * @returns {Object} Returns this for chaining
         */
        scale: (x, y = null) => {
            context.addInstruction(`${y === null ? RASTER_IL.USCALE + ' ' + x : RASTER_IL.SCALE + ' ' + x + ' ' + y}`);
            state.currentTransform.scale(x, y === null ? x : y);
            return context.API;
        },

        /**
         * Uniformly scale the transform by a scalar value
         * @param {number} scalar 
         * @returns {Object} Returns this for chaining
         */
        uniformScale: (scalar) => {
            context.addInstruction(`${RASTER_IL.USCALE} ${scalar}`);
            state.currentTransform.uniformScaleSelf(scalar);
            return context.API;
        },

        /**
         * Skew the transform by sX and sY
         * @param {number} sX 
         * @param {number} sY 
         * @returns {Object} Returns this for chaining
         */
        skew: (sX, sY) => {
            context.addInstruction(`${RASTER_IL.SKEW} ${sX} ${sY || 0}`);
            state.currentTransform.skewSelf(sX, sY);
            return context.API;
        },

        /**
         * Apply the transform in he matrix to the current world matrix.
         * @param {Matrix2d} matrix 
         * @returns {Object} Returns this for chaining
         */
        transform: (matrix) => {
            context.addInstruction(`${RASTER_IL.TRANSFORM} ${matrix.toCanvas()}`);
            state.currentTransform = matrix;
            return context.API;
        },

        /**
         * Apply an absolute transform, ignoring the current world matrix.
         * @param {Matrix2d} matrix 
         * @returns {Object} Returns this for chaining
         */
        absTransform: (matrix) => {
            context.addInstruction(`${RASTER_IL.ABS_TRANSFORM} ${matrix.toCanvas()}`);
            state.currentTransform = matrix;
            return context.API;
        },

        /**
         * Save the surface state
         */
        push: () => {
            context.addInstruction(RASTER_IL.PUSH);
            return context.API;
        },

        /**
         * Push the world transformation matrix onto the transform stack. This is useful for applying transformations to the entire scene.
         * @param {Matrix2d} transform - Optional matrix to push. If empty, the current world transform is pushed.
         */
        pushTransform: (tranform) => {
            context.pushTransform(transform);
            state.currentTransform = transform;
            return context.API;
        },

        /**
         * Restore the surface state
         */
        pop: () => {
            context.addInstruction(RASTER_IL.POP);
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
            context.addInstruction(`${RASTER_IL.MOVETO} ${x} ${y}`);
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
                context.addInstruction(`${RASTER_IL.COLOR} ${state.currentColor}`);
            
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
            const c = Util.getColor(r, g, b, a);
            if (c !== state.currentColor) {
                state.currentColor = c;
                context.addInstruction(`${RASTER_IL.COLOR} ${state.currentColor}`)
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
            context.addInstruction(`${RASTER_IL.COLOR} ${state.currentColor}`);
            return context.API;
        },

        /**
         * Set fill color with decorator pattern - tracks previous value. If no values are provided,
         * it will set the fill color to the previous color on the stack, until the stack is empty. Then
         * it will set to the default color.
         * @param {String} fontName - The name of the font
         * @param {number|String} fontSize - The size of the font. Number is treated as 'pixels' 
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
                context.addInstruction(`${RASTER_IL.FONT} ${state.currentFont}`);
            
            return context.API;
        },
        
        /**
         * Get the current font
         * @returns {String} The current font
         */
        getFont: () => {
            return state.currentFont;
        },

        setFont: function (fontName) {
            if (fontName !== state.currentFont) {
                state.currentFont = fontName;
                context.addInstruction(`${RASTER_IL.FONT} ${fontName}`);
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
            context.addInstruction(`${RASTER_IL.FONT} ${fontName}`);
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
                context.addInstruction(`${RASTER_IL.WIDTH} ${state.currentWidth}`);
            
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
                context.addInstruction(`${RASTER_IL.WIDTH} ${w}`);
            }
            return context.API;
        },
        
        /**
         * Reset line width to default width and reset memory stack.
         * @returns {Object} Returns this for chaining
         */
        resetWidth: () => {
            state.currentWidth = Constants.RASTER_DEFAULTS.LINE_WIDTH;
            state.previousWidth = [];
            context.addInstruction(`${RASTER_IL.WIDTH} ${state.currentWidth}`);
            return context.API;
        },
        
        /**
         * Set font size with decorator pattern - tracks previous value.
         * @param {number} s - Font size in pixels. If empty, pops the last font size off the stack
         * @returns {Object} Returns this for chaining
         */
        fontSize: (s) => {
            let same = true;
            if (s && s !== state.currentFontSize) {
                same = false;
                state.previousFontSize.push(state.currentFontSize);
                state.currentFontSize = s;
            } else if (!s) {
                same = false;
                state.currentFontSize = state.previousFontSize.length > 0 ? state.previousFontSize.pop() : Constants.RASTER_DEFAULTS.FONT_SIZE;
            }

            // Add fontsize instruction
            if (!same) {
                context.addInstruction(`${RASTER_IL.FONTSIZE} ${state.currentFontSize}`);
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
            if (s !== state.currentFontSize) {
                context.addInstruction(`${RASTER_IL.FONTSIZE} ${s}`);
            }
            return context.API;
        },
        
        /**
         * Reset font size to defailt size and reset memory stack.
         * @returns {Object} Returns this for chaining
         */
        resetFontSize: () => {
            const prev = state.currentFontSize;
            state.currentFontSize = Constants.RASTER_DEFAULTS.FONT_SIZE;
            state.previousFontSize = [];
            context.addInstruction(`${RASTER_IL.FONTSIZE} ${state.currentFontSize}`);
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
            state.margins.left = left;
            state.margins.right = right;
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
        point: (x, y, round = false) => {
            // Convert to screen coordinates if using world coordinates
            let screenPos = [x, y];
            
            if (context.enableCulling) {
                const screenPosObj = context.worldToScreen(x, y);
                if (screenPosObj && screenPosObj.screen) {
                    screenPos = [screenPosObj.screen.x, screenPosObj.screen.y];
                } else {
                    // Object outside view bounds - skip rendering
                    return context.API;
                }
            }
            
            // Apply rounding or squaring to coordinates
            let pointX = Math.round(screenPos[0]);
            let pointY = Math.round(screenPos[1]);
            
            context.addInstruction(`${RASTER_IL.POINT} ${pointX} ${pointY} ${state.currentWidth} ${round ? 1 : 0} 1`);
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
            
            context.addInstruction(`${RASTER_IL.LINE} ${startScreen[0]} ${startScreen[1]} ${endScreen[0]} ${endScreen[1]}`);
            return context.API;
        },

        //-----------------------------------
        // Sprites & Tiles

        /**
         * Draw a sprite
         * 
         * @param {Sprite} sprite - The sprite to render
         * @param {number} x - The x coordinate
         * @param {number} y - The y coordinate 
         * @returns 
         */
        sprite: (sprite, x, y) => {
            context.addInstruction(`${RASTER_IL.SPRITE} ${sprite.opaqueId} ${x} ${y}`);
            return context.API;
        },

        /**
         * Draw a tile. Tiles are either static, or have animation, but no states.
         * 
         * @param {Number} opaqueId - The Id representing the Tile as returned from the assembler 
         */
        tile: (tile, x, y) => {
            context.addInstruction(`${RASTER_IL.TILE} ${tile.opaqueId} ${x} ${y}`);
            return context.API;
        },

        /**
         * Draws a tilemap. TileMaps are a rectangular grid of proportionally-sized tiles.
         * 
         * @param {Number} opaqueId - The Id representing the TileMap as returned from the assembler
         */
        tileMap: (tileMap, x, y) => {
            context.addInstruction(`${RASTER_IL.TILEMAP} ${tileMap.opaqueId} ${x} ${y}`);
            return context.API;
        },

        /**
         * Text rendering method - generates IL instructions for text content with formatting
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
            const result = textParser.parse(text);
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