import ResourceLoader, { ResourceError } from './ResourceLoader.js';
import ImageResource from './ImageResource.js';
import Tile from '../Tile.js';

/**
 * SpriteSheet
 * See: functionalTests/gameObject/tileset/smbtiles.json
 *
 * @class
 * @extends Resource
 */
export default class TileSheet extends ResourceLoader {
    #tiles = new Map();
    #bitmapSheet = null;

    /**
     * Create a new `TileSheet` resource.
     * 
     * @param {String} name - The name of the tile sheet
     * @param {String} sheetUrl - The Url to the tile sheet
     */
    constructor(name, sheetUrl, rel = null) {
        super(sheetUrl, ResourceLoader.TYPE.JSON, rel);
        this.merge({
            name: name,
            assumeOpaque: false,
            sheet: null,
            tileDef: null
        });
    }

    async postProcess(content) {
        if (!content['tileSheet'])
            throw new ResourceError(this, `The resource "${this.url}" is not a valid tile sheet.`);

        this.sheet = new ImageResource(this.name, content.bitmap.image, content.bitmap.width, content.bitmap.height, this.url);
        this.assumeOpaque = content.assumeOpaque;
        this.tileDef = content.tiles;

        // this contains all the tiles
        if (await this.sheet.loading()) {
            // bitmap loaded, fill out the tiles
            Object.keys(this.tileDef).forEach(key => {
                this.addTile(key, new Tile(key, this, this.tileDef[key]));
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

    get tileNames() {
        const names = [];
        this.#tiles.keys().forEach(key => names.push(key));
        return names;
    }

    getTileAt(idx) {
        return this.#tiles.get(this.tileNames[idx]);
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

    tile(name, tile) {
        return new Tile(name, this, this.tileDef[tile]);    
    }
}