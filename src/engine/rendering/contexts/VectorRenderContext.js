/**
 * VectorRenderContext - Renders vector-style graphics using an intermediate language
 * Consumed by subclasses (Canvas, WebGL) for actual frame output
 * 
 * @extends RenderContext
 */
import Constants from '../../Constants.js';
import RenderContext from './RenderContext.js';
import processText from '../../ui/VectorText.js';
import { IdentityMatrix, Matrix2d } from '../../core/Matrix.js';
import { VECTOR_IL } from '../assemblers/IntermediateLanguages.js';
import getAPI from './api/VectorAPI.js';

/**
 * @class VectorRenderContext
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
export default class VectorRenderContext extends RenderContext {
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
   * @param {Object} options - Configuration options for the render context
   * @param {number} [options.screenDimensions=[800,600]] - The viewport dimensions
   * @param {number} [options.worldDimensions=[800,600]] - The world dimensions
   * @param {number} [options.maxPlanes=3] - The number of rendering planes
   * @param {boolean} [options.enableCulling=true] - Whether culling is enabled
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

  set screenDimensions(dims) {
    super.viewport = dims;
    this.renderer.init(this);
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
    this.addInstruction(`${VECTOR_IL.PUSH} ${transform ? transform.toCanvas() : ''}`);
  }

  popTransform() {
    const xfm = super.popTransform();
    this.addInstruction(`${VECTOR_IL.POP}`);
    return xfm;
  }

  resetTransforms() {
    super.resetTransforms();
    this.addInstruction(`${VECTOR_IL.XFORM_RESET}`);
  }

  setCursorPosition(x, y) {
    this.addInstruction(`${VECTOR_IL.TRANSLATE} ${x} ${y}`);
  }

  getAPI() {
    return getAPI.call(this);
  }

  renderCompiledShape(opaqueId) {
    super.renderCompiledShape(opaqueId);
    this.addInstruction(`${VECTOR_IL.SHAPE} ${opaqueId}`);
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
