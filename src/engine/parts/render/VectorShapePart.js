import CompiledRenderPart from './CompiledRenderPart.js';
import VectorShape from '../../resources/VectorShape.js';

export default class VectorShapePart extends CompiledRenderPart {
  #currentShape = null;

  constructor(priority = Constants.RENDER_PRIORITY, name = 'VectorShapePart', shape) {
    super(priority, name);
    this.#currentShape = shape;
    this.stateName = VectorShape.DEFAULT_STATE;
  }

  /**
   * Set the name of the active state of the sprite. This can be used to change the appearance of the sprite at runtime. 
   * For sprites with only one state, no value or `Sprite.DEFAULT_STATE` are both acceptable.
   */
  set stateName(stateName) {
      this.shape.state = stateName;
  }

  /**
   * Returns the current state the shape is in.
   * @return {String} The state name of the shape or `VectorShape.DEFAULT_STATE`
   */
  get stateName() {
      return this.shape.currentState;
  }

  /**
   * Set the shape the component will render.
   *
   * @param {VectorShape} shape - The vector shape
   */
  set shape(shape) {
      this.#currentShape = shape;
      this.#calculateBoundingBox();
  }

  /**
   * Get the shape the component is rendering.
   *
   * @return {R.resources.types.Sprite} A <tt>R.resources.types.Sprite</tt> instance
   */
  get shape() {
      return this.#currentShape;
  }

  /**
   * Set the host bounding box to the bounding box of the vector shape.
   * @private
   */
  #calculateBoundingBox() {
      this.host.setBoundingBox(this.#currentShape.boundingBox);
  }

}