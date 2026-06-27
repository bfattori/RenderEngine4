import Console from '../core/Console.js';
import { IL_INSTRUCTIONS } from '../rendering/contexts/VectorRenderContext.js';
import { VECTOR_CHARACTER_SET } from './default_vector_font.js';

function getWord(text, idx) {
    text = text.substring(idx);
    const space = text.indexOf(' ');
    if (space > -1) {
        return text.substring(idx, space);
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
export default function processText(text, spaceWidth = 5) {
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
            } else if (nextChar === '#') {
                // Font size marker - find closing bracket
                let j = i + 2;
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
                const colorName = getWord(text, i).substr(1);
                instructions.push(`${IL_INSTRUCTIONS.COLOR} ${colorName}`);
                i += colorName.length + 2;
                continue;
            } else if (nextChar !== undefined) {
                // Color name - remove the %
                const colorName = getWord(text, i).substr(1);

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

    return instructions;
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
    const charInstructions = getCharacterInstructions(char);

    if (!charInstructions) {
        // Character not in set (e.g., lowercase letters), skip or use fallback
        return;
    }

    // Add character instructions
    const context = this;
    charInstructions.forEach(inst => {
        context.addInstruction(inst);
    });

    // Advance cursor by character width
    const advance = width; // Will be set based on character type in actual implementation
}

/**
 * Get character instruction from vector.js character set
 * @param {string} char - Character code (0x20-0x7F printable range)
 * @param {number} width - Cursor advancement width
 * @returns {Object|null} Instructions for character or null if not found
 * @private
 */
function getCharacterInstructions(char) {
    // Convert char to ASCII code
    const ascii = char.charCodeAt(0);

    // Check bounds (printable ASCII: 32-127, but we have specific chars in vector.js)
    if (ascii < 32 || ascii > 127) {
        return null;
    }

    // Check character set array
    if (VECTOR_CHARACTER_SET[ascii]) {
        const points = VECTOR_CHARACTER_SET[ascii];
        
        // Convert relative coordinates to absolute (center is 0,0)
        let instructions = [];
        
        for (let j = 0; j < points.length; j++) {
        const point = points[j];
        
        if (point === null) {
            // End of line segment
            instructions.push(IL_INSTRUCTIONS.ENDSEG);
            continue;
        }

        const [x, y] = point;
        
        if (j === 0) {
            // Start new segment
            instructions.push(IL_INSTRUCTIONS.LINESEG);
            
            // Add first point with initial line instruction
            instructions.push(`${IL_INSTRUCTIONS.LINE} ${this.left + x} ${this.top - y}`); // Invert Y for screen coordinates
        } else {
            instructions.push(` ${x},`);
            instructions.push(`${this.top - y}`); // Invert Y for screen coordinates
        }
        }

        return instructions;
    }

    return null;
}
