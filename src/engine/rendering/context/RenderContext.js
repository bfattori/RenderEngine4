/**
 * VectorRenderContext - Renders vector-style graphics using an intermediate language
 * Consumed by subclasses (Canvas, WebGL) for actual frame output
 * 
 * @extends RenderContext
 */
import Constants from '../../Constants.js';
import RenderEngine from '../../renderEngine4.js';

import ContextBase from './ContextBase.js';

import getAPI from '../api/RenderingAPI.js';
import IL from '../assemblers/IntermediateLanguages.js';

/**
 * @class RenderContext
 * 
 * Provides graphics rendering context implementing an intermediate language format
 * that is consumed by a renderer to produce the visual output. During scene
 * generation, the class will generate primitive instructions that reproduce 
 * drawing operations. This simplifies the communication, allowing for a variety of
 * renderers. 
 * 
 * This approach reduces the complexity of rendering operations and
 * simplifies integration, supporting shape container instructions for grouping multiple 
 * shapes into a single instruction, which can be useful for optimizing performance by 
 * reducing the number of draw calls.
 * 
 * @extends ContextBase
 */
export default class RenderContext extends ContextBase {
  static get DEFAULT_COLOR() {
    return Constants.VECTOR_DEFAULTS.LINE_COLOR;
  }

  static get DEFAULT_FILL_COLOR() {
    return Constants.VECTOR_DEFAULTS.FILL_COLOR;
  }

  static get DEFAULT_LINE_WIDTH() {
    return Constants.VECTOR_DEFAULTS.LINE_WIDTH;
  }

  static get DEFAULT_FONT_SIZE() {
    return Constants.VECTOR_DEFAULTS.FONT_SIZE;
  }

  static get MAX_FONT_SIZE() {
    return Constants.VECTOR_DEFAULTS.MAX_FONT_SIZE;
  }

  #screenDimensions = [800, 600];
  #worldDimensions = [800, 600];
  #api = null;

  /**
   * Creates a new VectorRenderContext instance
   * @constructor
   * @param {Renderer} renderer - The renderer for the context
   * @param {RenderConfig} options - Configuration options for the render context
   */
  constructor(renderer, options) {
    super(renderer, options);
  }

  get cursor() {
    return super.cursor;
  }

  // Adjust transformation
  set cursor([x, y]) {
    super.cursor = [x, y];
    this.setCursorPosition(x, y);
  }

  /**
   * Reset all render context state for a new frame
   */
  reset() {
    super.reset();
    this.clearInstructionBuffer();
    if (this.world?.stackDepth > 1) {
      console.verbose('Stack depth is greater than 1 at frame reset.')
    }
  }

  pushTransform(transform) {
    super.pushTransform(transform);
    this.addInstruction(`${IL.PUSH} ${transform ? transform.toCanvas() : ''}`);
  }

  popTransform() {
    const xfm = super.popTransform();
    this.addInstruction(`${IL.POP}`);
    return xfm;
  }

  resetTransforms() {
    super.resetTransforms();
    this.addInstruction(`${IL.XFORM_RESET}`);
  }

  setCursorPosition(x, y) {
    this.addInstruction(`${IL.TRANSLATE} ${x} ${y}`);
  }

  getAPI() {
    return getAPI.call(this);
  }

  //========================================
  // Renderer asset management

  //-----------------------------
  // tiles 
  //-----------------------------

  /**
   * Compile a set of tiles into the renderer. The renderer returns a set of opaque
   * ids representing the compiled tiles. The opaqueId's are used to reference
   * the tiles in the renderer.
   * 
   * @param {Array<Tile>} tiles - The set of tiles to compile into the renderer
   * @returns {Object} An object containing the tile name with opaque id
   */
  async compileTiles(tiles) {
    if (self.isGameThread)
      return await RenderEngine.pipeToMain.compileTiles(tiles);
    else {
      const results = {};
      tiles.forEach(tile => {
        results[tile.name] = this.compileTile(tile);
      });
      return results;
    }
  }

