import Constants from '../Constants.js';
import RenderEngineError from '../core/RenderEngineError.js';
import Context from '../Context.js';

const ctx = Context.getInstance();

/**
 * Class that parses formatted text and to populate the context's
 * rendering instructions for the characters. 
 * 
 * @example TextParser.parse(text);
 * @param {string} text - Text content to process
 * @returns {Array<String>} Array of IL instructions
 */
export default class TextParser {
    static #instance = null;
    #renderContext;

    constructor(renderContext) {
        this.#renderContext = renderContext;
    }

    static getInstance(renderContext) {
        if (!TextParser.#instance)
            TextParser.#instance = new TextParser(renderContext);
        return TextParser.#instance;
    }

    formatItalics() {
        throw new RenderEngineError(`${this.constructor.name} must implement formatItalics()`);
    }

    formatBold() {
        throw new RenderEngineError(`${this.constructor.name} must implement formatBold()`);
    }

    formatUnderline() {
        throw new RenderEngineError(`${this.constructor.name} must implement formatUnderline()`);
    }

    getCharacter(char, text, index) {
        throw new RenderEngineError(`${this.constructor.name} must implement getCharacter()`);
    }

    get renderContext() {
        return this.#renderContext;
    }

    injectSpace(width) {
        this.renderContext.API.translate(width, 0);
    }

    carriageReturn() {
        this.renderContext.API.carriageReturn();
    }

    get isFormatItalics() {
        return this.renderContext.formatting.italics;
    }

    set isFormatItalics(state) {
        this.renderContext.formatting.italics = state;
    }

    get isFormatBold() {
        return this.renderContext.formatting.bold
    }

    set isFormatBold(state) {
        this.renderContext.formatting.bold = state;
    }

    get isFormatUnderline() {
        return this.renderContext.formatting.underline;
    }

    set isFormatUnderline(state) {
        this.renderContext.formatting.underline = state;
    }

    /**
     * Parse text with formatting into rendering instructions.
     * 
     * @param {string} text - Text content to process
     * @returns {Array<String>} Array of IL instructions
     */
    parse(text) {
        let textWidth = 0, totalTextWidth = 0;
        let lineHeight = 0, totalTextHeight = 0;

        // Parse and process each character in the text
        let i = 0;
        while (i < text.length) {
            const char = text[i];

            // space
            if (char === ' ') {
                // including this space, how many more are there trailing this?
                // reduces the number of times we emit TRANSLATE instructions
                let consecutiveTrailingSpaces = 1;
                if (text[i + 1] === ' ') {
                    consecutiveTrailingSpaces += /( +)/.exec(text.substring(i + 1))[0].length;
                }
                this.injectSpace(consecutiveTrailingSpaces * spaceWidth);
                
                i += consecutiveTrailingSpaces;
                textWidth += consecutiveTrailingSpaces * spaceWidth;
                continue;
            }

            // newline
            if (char === '\n') {
                this.carriageReturn();
                if (textWidth > totalTextWidth) {
                    totalTextWidth = textWidth;
                }
                textWidth = 0;
                totalTextHeight += lineHeight;
                lineHeight = 0;
                i++;
                continue;
            }

            // tab
            if (char === '\t') {
                this.injectSpace(tabSize);
                textWidth += tabSize;
                i++;
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
                            ci = this.getCharacter('*', text, i + 2);
                            i += 2 + ci.trailingSpaces;
                            break;
                        case '{':
                            ci = this.getCharacter('{', text, i + 2);
                            i += 2 + ci.trailingSpaces;
                            break;
                        case '_':
                            ci = this.getCharacter('_', text, i + 2);
                            i += 2 + ci.trailingSpaces;
                            break;
                        case '~':
                            ci = this.getCharacter('~', text, i + 2);
                            i += 2 + ci.trailingSpaces;
                            break;
                        case '\\':
                            ci = this.getCharacter('\\', text, i + 2);
                            i += 2 + ci.trailingSpaces;
                            break;
                        default:
                            // Not an escape sequence, treat as regular character
                            ci = this.getCharacter(char, text, i + 1);
                            i += 1 + ci.trailingSpaces;
                            break;
                    }
                } else {
                    // Trailing backslash, treat as regular character
                    ci = this.getCharacter('\\', text, i + 1);
                    i += 1 + ci.trailingSpaces;
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
                            reset ? this.renderContext.API.resetFontSize() : this.renderContext.API.fontSize();
                            break;
                        case 'f':
                            reset ? this.renderContext.API.resetFillColor() : this.renderContext.API.fillColor();
                            break;
                        case 'c':
                            reset ? this.renderContext.API.resetColor() : this.renderContext.API.color();
                            break;
                        case 'w':
                            reset ? this.renderContext.API.resetWidth() : this.renderContext.API.width();
                            break;
                    }
                    i += reset ? 5 : 4;
                } else if (nextChar !== '#' && ((isNaN(nextChar) && (nextChar === '+' || nextChar === '-')) || !isNaN(nextChar))) {
                    const sign = nextChar === '+' ? 1 : nextChar === '-' ? -1 : 0;
                    // Font size marker - next character
                    if (nextChar === '}') {
                        // pop to the last font size
                        this.renderContext.API.fontSize();
                        i += 2;
                    } else {
                        // get the font size
                        const currentSize = this.renderContext.API.getFontSize();
                        let j = i + 2;
                        let foundBracket = false;
                        while (j < text.length && !foundBracket) {
                            if (text[j] === '}') {
                                const scalar = parseFloat(text.substring(i + (sign !== 0 ? 2 : 1), j).trim()) || 0;
                                this.renderContext.API.fontSize(sign === 0 ? scalar : currentSize + (scalar * sign));
                                break;
                            }
                            j++;
                        }
                        i = j + 1;
                    }
                    continue;
                } else if (nextChar === '#') {
                    // Color name - hex color
                    const colorHex = this.#getWord(text, i).substr(1).trim();
                    this.renderContext.API.color(colorHex);
                    i += colorHex.length + 2;
                } else if (nextChar !== undefined) {
                    // Color name - remove the { - may need to remove the training } as well??
                    const colorName = this.#getWord(text, i).substr(1).trim();
                    this.renderContext.API.color(colorName);
                    i += colorName.length + 2;
                }
                continue;
            }

