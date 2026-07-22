import Constants from '../Constants.js';
import { VECTOR_IL } from '../rendering/assemblers/IntermediateLanguages.js';
import CHARACTER_MAP from './vector_character_set.js';
import { RenderContextError } from '../rendering/contexts/RenderContext.js';
import { Matrix2d } from '../core/Matrix.js';
import Context from '../Context.js';

// get the engine context
const ctx = Context.getInstance();
const glyphCache = new Map();

function getWord(text, idx) {
    let check = text.substring(idx);
    const headBrace = check.indexOf('{', 1);
    const tailBrace = check.indexOf('}', 1);

    if ((headBrace > -1 && tailBrace > -1 && tailBrace < headBrace) || (headBrace === -1 && tailBrace > -1)) {
        // return without the trailing brace
        return text.substring(idx, idx + tailBrace);
    }

    throw new RenderContextError(this, `Unmatched '{' in text at index ${idx}: ${text}`);
}

/**
 * Method to process text content with formatting markers into rendering instructions.
 * @param {string} text - Text content to process
 * @param {number} spaceWidth - The size of a space character (default: 45);
 * @returns {Array} Array of IL instructions
 */
export default function processText(text) {
    let textWidth = 0, totalTextWidth = 0;
    let lineHeight = 0, totalTextHeight = 0;

    // Parse and process each character in the text
    let i = 0;
    while (i < text.length) {
        const char = text[i];
        
        if (char === '\n') {
            this.API.carriageReturn();
            if (textWidth > totalTextWidth) {
                totalTextWidth = textWidth;
            }
            textWidth = 0;
            totalTextHeight += lineHeight;
            lineHeight = 0;
            i += 1;
            continue;
        }

        // char instruction for calculating text width
        let ci = null;

        // Handle escape sequences
        if (char === '\\') {
            const nextChar = text[i + 1];
            if (nextChar !== undefined) {
                switch (nextChar) {
                case '*':
                    ci = characterInstruction.call(this, '*');
                    i += 2;
                    break;
                case '{':
                    ci = characterInstruction.call(this, '{');
                    i += 2;
                    break;
                case '_':
                    ci = characterInstruction.call(this, '_');
                    i += 2;
                    break;
                case '~':
                    ci = characterInstruction.call(this, '~');
                    i += 2;
                    break;
                case '\\':
                    ci = characterInstruction.call(this, '\\');
                    i += 2;
                    break;
                default:
                    // Not an escape sequence, treat as regular character
                    ci = characterInstruction.call(this, char);
                    i++;
                    break;
                }
            } else {
                // Trailing backslash, treat as regular character
                ci = characterInstruction.call(this, '\\');
                i++;
            }
            
            continue;
        }

        // Handle formatting markers
        if (char === '{') {
            const nextChar = text[i + 1];
            let markerType = '';
            
            if (nextChar === '!') {
                let op = text[i + 2];
                let reset = false;
                if (op === '!') {
                    reset = true;
                    op = text[i + 3];
                }
                switch (op) {
                    case 'z': 
                        reset ? this.API.resetFontSize() : this.API.fontSize();
                        break;
                    case 'f':
                        reset ? this.API.resetFillColor() : this.API.fillColor();
                        break;
                    case 'c':
                        reset ? this.API.resetColor() : this.API.color();
                        break;
                    case 'w':
                        reset ? this.API.resetWidth() : this.API.width();
                        break;
                }
                i += reset ? 5 : 4;
            } else if (nextChar !== '#' && ((isNaN(nextChar) && (nextChar === '+' || nextChar === '-')) || !isNaN(nextChar))) {
                const sign = nextChar === '+' ? 1 : nextChar === '-' ? -1 : 0;
                // Font size marker - next character
                if (nextChar === '}') {
                    // pop to the last font size
                    this.API.fontSize();
                    i += 2;
                } else {
                    // get the font size
                    const currentSize = this.API.getFontSize();
                    let j = i + 2;
                    let foundBracket = false;
                    while (j < text.length && !foundBracket) {
                        if (text[j] === '}') {
                            const scalar = parseFloat(text.substring(i + (sign !== 0 ? 2 : 1), j).trim()) || 0;
                            this.API.fontSize(sign === 0 ? scalar : currentSize + (scalar * sign));
                            break;
                        }
                        j++;
                    }
                    i = j + 1;
                }
                continue;
            } else if (nextChar === '#') {
                // Color name - hex color
                const colorHex = getWord.call(this, text, i).substr(1).trim();
                this.API.color(colorHex);
                i += colorHex.length + 2;
            } else if (nextChar !== undefined) {
                // Color name - remove the { - may need to remove the training } as well??
                const colorName = getWord.call(this, text, i).substr(1).trim();
                this.API.color(colorName);
                i += colorName.length + 2;
            }
            continue;
        }

        // Handle italic marker (single underscore)
        if (char === '_') {
            this.formatting.italics = !this.formatting.italics;
            if (ctx.debug) this.addInstruction(`// format: italics (${this.formatting.italics})`);
            if (this.formatting.italics) {
                this.API.skew(-12);
            } else {
                this.API.skew(0);
            }
            i++;
            continue;
        }
        
        // Handle bold marker
        if (char === '*' && text[i + 1] === '*') {
            this.formatting.bold = !this.formatting.bold;
            let oldWidth = this.API.getWidth();
            if (ctx.debug) this.addInstruction(`// format: bold (${this.formatting.bold})`);
            if (this.formatting.bold) {
                this.API.width(Constants.VECTOR_DEFAULTS.TEXT_BOLD);
            } else {
                this.API.width(oldWidth);
            }
            i += 2;
            continue;
        }
        
        // Handle underline marker
        if (char === '~') {
            this.formatting.underline = !this.formatting.underline;
            this.__underline = this.formatting.underline ? this.cursor[0] : this.__underline;
            if (!this.formatting.underline && this.startUnderline !== null) {
                // Draw underline from startUnderline to current cursor position
                //if (ctx.debug) this.addInstruction(`// format: underline ${!this.formatting.underline} (${this.__underline} - ${this.API.cursor[0]})`);
                // const oldWidth = this.lineWidth;
                // this.API.width(2);
                // this.API.line(this.startUnderline, this.cursor[1] + (this.lineHeight * (this.fontSize * 0.14)), this.cursor[0], this.cursor[1] + (this.lineHeight * (this.fontSize * 0.14)));
                // this.API.width(oldWidth);
                // this.__underline = null;
            }
            i++;
            continue;
        }
            
        // Regular character - emit instruction
        ci = characterInstruction.call(this, char);

        // Calculate overall width and height
        textWidth += ci.width;
        lineHeight = Math.max(lineHeight, ci.height);
        i++;
    }
    return { 
        width: totalTextWidth !== 0 ? totalTextWidth : textWidth, 
        height: totalTextHeight !== 0 ? totalTextHeight : lineHeight 
    };
}