  /**
   * Compile a single tile into the renderer. The renderer returns an opaque
   * id representing the compiled tile. The opaqueId is used to reference
   * the tile in the renderer.
   * 
   * @param {Tile} tile - The tile to compile
   * @returns {number} The opaque Id assigned by the renderer
   */ 
  async compileTile(tile) {
    if (self.isGameThread)
      return await RenderEngine.pipeToMain.compileSprite(tile);
    else
      return this.renderer.compileSprite(tile);
  }

  /**
   * Tell the renderer to discard a tile
   * @param {number} opaqueId - The opaque id of the tile
   */
  destroyTile(opaqueId) {
    if (self.isGameThread)
      RenderEngine.pipeToMain.destroyTile(opaqueId);
    else
      this.renderer.destroyTile(opaqueId);
  }

  /**
   * Render the tiles to the positions specified in the tiles array. The positions are
   * relative to the top-left corner of the renderer's canvas.
   * 
   * @param {Array<Array<number>>} tiles - An array of 3 numbers: `[[opaqueId, x, y], ... ]`
   * @param {number} time - Current world time
   * @param {number} deltaTime - Time since last frame
   */
  renderTiles(tiles, time, deltaTime) {
    tiles.forEach(tile => this.renderTile(tile[0], tile[1], tile[2], time, deltaTime));
  }

  /**
   * Render the tile at the coordinates given.
   * 
   * @param {number} opaqueId - The opaque id that references the tile in the renderer
   * @param {number} time - Current world time
   * @param {number} deltaTime - Time since last frame
   */
  renderTile(opaqueId, x, y, time, deltaTime) {
    if (self.isGameThread)
      RenderEngine.pipeToMain.renderTile(opaqueId, x, y, time, deltaTime);
    else
      this.addInstruction(`${IL.TILE} ${opaqueId} ${x} ${y} ${time} ${deltaTime}`);
  }

  //-----------------------------
  // tile maps
  //-----------------------------

  /**
   * Compile the tile maps into the renderer
   * @param {Array<TileMap>} tileMaps - The array of tile maps to compile
   * @returns {Object} An object containing the tile map name with opaque id
   */
  async compileTileMaps(tileMaps) {
    if (self.isGameThread)
      return await RenderEngine.pipeToMain.compileTileMaps(tileMaps);
    else {
      const results = {};
      tileMaps.forEach(async (tileMap) => {
        results[tileMap.name] = await this.compileTileMap(tileMap);
      });
      return results;
    }
  }

  /**
   * Compile a single tile map into the renderer
   * @param {TileMap} tileMap - The tile map to compile
   * @returns {number} The opaque id that references the tile map on the renderer
   */
  async compileTileMap(tileMap) {
    if (self.isGameThread)
      return await RenderEngine.pipeToMain.compileTileMap(tileMap);
    else
      return this.renderer.compileTileMap(tileMap);
  }

  /**
   * Tell the renderer to discard a tile map
   * @param {number} opaqueId - The opaque id of the tile map
   */
  destroyTileMap(opaqueId) {
    if (self.isGameThread)
      RenderEngine.pipeToMain.destroyTileMap(opaqueId);
    else
      this.renderer.destroyTileMap(opaqueId);
  }

  /**
   * Render a tile map at the given coordinates (default: 0, 0)
   * @param {number} opaqueId - The opaque id of the tile map to render
   * @param {number} x - The x coordinate to render at
   * @param {number} y - The y coordinate to render at
   * @param {number} time - The current world time
   * @param {number} deltaTime - The time since last frame
   */
  renderTileMap(opaqueId, x = 0, y = 0, time, deltaTime) {
    this.addInstruction(`${IL.TILEMAP} ${opaqueId} ${x} ${y} ${time} ${deltaTime}`);
  }

  //-----------------------------
  // sprites
  //-----------------------------

