import Resource from './Resource.js';
import ImageResource from './ImageResource.js';
import $Math from '../core/Math.js';
import Tile from './Tile.js';

/**
 * SpriteSheet
 * See: functionalTests/gameObject/tileset/smbtiles.json
 *
 * @class
 * @extends Resource
 */
export default class TileSheet extends Resource {
    #name;
    #tiles = new Map();
    #bitmapSheet = null;

    /**
     * Create a new `Sprite` resource.
     * 
     * @param {String} name - The name of the sprite sheet
     * @param {String} sheetUrl - The Url to the sprite sheet
     */
    constructor(name, sheetUrl, rel = null) {
        super(sheetUrl, Resource.TYPE.JSON, rel);
        this.#name = name;
    }

    get name() {
        return this.#name;
    }

    async postProcess(content) {
        if (!content.tileSheet) 
            throw new ResourceError(this, `The resource "${this.url}" is not a valid tile sheet.`);

        this.sheet = new ImageResource(content.bitmap.image, content.bitmap.width, content.bitmap.height, this.url);
        const assumeOpaque = content.assumeOpaque;
        const tiles = content.tiles;

        // this contains all the tiles
        if (await this.sheet.loading()) {
            // bitmap loaded, fill out the tiles
            Object.keys(tiles).forEach(key => {
                this.addTile(key, new Tile(key, this, tiles[key]));
            });
        }
        return this;
    }

    /**
     * Destroy the sprite instance
     */
    destroy() {
        this.#tiles.clear();
        this.#tiles = null;
        super.destroy();
    }

    addTile(tileName, tile) {
        this.#tiles.set(tileName, tile);
    }

    get tiles() {
        return this.#tiles;
    }

    get count() {
        return this.#tiles.size;
    }

    get sheet() {
        return this.#bitmapSheet;
    }

    set sheet(sheet) {
        this.#bitmapSheet = sheet;
    }
}
