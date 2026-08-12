import Resource from './Resource.js';
import $Math from '../core/Math.js';

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

    /**
     * Create a new `Sprite` resource.
     * 
     * @param {String} name - The name of the sprite sheet
     * @param {String} sheetUrl - The Url to the sprite sheet
     */
    constructor(name, sheetUrl) {
        super(sheetUrl, Resource.TYPE.JSON);
        this.#name = name;
    }

    get name() {
        return this.#name;
    }

    async postProcess(content) {
        const bitmap = new ImageResource(content.bitmap.image, content.bitmap.width, content.bitmap.height);
        const assumeOpaque = content.assumeOpaque;
        const sprites = content.sprites;

        // this contains all the sprites
        if (await bitmap.loading()) {
            // bitmap loaded, fill out the sprites
            Object.keys(sprites).forEach(key => {
                this.#sprites.set(key, new Sprite(key, this.content, sprites[key]));
            });
        }
        const waitingFor = this.#sprites.values.forEach(sprite => sprite.loading());
        return Promise.all(waitingFor);
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
}
