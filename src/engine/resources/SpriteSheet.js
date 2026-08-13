import Resource from './Resource.js';
import ImageResource from './ImageResource.js';
import $Math from '../core/Math.js';
import Sprite from './Sprite.js';

/**
 * SpriteSheet
 * See: functionalTests/gameObject/tileset/smbtiles.json
 *
 * @class
 * @extends Resource
 */
export default class SpriteSheet extends Resource {
    #name;
    #sprites = new Map();
    #bitmapSheet = null;

    /**
     * Create a new `Sprite` resource.
     * 
     * @param {String} name - The name of the sprite sheet
     * @param {String} sheetUrl - The Url to the sprite sheet
     */
    constructor(name, sheetUrl, rel) {
        super(sheetUrl, Resource.TYPE.JSON, rel);
        this.#name = name;
    }

    get name() {
        return this.#name;
    }

    async postProcess(content) {
        this.#bitmapSheet = new ImageResource(content.bitmap.image, content.bitmap.width, content.bitmap.height, this.url);
        const assumeOpaque = content.assumeOpaque;
        const sprites = content.sprites;

        // this contains all the sprites
        if (await this.#bitmapSheet.loading()) {
            // bitmap loaded, fill out the sprites
            Object.keys(sprites).forEach(key => {
                this.#sprites.set(key, new Sprite(key, this, sprites[key]));
            });
        }
        return this;
    }

    /**
     * Destroy the sprite instance
     */
    destroy() {
        this.#sprites.clear();
        this.#sprites = null;
        super.destroy();
    }

    get sprites() {
        return this.#sprites;
    }

    get sheet() {
        return this.#bitmapSheet;
    }
}
