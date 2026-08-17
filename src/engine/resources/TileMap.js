import { $Math, Enum } from '../core/lib.js';
import Resource from './Resource.js';
import { ResourceError } from './Resource.js';
import TileSheet from './TileSheet.js';
import Tile from './Tile.js';

/**
 * TileMap
 * See: functionalTests/assets/tile_map.json
 *
 * @class
 * @extends Resource
 */
export default class TileMap extends Resource {
    #name;
    #type = null;
    #tileSheet = null;
    #tileMap = null;
    #tileSize = [0, 0];

    static TYPE = new Enum({
      PLATFORMER: 'platformer',
      ISOMETRIC: 'isometric'
    });

    /**
     * Create a new `Sprite` resource.
     * 
     * @param {String} name - The name of the sprite sheet
     * @param {String} tileMapUrl - The Url to the tilemap
     * @constructor
     */
    constructor(name, tileMapUrl, rel = null) {
        super(tileMapUrl, Resource.TYPE.JSON, rel);
        this.#name = name;
    }

    async postProcess(content) {
        if (!content.tileMap) 
            throw new ResourceError(this, `The resource "${this.url}" is not a valid tile map.`);

        this.#tileSheet = new TileSheet(this.#name, content.tileSheet, this.url);
        await this.#tileSheet.loading();
        this.#tileSize = content.size;
        switch(content.type) {
          case `${TileMap.TYPE.PLATFORMER}`: this.#type = +TileMap.TYPE.PLATFORMER; break;
          case `${TileMap.TYPE.ISOMETRIC}`: this.#type = +TileMap.TYPE.ISOMETRIC; break;
          default: throw new ResourceError(this, `Unknown type "${content.type}" for tile map "${this.url}".`);
        }
        this.#tileMap = content;
        return this;
    }

    /**
     * Destroy the sprite instance
     */
    destroy() {
        this.#tileMap = null;
        this.#tileSheet = null;
        super.destroy();
    }

    /**
     * Get the name of the tile map
     * 
     * @returns {String} The name of the tile map
     */
    get name() {
        return this.#name;
    }

    /**
     * Get the tile map definition object
     * @returns {Object} The tile map definition
     */
    get tileMap() {
        return this.#tileMap;
    }

    /**
     * Get the tile sheet type
     * @returns {Symbol} The tile sheet type
     */
    get type() {
      return this.#type === +TileMap.TYPE.PLATFORMER ? TileMap.TYPE.PLATFORMER : TileMap.TYPE.ISOMETRIC;
    }

    /**
     * Get the tile map size
     * @returns {number[]} The tile map dimensions in tiles
     */
    get tileSize() {
      return this.#tileSize;
    }

    /**
     * Get the associated `TileSheet`
     * @returns {TileSheet} The tile sheet containing the tiles
     */
    get sheet() {
        return this.#tileSheet;
    }

    /**
     * Render the tilemap to the renderer
     * @param {Renderer} renderer - The renderer (Canvas, WebGl, etc.) 
     * @param {number} time - Current world time
     * @param {number} deltaTime - Time since last frame
     */
    render(renderer, time, deltaTime) {
      
    }
}
