import Enum from '../../core/Enum.js';
import ResourceLoader, { ResourceError } from './ResourceLoader.js';
import TileSheet from './TileSheet.js';

/**
 * TileMapFactory is a resource factory for the various types of tile maps that can be loaded into the game.
 *
 * @example
 * // Load a platformer tile map from a JSON file
 * const tileMap = new TileMap('platformTest', '
 * See: functionalTests/assets/tile_map.json
 *
 * @class
 * @extends Resource
 */
export default class TileMap extends ResourceLoader {
    #name;
    #generated = null;

    static TYPE = new Enum({
      PLATFORMER: 'platformer',
      ISOMETRIC: 'isometric',
      GRID: 'grid'
    });

    /**
     * Create a new `TileMap` resource.
     * 
     * @param {String} name - The name of the sprite sheet
     * @param {String} tileMapUrl - The Url to the tilemap
     * @constructor
     */
    constructor(name, tileMapUrl, rel = null) {
        super(tileMapUrl, ResourceLoader.TYPE.JSON, rel);
        this.merge({
            name: name,
            mapType: TileMap.TYPE.GRID,
            tileSheet: null,
            tileMap: null
        });
    }

    async postProcess(content) {
        if (!content['tileMap'])
            throw new ResourceError(this, `The resource "${this.url}" is not a valid tile map.`);

        this.tileSheet = new TileSheet(this.#name, content.tileSheet, this.url);
        await this.tileSheet.loading();
        this.tileSize = content.size;
        switch(content.type) {
          case `${TileMap.TYPE.PLATFORMER}`: this.mapType = TileMap.TYPE.PLATFORMER; break;
          case `${TileMap.TYPE.ISOMETRIC}`: this.mapType = TileMap.TYPE.ISOMETRIC; break;
          case `${TileMap.TYPE.GRID}`: this.mapType = TileMap.TYPE.GRID; break;
          default: throw new ResourceError(this, `Unknown type "${content.type}" for tile map "${this.url}".`);
        }
        this.tileMap = content;
        await this.loadTileMap();
        return this;
    }

    async loadTileMap() {
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

    /**
     * Get the associated `TileMap`
     * @returns {TileMap} The tile map containing the tiles
     */
    get generated() {
        return this.#generated;
    }

    /**
     * Set the associated `TileMap`
     * @param {TileMap} value - The tile map containing the tiles
     */
    set generated(value) {
        this.#generated = value;
    }
}