            // Handle italic marker (single underscore)
            if (char === '_') {
                this.isFormatItalics = !this.isFormatItalics;
                if (ctx.debug) this.renderContext.addInstruction(`// format: italics (${this.isFormatItalics})`);
                this.formatItalics();
                i++;
                continue;
            }

            // Handle bold marker
            if (char === '*' && text[i + 1] === '*') {
                this.isFormatBold = !this.isFormatBold;
                if (ctx.debug) this.renderContext.addInstruction(`// format: bold (${this.isFormatBold})`);
                this.formatBold();
                i += 2;
                continue;
            }

            // Handle underline marker
            if (char === '~') {
                this.isFormatUnderline = !this.isFormatUnderline;
                if (ctx.debug) this.renderContext.addInstruction(`// format: underline (${this.isFormatUnderline})`);
                this.formatUnderline();
                i++;
                continue;
            }

            // Regular character - emit instruction
            ci = this.getCharacter(char, text, i + 1);

            // Calculate overall width and height
            textWidth += ci.width;
            lineHeight = Math.max(lineHeight, ci.height);

            // advance cursor
            i += 1 + ci.trailingSpaces;
        }
        return {
            width: totalTextWidth !== 0 ? totalTextWidth : textWidth,
            height: totalTextHeight !== 0 ? totalTextHeight : lineHeight
        };
    }

    #getWord(text, idx) {
        let check = text.substring(idx);
        const headBrace = check.indexOf('{', 1);
        const tailBrace = check.indexOf('}', 1);

        if ((headBrace > -1 && tailBrace > -1 && tailBrace < headBrace) || (headBrace === -1 && tailBrace > -1)) {
            // return without the trailing brace
            return text.substring(idx, idx + tailBrace);
        }

        throw new RenderContextError(this, `Unmatched '{' in text at index ${idx}: ${text}`);
    }
}