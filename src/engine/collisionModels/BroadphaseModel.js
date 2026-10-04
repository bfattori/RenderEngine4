import RenderEngineError from '../core/RenderEngineError.js';
import Enum from '../core/Enum.js';
import Engine from '../core/Engine.js';
import { TransformEvent } from '../parts/transform/Transform2dPart.js';

/**
 * A list of {@link GameObject}s that are potentially in collision, determined
 * by querying the broadphase collision model for objects. Broadphase is intended
 * to quickly eliminate objects from the set of colliding objects by excluding
 * areas of the world that could not impact the coordinates provided.
 * 
 * @param {number} x - The X world coordinate tested
 * @param {number} y - The Y world coordinate tested
 * @param {Array<GameObject>} collisions - The list of GameObjects that are potentially in collision
 */
class PotentialCollisionList {
  #x;
  #y;
  #collisions;

  constructor(x, y, collisions) {
    this.#x = x;
    this.#y = y;
    this.#collisions = collisions;
  }

  /**
   * The X world coordinate
   * @returns {number}
   */
  get x() {
    return this.#x;
  }

  /**
   * The Y world coordinate
   * @returns {number}
   */
  get y() {
    return this.#y;
  }

  /**
   * The list of GameObjects potentially in collision
   * @returns {Array<GameObject>}
   */
  get collisions() {
    return this.#collisions;
  }
}

export { PotentialCollisionList };

/**
 * Broadphase collision models are intended to rapidly assemble a list of objects
 * into a {@link PotentialCollisionList} for testing. This is effective for eliminating large numbers 
 * of tests for objects that are not likely to collide.
 * 
 * @class BroadphaseModel
 * @param {String} name - The name of the model
 * @param {BroadphaseModel#ACCURACY} accuracy - The model accuracy (LOW, MEDIUM, or HIGH) 
 */
export default class BroadphaseModel {
  #name = null;
  #accuracy; 

  /**
   * The model accuracy, where LOW is intended to return quick results with minimal overhead.
   * MEDIUM increases compute time, but balances it with speed in returning results. HIGH can take
   * the most amount of time to compute, but returns the most inclusive list of possible results.
   * @type {Enum}
   */
  static ACCURACY = new Enum('LOW', 'MEDIUM', 'HIGH');

  constructor(name = 'broadphase', accuracy = BroadphaseModel.ACCURACY.LOW) {
    this.#name = name;
    this.#accuracy = accuracy;

    // listen for objects moving within the world
    Engine.eventEngine.on(TransformEvent, event => { this.#onTransformEvent(event); });
  }

  /**
   * Returns the name of the model
   * @returns {String}
   */
  get name() {
    return this.#name;
  }

  /**
   * Set the name of the model
   * @param {String} name - The model name
   */
  set name(name) {
    this.#name = name;
  }

  /**
   * Get the model accuracy
   * @returns {BroadphaseModel#ACCURACY}
   */
  get accuracy() {
    return this.#accuracy;
  }

  /**
   * Set the accuracy of the model
   * @param {BroadphaseModel#ACCURACY} accuracy - The model accuracy
   */
  set accuracy(accuracy) {
    this.#accuracy = accuracy;
  }

  /**
   * When an object transforms within the world, this method is called to update the model.
   * This method should be overridden by subclasses to implement specific collision detection logic.
   * @param {TransformEvent} txfmEvent - The transform event
   */
  #onTransformEvent(txfmEvent) {
    this.updateModel(txfmEvent.part.host, txfmEvent.consume(this));
  }

  /**
   * Returns `true` if the game object is located within the model. Otherwise, returns `false`.
   * @param {GameObject} gameObject - The game object to locate
   * @returns {boolean} 
   */
  inModel(gameObject) {
    return false;
  }

  /**
   * Returns an array of objects that could potentially be colliding given
   * the coordinates provided. Depending on accuracy, the number of returned objects may vary.
   * 
   * @param {number} x - X position in world coordinates 
   * @param {number} y - Y position in world coordinates
   * @returns {PotentialCollisionList} An object containing the test point and the possible collision objects around that point
   */
  getPotentialCollisionList(x, y) {
    return null;
  }

  /**
   * Update an object in the broadphase model
   * @param {GameObject} gameObject - The game object being updated
   * @param {Matrix2d} matrix - A matrix representing the object's world transformation.
   */
  updateModel(gameObject, matrix) {
    throw new RenderEngineError("BroadphaseModel does not implement updateModel() directly");
  }
}