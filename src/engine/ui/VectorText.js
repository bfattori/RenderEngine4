import Console from '../core/Console.js';
import { VECTOR_IL } from '../rendering/assemblers/VectorAssembler.js';
import CHARACTER_MAP from './vector_character_set.js';
import { RenderContextError } from '../rendering/contexts/RenderContext.js';
import { ShearingMatrix, Matrix2d } from '../core/Matrix.js';


const ITALICS_MATRIX = new Matrix2d(ShearingMatrix[0], ShearingMatrix[1], ShearingMatrix[2]);

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
export default function processText(text, spaceWidth = 45) {
    // get the current font size of the render context
    let fontSize = this.fontSize;

    // Parse and process each character in the text
    let i = 0;
    while (i < text.length) {
        const char = text[i];
        
        // Handle escape sequences
        if (char === '\\') {
            const nextChar = text[i + 1];
            if (nextChar !== undefined) {
                switch (nextChar) {
                case '*':
                    characterInstruction.call(this, '*', spaceWidth);
                    i += 2;
                    break;
                case '{':
                    characterInstruction.call(this, '{', spaceWidth);
                    i += 2;
                    break;
                case '_':
                    characterInstruction.call(this, '_', spaceWidth);
                    i += 2;
                    break;
                case '~':
                    characterInstruction.call(this, '~', spaceWidth);
                    i += 2;
                    break;
                case '\\':
                    characterInstruction.call(this, '\\', spaceWidth);
                    i += 2;
                    break;
                default:
                    // Not an escape sequence, treat as regular character
                    characterInstruction.call(this, char, spaceWidth);
                    i++;
                    break;
                }
            } else {
                // Trailing backslash, treat as regular character
                characterInstruction.call(this, '\\', spaceWidth);
                i++;
            }
            
            continue;
        }

        // Handle formatting markers
        if (char === '{') {
            const instructions = [];
            const nextChar = text[i + 1];
            let markerType = '';
            
            if (nextChar === '!') {
                // Reset to previous/default color
                instructions.push(`${VECTOR_IL.COLOR}`);
                i += 3;
            } else if (nextChar === '+' || nextChar === '-') {
                const scalar = nextChar === '+' ? 1 : -1;
                // Font size marker - next character
                let nextNext = text[i + 2];
                if (nextNext === '}') {
                    // pop to the last font size
                    this.popFontSize;
                    i += 3;
                } else {
                    // get the value and apply the delta to font size
                    let j = i + 2;
                    let foundBracket = false;
                    while (j < text.length && !foundBracket) {
                        if (text[j] === '}') {
                            const fontSizeValue = parseFloat(text.substring(i + 2, j).trim());
                            
                            this.fontSize += (fontSizeValue * scalar);
                            spaceWidth *= fontSizeValue * 0.47;
                            foundBracket = true;
                            break;
                        }
                        j++;
                    }
                    i = j + 1;
                }
                continue;
            } else if (nextChar === '#') {
                // Color name - hex color
                const colorName = getWord.call(this, text, i).substr(1).trim();
                instructions.push(`${VECTOR_IL.COLOR} ${colorName}`);
                i += colorName.length + 2;
            } else if (nextChar !== undefined) {
                // Color name - remove the { - may need to remove the training } as well??
                const colorName = getWord.call(this, text, i).substr(1).trim();
                instructions.push(`${VECTOR_IL.COLOR} ${colorName}`);
                i += colorName.length + 2;
            }

            this.addInstruction(...instructions);
            continue;
        }

        // Handle italic marker (single underscore)
        if (char === '_') {
            this.formatting.italics = !this.formatting.italics;
            this.addInstruction(`// format: italics (${this.formatting.italics})`);
            if (this.formatting.italics) {
                this.addInstruction(`${VECTOR_IL.PUSH}`);
                this.addInstruction(`${VECTOR_IL.TRANSFORM} ${ITALICS_MATRIX.toCanvas()}`);
            } else {
                this.addInstruction(`${VECTOR_IL.POP}`)
            }
            i++;
            continue;
        }
        
        // Handle bold marker
        if (char === '*' && text[i + 1] === '*') {
            this.formatting.bold = !this.formatting.bold;
            this.addInstruction(`// format: bold (${this.formatting.bold})`);
            if (this.formatting.bold) {
                this.addInstruction(`${VECTOR_IL.WIDTH} ${this.lineWidth + (this.formatting.bold ? 3 : 0)}`);
            } else {
                this.addInstruction(`${VECTOR_IL.WIDTH} ${this.lineWidth}`);
            }
            i += 2;
            continue;
        }
        
        // Handle underline marker
        if (char === '~') {
            this.formatting.underline = !this.formatting.underline;
            this.startUnderline = this.formatting.underline ? this.cursor[0] : this.startUnderline;
            if (!this.formatting.underline && this.startUnderline !== null) {
                // Draw underline from startUnderline to current cursor position
                this.addInstruction(`// format: underline ${this.formatting.underline} (${this.startUnderline} - ${this.cursor[0]})`);
                this.addInstruction(`${VECTOR_IL.WIDTH} 2`);
                this.addInstruction(`${VECTOR_IL.LINE} ${this.startUnderline} ${this.cursor[1] + (this.lineHeight * (this.fontSize * 0.14))} ${this.cursor[0]} ${this.cursor[1] + (this.lineHeight * (this.fontSize * 0.14))}`);
                this.addInstruction(`${VECTOR_IL.WIDTH} ${this.lineWidth}`);
                this.startUnderline = null;
            }
            i++;
            continue;
        }
            
        // Regular character - emit instruction
        characterInstruction.call(this, char, spaceWidth);
        i++;
    }
}

