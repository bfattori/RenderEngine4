import Console from '../core/Console.js';
import { IL_INSTRUCTIONS } from '../rendering/contexts/VectorRenderContext.js';
import CHARACTER_MAP from './vector_character_set.js';
import { RenderContextError } from '../rendering/contexts/RenderContext.js';

function getWord(text, idx) {
    let check = text.substring(idx);
    const space = check.indexOf(' ');
    const percent = check.indexOf('%', 1);

    if (percent > -1 && space > -1 && percent < space) {
        throw new RenderContextError(this, "VectorText::getWord() - Tag found in character string before space!");
    } 

    if (space > -1) {
        // return with the trailing space
        return text.substring(idx, idx + space);
    } else {
        return text;
    }
}

/**
 * Method to process text content with formatting markers into rendering instructions.
 * @param {VectorRenderContext} context - The context to render the text to
 * @param {string} text - Text content to process
 * @returns {Array} Array of IL instructions
 */
export default function processText(text, spaceWidth = 50) {
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
                    characterInstruction.call(this, ' ', spaceWidth);
                    i += 2;
                    break;
                case '%':
                    characterInstruction.call(this, '%', spaceWidth);
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

        // Handle color markers
        if (char === '%') {
            const instructions = [];
            const nextChar = text[i + 1];
            let markerType = '';
            
            if (nextChar === '!') {
                // Reset to previous/default color
                instructions.push(`${IL_INSTRUCTIONS.COLOR}`);
                i += 2;
                continue;
            } else if (nextChar === '[') {
                // Font size marker - find closing bracket
                let j = i + 1;
                let foundBracket = false;
                while (j < text.length && !foundBracket) {
                    if (text[j] === ']') {
                        const fontSizeValue = parseFloat(text.substring(i + 2, j).trim());
                        
                        // Handle font size reset or set
                        if (fontSizeValue === 0 || fontSizeValue === '') {
                            instructions.push(`${IL_INSTRUCTIONS.FONTSIZE}`);
                        } else {
                            instructions.push(`${IL_INSTRUCTIONS.FONTSIZE} ${fontSizeValue}`);
                        }
                        foundBracket = true;
                    }
                    j++;
                }
                i = j;
                continue;
            } else if (nextChar !== undefined && !isNaN(parseFloat(nextChar))) {
                // Color name with hex digit
                const colorName = getWord.call(this, text, i).substr(1).trim();
                instructions.push(`${IL_INSTRUCTIONS.COLOR} ${colorName}`);
                i += colorName.length + 2;
                continue;
            } else if (nextChar !== undefined) {
                // Color name - remove the %
                const colorName = getWord.call(this, text, i).substr(1).trim();

                instructions.push(`${IL_INSTRUCTIONS.COLOR} ${colorName}`);
                i += colorName.length + 2;
                continue;
            }
            
            this.addInstruction(...instructions);
            continue;
        }

        // Handle italic marker (single underscore)
        if (char === '_') {
            this.addInstruction(`${IL_INSTRUCTIONS.TOGGLE} ITALICS`);
            i++;
            continue;
        }
        
        // Handle bold marker
        if (char === '*' && text[i + 1] === '*') {
            this.addInstruction(`${IL_INSTRUCTIONS.TOGGLE} BOLD`);
            i += 2;
            continue;
        }
        
        // Handle underline marker
        if (char === '~') {
            this.addInstruction(`${IL_INSTRUCTIONS.TOGGLE} UNDERLINE`);
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

    if (!charInstructions) {
        // Character not in set (e.g., lowercase letters), skip or use fallback
        return;
    }

    // Add character instructions
    const context = this;
    context.addInstruction(`// CHAR: ${char === ' ' ? 'SPACE' : char}`);
    charInstructions.forEach(inst => {
        context.addInstruction(inst);
    });

    // Advance cursor by character width
   this.cursorDeltaX = width; // Will be set based on character type in actual implementation
}

/**
 * Get character instruction from vector.js character set
 * @param {string} char - Character code (0x20-0x7F printable range)
 * @param {number} width - Cursor advancement width
 * @returns {Object|null} Instructions for character or null if not found
 * @private
 */
function getCharacterInstructions(char) {
    // currently only supports upper case characters
    char = char.toUpperCase();

    // Convert char to ASCII code
    const ascii = char.charCodeAt(0);

    // Check bounds (printable ASCII: 32-127, but we have specific chars in vector.js)
    if (ascii < 32 || ascii > 96) {
        return null;
    }

    if (ascii === 32) {
        this.cursorDeltaX = 40;
        return [`${IL_INSTRUCTIONS.MOVETO} ${this.cursorX} ${this.cursorY}`];
    } 

    // Check character set array
    if (CHARACTER_MAP[ascii]) {
        // Convert relative coordinates to absolute (center is 0,0)
        let instructions = [];
        const points = CHARACTER_MAP[ascii];
        let first = true;

        // start new line segment
        if (points.length > 0) instructions.push(IL_INSTRUCTIONS.LINESEG);

        for (let j = 0; j < points.length; j++) {
            const point = points[j];
            const next = j+1 < points.length ? points[j + 1] : [0,0];

            if (point === null) {
                // End of line segment
                instructions.push(IL_INSTRUCTIONS.ENDSEG);
                if (j + 1 < points.length) {
                    instructions.push(IL_INSTRUCTIONS.LINESEG);
                    first = true;    
                }
                continue;
            }

            const [x, y] = point;
            const [ex, ey] = next != null ? next : [0,0];
            
            if (first) {                
                // Add first point with initial line instruction
                instructions.push(`${IL_INSTRUCTIONS.LINE} ${this.cursor[0] + x} ${this.cursor[1] + y} ${this.cursor[0] + ex} ${this.cursor[1] + ey}`); // Invert Y for screen coordinates
                first = false;
            } else {
                instructions.push(`${IL_INSTRUCTIONS.LINEREL}  ${this.cursor[0] + x} ${this.cursor[1] + y}`);
            }
        }

        if (points.length > 0) instructions.push(IL_INSTRUCTIONS.ENDSEG);


        return instructions;
    }

    return null;
}
