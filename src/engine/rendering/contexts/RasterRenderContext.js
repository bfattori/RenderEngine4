/**
 * VectorRenderContext - Renders vector-style graphics using an intermediate language
 * Consumed by subclasses (Canvas, WebGL) for actual frame output
 * 
 * @extends RenderContext
 */
import Constants from '../../Constants.js';
import RenderContext from './RenderContext.js';
import RasterTextParser from '../../ui/text/RasterTextParser.js';
import { Matrix2d } from '../../core/Matrix.js';
import { RASTER_IL } from '../assemblers/IntermediateLanguages.js';
import getAPI from './api/RasterAPI.js';

/**
 * @class ResterRenderContext
 * 
 * Provides vector-style graphics rendering using an intermediate language format
 * that is consumed by a rendering engine to produce the visual output. During scene
 * generation, the class will generate primitive instructions that reproduce vector
 * drawing operations. This simplifies the communication, allowing for a variety of
 * rendering engines. 
 * 
 * This approach reduces the complexity of rendering operations and
 * simplifies integration, supporting shape container instructions for grouping multiple 
 * shapes into a single instruction, which can be useful for optimizing performance by 
 * reducing the number of draw calls.
 * 
 * @extends RenderContext
 * @module RenderContext/VectorRenderContext
 */
export default class RasterRenderContext extends RenderContext {
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
    this.addInstruction(`${RASTER_IL.PUSH} ${transform ? transform.toCanvas() : ''}`);
  }

  popTransform() {
    const xfm = super.popTransform();
    this.addInstruction(`${RASTER_IL.POP}`);
    return xfm;
  }

  resetTransforms() {
    super.resetTransforms();
    this.addInstruction(`${RASTER_IL.XFORM_RESET}`);
  }

  setCursorPosition(x, y) {
    this.addInstruction(`${RASTER_IL.TRANSLATE} ${x} ${y}`);
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
    this.addInstruction(`${RASTER_IL.TILEMAP} ${opaqueId}`);
  }

  compileSprite(sprite, tag) {
    return this.renderer.compileSprite(sprite, tag);
  }

  destroySprite(opaqueId) {
    this.renderer.destroySprite(opaqueId);
  }

  renderSprite(opaqueId, x, y, time, deltaTime) {
    this.renderer.renderSprite(opaqueId, x, y, time, deltaTime);
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

  //-------------------------------
  // Properties
  //-------------------------------

  get properties() {
      return { ...super.properties, ...{
        API: this.API,

        _screenDimensions: this.#screenDimensions,
        _worldDimensions: this.#worldDimensions,

        DEFAULT_COLOR: RasterRenderContext.DEFAULT_COLOR,
        DEFAULT_LINE_WIDTH: RasterRenderContext.DEFAULT_LINE_WIDTH,
        DEFAULT_FILL_COLOR: RasterRenderContext.DEFAULT_FILL_COLOR,
        DEFAULT_COLOR: RasterRenderContext.DEFAULT_COLOR,
        DEFAULT_FONT_SIZE: RasterRenderContext.DEFAULT_FONT_SIZE,
      }};
  }

}