/**
 * Generate instruction for a single character
 * @param {string} char - Character to render
 * @param {number} width - Cursor advancement width
 * @returns {Array} Array of IL instructions for this character
 * @private
 */
function characterInstruction(char, width) {
    // Get character instructions from vector.js
    const charInstructions = getCharacterInstructions.call(this, char);

    if (!charInstructions || !charInstructions.instructions) {
        // Character not in set (e.g., lowercase letters), skip or use fallback
        return;
    }

    // Add character instructions
    const context = this;
    context.addInstruction(`// CHAR: ${char === ' ' ? 'SPACE' : char}`);
    charInstructions.instructions.forEach(inst => {
        context.addInstruction(inst);
    });

    // Advance cursor by character width
   context.cursorDeltaX = charInstructions.width + (3 * this.fontSize);
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
            width: 10,
            height: 10
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
                minMax[0] = points[j][0] < minMax[0] ? points[j][0] * this.fontSize : minMax[0];
                minMax[1] = points[j][0] > minMax[1] ? points[j][0] * this.fontSize : minMax[1];
                minMax[2] = points[j][1] < minMax[2] ? points[j][1] * this.fontSize : minMax[2];
                minMax[3] = points[j][1] > minMax[3] ? points[j][1] * this.fontSize : minMax[3];
            }
        }
        const charWidth = minMax[1] - minMax[0];
        const halfWidth = Math.round(charWidth * 0.5);
        const charHeight = minMax[3] - minMax[2];
        const halfHeight = Math.round(charHeight);

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


            const [x, y] = [halfWidth + point[0] * this.fontSize, point[1] * this.fontSize];
            
            if (first) {                
                // Add first 2 points with initial line instruction
                const [ex, ey] = next != null ? [halfWidth + next[0] * this.fontSize, next[1] * this.fontSize] : [0,0];
                instructions.push(`${VECTOR_IL.LINE} ${this.cursor[0] + x} ${this.cursor[1] + y} ${this.cursor[0] + ex} ${this.cursor[1] + ey}`); // Invert Y for screen coordinates
                first = false;
                j++;
            } else {
                instructions.push(`${VECTOR_IL.LINEREL} ${this.cursor[0] + x} ${this.cursor[1] + y}`);
            }
        }
        instructions.push(VECTOR_IL.ENDSEG);

        return {
            instructions: instructions,
            width: charWidth,
            height: charHeight
        };
    }

    return null;
}
