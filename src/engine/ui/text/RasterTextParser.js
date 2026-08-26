import Constants from '../../Constants.js';
import { IL as RASTER_IL } from '../../rendering/assemblers/IntermediateLanguages.js';
import TextParser from './TextParser.js';
import Context from '../../Context.js';

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
export default class RasterTextParser extends TextParser {
    static #instance = null;

    static getInstance(renderContext) {
        if (!RasterTextParser.#instance)
            RasterTextParser.#instance = new RasterTextParser(renderContext);
        return RasterTextParser.#instance;
    }

    formatItalics() {
        // if (this.isFormatItalics)
        //     this.renderContext.API.skew(-12);
        // else
        //     this.renderContext.API.skew(12);
    }

    formatBold() {
        // if (this.isFormatBold) {
        //     this.renderContext.API.width(Constants.VECTOR_DEFAULTS.TEXT_BOLD);
        // } else {
        //     this.renderContext.API.width();
        // }
    }

    formatUnderline() {
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
        return {};
    }
}

/**
 * Render system text (8px sans-serif, black) to a surface.
 * @param {String} text 
 * @param {Canvasd2DRenderingContext} surface 
 */
const sysText = (text, surface, x = 0, y = 0) => {
    surface.save();
    surface.font = '8px sans-serif';
    surface.fillStyle = '#000';
    surface.translate(x, y);
    text = text.split('\n');
    let top = 10;
    for (let i = 0; i < text.length; i++) {
        surface.fillText(text[i], 0, top);
        top += 10;
    }
    surface.restore();
}

export {
    sysText
};
