import Enum from '../../core/Enum.js';
import ResourceLoader, { ResourceError } from './ResourceLoader.js';
import TileSheet from './TileSheet.js';

/**
 * TileMap
 * See: functionalTests/assets/tile_map.json
 *
 * @class
 * @extends Resource
 */
export default class TileMap extends ResourceLoader {
    #name;

    static TYPE = new Enum({
      PLATFORMER: 'platformer',
      ISOMETRIC: 'isometric',
      GRID: 'grid'
    });

    /**
     * Create a new `Sprite` resource.
     * 
     * @param {String} name - The name of the sprite sheet
     * @param {String} tileMapUrl - The Url to the tilemap
     * @constructor
     */
    constructor(name, tileMapUrl, rel = null) {
        super(tileMapUrl, ResourceLoader.TYPE.JSON, rel);
        this.merge({
            name: name,
            type: TileMap.TYPE.GRID,
            tileSheet: null,
            tileMap: null,
            tileSize: [0, 0]
        });
    }

    async postProcess(content) {
        if (!content['tileMap'])
            throw new ResourceError(this, `The resource "${this.url}" is not a valid tile map.`);

        this.tileSheet = new TileSheet(this.#name, content.tileSheet, this.url);
        await this.tileSheet.loading();
        this.tileSize = content.size;
        switch(content.type) {
          case `${TileMap.TYPE.PLATFORMER}`: this.type = TileMap.TYPE.PLATFORMER; break;
          case `${TileMap.TYPE.ISOMETRIC}`: this.type = TileMap.TYPE.ISOMETRIC; break;
          default: throw new ResourceError(this, `Unknown type "${content.type}" for tile map "${this.url}".`);
        }
        this.tileMap = content;
        return this;
    }

    /**
     * Destroy the sprite instance
     */
    destroy() {
        this.tileMap = null;
        this.tileSheet = null;
        super.destroy();
    }

    /**
     * Get the associated `TileSheet`
     * @returns {TileSheet} The tile sheet containing the tiles
     */
    get sheet() {
        return this.tileSheet;
    }
}