import Constants from '../Constants.js';
import { IL as VECTOR_IL } from '../rendering/assemblers/IntermediateLanguages.js';
import CHARACTER_MAP from './vector_character_set.js';
import Context from '../Context.js';
import TextParser from './TextParser.js';

const ctx = Context.getInstance();
const glyphCache = new Map();
const CHARACTER_SPACE = {
    instructions: [],
    width: Constants.VECTOR_DEFAULTS.SPACE_WIDTH,
    height: Constants.VECTOR_DEFAULTS.SPACE_WIDTH,
    charWidth: Constants.VECTOR_DEFAULTS.SPACE_WIDTH,
    charHeight: Constants.VECTOR_DEFAULTS.SPACE_WIDTH,
};
const spaceWidth = Constants.VECTOR_DEFAULTS.SPACE_WIDTH + Constants.VECTOR_DEFAULTS.CHAR_SPACING;
const tabSize = spaceWidth * 2;

/**
 * Class with a static method to parse formatted text and populate the context's
 * rendering instructions for the characters. The context may be bound to either {@link VectorRenderContext} or {@link VectorRenderPart}.
 * If the renderer supports compilation, the text renderer will produce a {@link CompiledShape} for each glyph.
 * @example VectorTextParser.parse.call(renderContext, text);
 * @param {string} text - Text content to process
 * @returns {Array<String>} Array of IL instructions
 */
export default class VectorTextParser extends TextParser {
    static #instance = null;

