
import Constants from '../../Constants.js';
import RenderPart from './RenderPart.js';

export default class TileMapPart extends RenderPart {
  #tileMap;
  
  constructor(priority = Constants.RENDER_PRIORITY, name = 'TileMapPart', tileMap) {
      super(priority, name);
      this.#tileMap = tileMap;
  }

  /**
   * Set the tile map for the world (when using raster contexts)
   * @param {TileMap} tileMap - The new tile map to set
   */
  set map(tileMap) {
    this.#tileMap = tileMap;
  }

  /**
   * Get the tile map for the world (when using raster contexts)
   * @returns {TileMap} - The current tile map
   */
  get map() {
    return this.#tileMap;
  }

  draw(time, deltaTime) {
    if (this.tileMap !== null) {
      this.context.API.pushTransform(this.renderTransform);
      this.context.renderTileMap(this.map.opaqueId, 0, 0, time, deltaTime);
      this.context.API.popTransform();
    }
  }

}