  /**
   * Compile the sprites into the renderer
   * @param {Array<Sprite>} sprites - The array of sprites to compile
   * @returns {Object} An object containing the sprite name with opaque id
   */
  async compileSprites(sprites) {
    if (self.isGameThread)
      return await RenderEngine.pipeToMain.compileSprites(sprites);
    else {
      const results = {};
      sprites.forEach(async (sprite) => {
        results[sprite.name] = await this.compileSprite(sprite);
      });
      return results;
    }
  }

  /**
   * Compile a single sprite into the renderer
   * @param {Sprite} sprite - The sprite to compile
   * @returns {number} The opaque id that references the sprite on the renderer
   */
  async compileSprite(sprite) {
    if (self.isGameThread)
      return await RenderEngine.pipeToMain.compileSprite(sprite);
    else
      return this.renderer.compileSprite(sprite);
  }

  /**
   * Tell the renderer to discard a sprite
   * @param {number} opaqueId - The opaque id of the sprite
   */
  destroySprite(opaqueId) {
    if (self.isGameThread)
      RenderEngine.pipeToMain.destroySprite(opaqueId);
    else
      this.renderer.destroySprite(opaqueId);
  }

  /**
   * Render a sprite at the given coordinates
   * @param {number} opaqueId - The opaque id of the sprite to render
   * @param {number} x - The x coordinate to render at
   * @param {number} y - The y coordinate to render at
   * @param {number} time - The current world time
   * @param {number} deltaTime - The time since last frame
   */
  renderSprite(opaqueId, x, y, time, deltaTime) {
    this.addInstruction(`${IL.SPRITE} ${opaqueId} ${x} ${y} ${time} ${deltaTime}`);
  }

  //-------------------------------------
  // shapes - arbitrarty instructions
  //-------------------------------------
  
  /**
   * Compile the shapes into the renderer. The `shape` is an array of instructions to send to the
   * renderer. The `tag` identifies the shape in the system.
   * @param {Array<Object>} shapes - An array of vector shapes to compile: `[{ shape: Array<string>, tag: string }, ...]`
   * @returns {Object} An object containing the shape's tag name with opaque id
   */
  async getCompileShapes(shapes) {
    if (self.isGameThread)
      return await RenderEngine.pipeToMain.getCompiledShapes(shapes);
    else {
      const results = {};
      shapes.forEach(async ({instructions, tag}) => {
        results[tag] = await this.getCompiledShape(instructions, tag);
      });
      return results;
    }
  }

  /**
   * Compile a single shape into the renderer
   * @param {Array<String>} instructions - The instructions to render
   * @param {String} tag - The name of the shape
   * @returns {number} The opaque id that references the vector shape on the renderer
   */
  async getCompiledShape(instructions, tag) {
    if (self.isGameThread)
      return await RenderEngine.pipeToMain.getCompiledShape(instructions, tag);
    else
      return Promise.resolve(this.renderer.compileShape(instructions, tag));
  }

  /**
   * Tell the renderer to discard a compiled shape
   * @param {number} opaqueId - The opaque id of the sprite
   */
  async destroyCompiledShape(opaqueId) {
    if (self.isGameThread)
      return await RenderEngine.pipeToMain.destroyCompiledShape(opaqueId);
    else
      this.renderer.destroyCompiledShape(opaqueId);
  }

  /**
   * Render a compiled shape. A shape, unlike a sprite, is rendered at the current transform
   * in the renderer.
   * @param {number} opaqueId - The opaque id of the shape to render
   * @param {number} time - The current world time
   * @param {number} deltaTime - The time since last frame
   */
  renderCompiledShape(opaqueId, time, deltaTime) {
    this.addInstruction(`${IL.SHAPE} ${opaqueId} ${time} ${deltaTime}`);
  }

  //--------------------------------------
  // HIGH-LEVEL VECTOR API
  //--------------------------------------

  get API() {
    if (!this.#api) {
      this.#api = this.getAPI();
    }
    return this.#api;
  }
}
