/**
 * VectorRenderContext - Renders vector-style graphics using an intermediate language
 * Consumed by subclasses (Canvas, WebGL) for actual frame output
 * 
 * @extends RenderContext
 */
import Constants from '../../Constants.js';

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

  set viewport(dims) {
    super.viewport = dims;
    this.renderer.init(this);
  }

  get viewport() {
    return super.viewport;
  }

  /**
   * Reset all render context state for a new frame
   */
  reset() {
    super.reset();
    this.clearInstructionBuffer();
    if (this.world?.stackDepth > 1) {
      console.warn('Stack depth is greater than 1 at frame reset.')
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

//-----------------------------
  // tiles & sprites
  //-----------------------------

  compileTiles(tiles) {
    const results = {};
    tiles.forEach(tile => {
      results[tile.name] = this.compileTile(tile);
    });
    return results;
  }

  compileTile(tile) {
    return this.renderer.compileSprite(tile);
  }

  renderTiles(tileIds, time, deltaTime) {
    tileIds.forEach(opaqueId => this.renderTile(opaqueId, time, deltaTime));
  }

  renderTile(opaqueId, time, deltaTime) {
    this.renderer.renderTile(opaqueId, time, deltaTime);
  }

  compileTileMaps(tileMaps) {
    const result = {};
    tileMaps.forEach(tileMap => {
      results[tileMap.name] = this.compileTileMap(tileMap);
    });
    return results;
  }

  compileTileMap(tileMap) {
    return this.renderer.compileTileMap(tileMap);
  }

  renderTileMap(opaqueId, time, deltaTime) {
    this.addInstruction(`${IL.TILEMAP} ${opaqueId}`);
  }

  compileSprite(sprite, tag) {
    return this.renderer.compileSprite(sprite, tag);
  }

  destroySprite(opaqueId) {
    this.renderer.destroySprite(opaqueId);
  }

  renderSprite(opaqueId, x, y, time, deltaTime) {
    this.addInstruction(`${IL.SPRITE} ${opaqueId} ${x} ${y}`);
    //this.renderer.renderSprite(opaqueId, x, y, time, deltaTime);
  }

  //-----------------------------
  // vector shapes
  //----------------------------
  
  getCompiledShape(instructions, tag) {
    return this.renderer.compile(instructions, tag);
  }

  destroyCompiledShape(opaqueId) {
    this.renderer.destroyCompiledShape(opaqueId);
  }

  renderCompiledShape(opaqueId) {
    this.addInstruction(`${IL.SHAPE} ${opaqueId}`);
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