/**
 * Generate instruction for a single character
 * @param {string} char - Character to render
 * @param {number} width - Cursor advancement width
 * @returns {Array} Array of IL instructions for this character
 * @private
 */
function characterInstruction(char, width) {
    // until we have lowercase characters
    char = char.toUpperCase();
    
    // Get character instructions from vector.js
    const ci = getCharacterInstructions.call(this, char);

    if (!ci || !ci.instructions) {
        // Character not in set (e.g., lowercase letters), skip or use fallback
        return;
    }

    // Add character instructions
    const context = this;
    if (ctx.debug) {
        context.addInstruction(`// CHAR: ${char === ' ' ? 'SPACE' : char}`);
        context.API.color("#000").width(1).rectangle(-ci.halfWidth, -ci.halfHeight, ci.width - ci.halfWidth, ci.height - ci.halfHeight).color().width();
    }

    if (context.renderer.hasCompiler) {
        if (!glyphCache.has(char)) {
            // Compile the character shape and store in cache
            const shapeId = context.renderer.getCompiledShape(ci.instructions, `CHAR '${char}'`);
            if (shapeId !== Constants.COMPILATION.FAILED) {
                glyphCache.set(char, shapeId);
                context.addInstruction(`${VECTOR_IL.SHAPE} ${shapeId}`);
            }
        } else {
            context.addInstruction(`${VECTOR_IL.SHAPE} ${glyphCache.get(char)}`);
        }
    } else {
        ci.instructions.forEach(inst => {
            context.addInstruction(inst);
        });
    }
    context.API.translate(ci.charWidth + context.letterSpacing, 0);
    context.API.cursorDelta(ci.charWidth + context.letterSpacing, 0);
    return ci;
}

/**
 * Get character instruction from vector.js character set
 * @param {string} char - Character code (0x20-0x7F printable range)
 * @param {number} width - Cursor advancement width
 * @returns {Object|null} Instructions for character or null if not found
 * @private
 */
function getCharacterInstructions(char) {
    const minMax = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

    // currently only supports upper case characters
    char = char.toUpperCase();

    // Convert char to ASCII code
    const ascii = char.charCodeAt(0);

    // Check bounds (printable ASCII: 32-127, but we have specific chars in vector.js)
    if (ascii < 32 || ascii > 96) {
        return null;
    }

    if (ascii === 32) {
        return {
            instructions: [],
            width: Constants.VECTOR_DEFAULTS.SPACE_WIDTH,
            height: Constants.VECTOR_DEFAULTS.SPACE_WIDTH,
            charWidth: Constants.VECTOR_DEFAULTS.SPACE_WIDTH,
            charHeight: Constants.VECTOR_DEFAULTS.SPACE_WIDTH,
        };    
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
        minMax[1] = minMax[0] < 0 ? Math.abs(minMax[0]) + minMax[1] : minMax[1];
        minMax[3] = minMax[2] < 0 ? Math.abs(minMax[2]) + minMax[3] : minMax[3];
        minMax[0] = minMax[0] < 0 ? 0 : minMax[0];
        minMax[2] = minMax[2] < 0 ? 0 : minMax[2];

        const charWidth = minMax[1];
        const halfWidth = Math.round(charWidth * 0.5);
        const charHeight = minMax[3];
        const halfHeight = Math.round(charHeight * 0.5);

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

        return {
            instructions: instructions,
            charWidth: charWidth + Constants.VECTOR_DEFAULTS.CHAR_SPACING,
            width: charWidth + Constants.VECTOR_DEFAULTS.CHAR_SPACING * this.API.state.currentFontSize,
            charHeight: charHeight,
            height: charHeight * this.API.state.currentFontSize,
            halfWidth: halfWidth,
            halfHeight: halfHeight
        };
    }

    return null;
}