    static getInstance(renderContext) {
        if (!VectorTextParser.#instance)
            VectorTextParser.#instance = new VectorTextParser(renderContext);
        return VectorTextParser.#instance;
    }

    formatItalics() {
        if (this.isFormatItalics)
            this.renderContext.API.skew(-12);
        else
            this.renderContext.API.skew(12);
    }

    formatBold() {
        if (this.isFormatBold) {
            this.renderContext.API.width(Constants.VECTOR_DEFAULTS.TEXT_BOLD);
        } else {
            this.renderContext.API.width();
        }
    }

    formatUnderline() {
        if (this.isFormatUnderline) {
            console.log('underline on');
                // this.__underline = this.formatting.underline ? this.cursor[0] : this.__underline;
                // if (!this.formatting.underline && this.startUnderline !== null) {
                    // Draw underline from startUnderline to current cursor position
                    //if (ctx.debug) this.addInstruction(`// format: underline ${!this.formatting.underline} (${this.__underline} - ${this.API.cursor[0]})`);
                    // const oldWidth = this.lineWidth;
                    // this.API.width(2);
                    // this.API.line(this.startUnderline, this.cursor[1] + (this.lineHeight * (this.fontSize * 0.14)), this.cursor[0], this.cursor[1] + (this.lineHeight * (this.fontSize * 0.14)));
                    // this.API.width(oldWidth);
                    // this.__underline = null;
                // }
        } else
            console.log('underline off');
    }

    /**
     * Generate instruction for a single character
     * @param {string} char - Character to render
     * @param {string} text - Full text being examined, starting at `char`
     * @param {string} index - The index following `char`
     * @returns {Array} Array of IL instructions for this character
     * @private
     */
    getCharacter(char, text, index) {

        // determine if there are trailing spaces, and how many
        // to reduce the number of times we emit TRANSLATE instructions
        let consecutiveTrailingSpaces = 0;
        if (text[index] === ' ') {
            consecutiveTrailingSpaces = /( +)/.exec(text.substring(index))[0].length;
        }
        
        // Get character instructions from vector.js
        let ci = this.#getCharacterInstructions(char);

        if (!ci) {
            // Character not in set (e.g., lowercase letters), skip or use fallback
            return;
        }

        // Add character instructions
        if (ctx.debug) {
            this.renderContext.addInstruction(`// CHAR: "${char === ' ' ? '[SPACE]' : char}"`);
            // context.API
            //     .setColor("#000")
            //     .setWidth(1)
            //     .rectangle(-ci.halfWidth, -ci.halfHeight, 
            //                 ci.width - ci.halfWidth, ci.height - ci.halfHeight);
        }

        if (char !== ' ') {
            if (this.renderContext.renderer.hasCompiler) {
                if (!glyphCache.has(char)) {
                    // Compile the character shape and store in cache
                    if (char !== ' ') {
                        const shapeId = this.renderContext.renderer.getCompiledShape(ci.instructions, `CHAR '${char}'`);
                        glyphCache.set(char, shapeId);
                        this.renderContext.addInstruction(`${VECTOR_IL.SHAPE} ${shapeId}`);
                    }
                } else {
                    this.renderContext.addInstruction(`${VECTOR_IL.SHAPE} ${glyphCache.get(char)}`);
                }
            } else {
                ci.instructions.forEach(inst => {
                    this.renderContext.addInstruction(inst);
                });
            }
        } else {
            consecutiveTrailingSpaces = 1;
        }

        // bundle consecutive trailing spaces as one giant leap
        this.renderContext.API.translate(ci.charWidth + (consecutiveTrailingSpaces * spaceWidth) + this.renderContext.letterSpacing, 0);
        this.renderContext.API.cursorDelta(ci.charWidth + (consecutiveTrailingSpaces * spaceWidth) + this.renderContext.letterSpacing, 0);

        // keep this immutable
        if (ci === CHARACTER_SPACE) {
            ci = { ...CHARACTER_SPACE };
        }
        
        // number of trailing spaces to jump ahead in the parser
        ci.trailingSpaces = consecutiveTrailingSpaces;
        return ci;
    }

    /**
     * Get character instruction from vector.js character set
     * @param {string} char - Character code (0x20-0x7F printable range)
     * @param {number} width - Cursor advancement width
     * @returns {Object|null} Instructions for character or null if not found
     * @private
     */
    #getCharacterInstructions(char) {
        const minMax = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

        // if (this.config.text.forceUpperCase)
        //    char = char.toUpperCase();

        // Convert char to ASCII code
        const ascii = char.charCodeAt(0);

        // Check bounds (printable ASCII: 32-127, but we have specific chars in vector.js)
        if (ascii < 32 || ascii > 122) {
            return null;
        }

        if (ascii === 32) {
            return CHARACTER_SPACE;    
        }

        // Check character set array
        if (CHARACTER_MAP[ascii]) {
            // Convert relative coordinates to absolute (center is 0,0)
            let instructions = [];
            const points = CHARACTER_MAP[ascii];
            let first = true;

            if (points.length === 0) {
                return null;
            }

            // calculate the character box
            for (let j = 0; j < points.length; j++) {
                if (points[j] !== null) {
                    const scaledPoints = [points[j][0], points[j][1]];
                    minMax[0] = scaledPoints[0] < minMax[0] ? scaledPoints[0] : minMax[0];  // min X
                    minMax[1] = scaledPoints[0] > minMax[1] ? scaledPoints[0] : minMax[1];  // max X
                    minMax[2] = scaledPoints[1] < minMax[2] ? scaledPoints[1] : minMax[2];  // min Y
                    minMax[3] = scaledPoints[1] > minMax[3] ? scaledPoints[1] : minMax[3];  // max Y
                }
            }

            // make positive for width and height calculations
            minMax[0] += 5;
            minMax[1] += 5;
            minMax[2] += 5;
            minMax[3] += 5;

            const charWidth = minMax[1] - minMax[0];
            const halfWidth = Math.round(charWidth * 0.5);
            const charHeight = minMax[3] - minMax[2];
            const halfHeight = Math.round(charHeight * 0.5);

            if (ctx.debug && ctx.debugOpts.charOrigin)
                instructions.push(`${VECTOR_IL.POINT} 0 0`);

            instructions.push(VECTOR_IL.PUSH);
            instructions.push(`${VECTOR_IL.TRANSLATE} 0 -10`);
            instructions.push(`${VECTOR_IL.LINESEG} 0`);
            for (let j = 0; j < points.length; j++) {
                const point = points[j];
                const next = j+1 < points.length ? points[j + 1] : [0,0];

                if (point === null) {
                    // End of line segment
                    instructions.push(VECTOR_IL.ENDSEG);
                    instructions.push(`${VECTOR_IL.LINESEG} 0`);
                    first = true;    
                    continue;
                }

                const [x, y] = [halfWidth + point[0], halfHeight + point[1]];
                
                if (first) {                
                    // Add first 2 points with initial line instruction
                    const [ex, ey] = next != null ? [next[0] + halfWidth, next[1] + halfHeight] : [0,0];
                    instructions.push(`${VECTOR_IL.LINE} ${x} ${y} ${ex} ${ey}`); // Invert Y for screen coordinates
                    first = false;
                    j++;
                } else {
                    instructions.push(`${VECTOR_IL.LINEREL} ${x} ${y}`);
                }
            }
            instructions.push(VECTOR_IL.ENDSEG);
            instructions.push(VECTOR_IL.POP);

            return {
                instructions: instructions,
                charWidth: charWidth + Constants.VECTOR_DEFAULTS.CHAR_SPACING,
                width: charWidth + Constants.VECTOR_DEFAULTS.CHAR_SPACING * this.renderContext.API.state.currentFontSize,
                charHeight: charHeight,
                height: charHeight * this.renderContext.API.state.currentFontSize,
                halfWidth: halfWidth,
                halfHeight: halfHeight
            };
        }

        return null;
    }
}


