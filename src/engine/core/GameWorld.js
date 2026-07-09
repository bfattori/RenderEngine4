import Console from './Console.js';
import GameObjectError from '../gameobject/GameObject.js';
import { Matrix2d, IdentityMatrix } from './Matrix.js';

/**
 * GameWorld - Static class to contain game objects and manage their interactions
 */
class GameWorld {
  #objects = [];
  #width = 0;
  #height = 0;
  #transformStack = [IdentityMatrix];
  #worldCollisionModel = null;
  #collisionEvents = [];
  #engine = null;
  #camera = null;
  #renderContext = null;

  /**
   * Creates a new GameWorld instance
   * @param {Engine} engine - Reference to the Engine for global event access
   * @param {Camera} camera - The viewport camera
   * @param {RenderContext} renderContext - The rendering context
   */
  constructor(engine, camera, renderContext) {
    // World-level data
    this.#width = engine.options.world.dimensions[0];  // Default world width
    this.#height = engine.options.world.dimensions[1]; // Default world height
    
    // Tell the context about the world
    renderContext.world = this;

    // Store engine references
    this.#engine = engine;
    this.#camera = camera;
    this.#renderContext = renderContext;
  }
  
  //--------------------------------
  // Getters and Setters
  //--------------------------------

  /**
   * Gets the reference to the Engine instance
   * @returns {Engine}
   */
  get engine() {
    return this.#engine;
  }

  /**
   * Get the world camera
   * @returns {Camera} The world camera
   */
  get camera() {
    return this.#camera;
  }

  /**
   * Get the world render context
   * @returns {RenderContext} The rendering context for the world
   */
  get renderContext() {
    return this.#renderContext;
  }

  /**
   * Gets the reference to the EventEngine instance
   * @returns {EventEngine}
   */
  get eventEngine() {
    return this.engine.eventEngine;
  }
    
  /**
   * Get the current world time (engine time)
   * @returns {number} Current game time in milliseconds
   */
  get time() {
    // Would be set by engine, currently returns 0 as default
    return this.engine.time || 0;
  }
  
  /**
   * Set collision model for the world
   * @param {Object} model - The collision model to use
   */
  set collisionModel(model) {
    this.#worldCollisionModel = model;
  }
  
  /**
   * Get collision model for the world
   * @returns {Object|null}
   */
  get collisionModel() {
    return this.#worldCollisionModel;
  }
  
  /**
   * Get world dimensions
   * @returns {Array} An array with two elements (width and height)
   */
  get dimensions() {
    return [this.#width, this.#height];
  }

  /**
   * Set world dimensions
   * @returns {Array} An array with two elements (width and height)
   */
  set dimensions([width, height]) {
    this.#width = width;
    this.#height = height;
  }

  /**
   * Get world width
   * @returns {number} The width of the world
   */
  get width() {
    return this.#width;
  }

  /**
   * Set the world width
   */
  set width(width) {
    this.dimensions = [width, this.height];
  }

  /**
   * Get the world height
   * @returns {number} The height of the world
   */
  get height() {
    return this.#height;
  }

  /**
   * Set the world height
   */
  set height(height) {
    this.dimensions = [this.width, height];
  }

  /**
   * Get all game objects in the world
   * @returns {GameObject[]}
   */
  get allObjects() {
    return [...this.#objects];
  }

  /**
   * Returns the current depth of the transform stack.
   * @returns {number} 
   */
  get stackDepth() {
    return this.#transformStack.length;
  }

  /**
   * Returns the current transform applied to the world
   */
  get currentTransform() {
    return this.peekTransformation();
  }

  //--------------------------------
  // Lifecycle Methods
  //--------------------------------

  /**
   * Update all game objects with current time and delta
   * @param {number} currentTime - Current game time in milliseconds
   * @param {number} deltaTime - Time since last update in milliseconds
   */
  update(currentTime, deltaTime) {
    // Clear previous collision events
    this.#collisionEvents = [];
    
    // Update each GameObject in the world
    for (const object of this.#objects) {
      try {
        if (object.update) {
          object.update(currentTime, deltaTime);
        }
      } catch (error) {
        Console.error('GameWorld: Error updating GameObject:', object.id || 'unnamed', error);
      }
    }
    
    // Process collision events
    this.processCollisionEvents();
  }

  /**
  * Add a game object to the world
  * @param {GameObject} object - The GameObject to add
  * @returns {GameObject}
  */
  addObject(object) {
    if (!this.#objects.includes(object)) {
        this.#objects.push(object);
        
        if (this.eventEngine) {
          this.eventEngine.emit("objectAdded", {
            object: object,
            time: this.engine.time
          });
        }

        object.world = this;        
        return object;
    }
    throw new GameObjectError(object, `GameObject ${object.id || 'unnamed'} already exists in world`);
  }

  /**
   * Remove a game object from the world
   * @param {GameObject} object - The GameObject to remove
   * @returns {boolean}
   */
  removeObject(object) {
    const index = this.#objects.indexOf(object);
    if (index > -1) {
        this.#objects.splice(index, 1);
        
        // Emit event through the event engine if available
        if (this.eventEngine) {
            this.eventEngine.emit('objectRemoved', { object: object, time: this.engine.time });
        }
        
        object.world = null;

        return true;
    }
    return false;
  }

  /**
   * Clear all game objects from the world
   */
  clear() {
    this.#objects = [];
    this.#transformStack = [];
    this.#collisionEvents = [];
  }

  /**
   * Shutdown the world and clean up resources
   */
  shutdown() {
    this.clear();
  }
      
  /**
   * Process and handle all pending collision events
   */
  processCollisionEvents() {
    for (const event of this.#collisionEvents) {
      if (event.handler && typeof event.handler === 'function') {
        try {
          event.handler(event);
        } catch (error) {
          Console.error('GameWorld: Error in collision handler:', error);
        }
      }
    }
    this.#collisionEvents = [];
  }
  
  /**
   * Add a pending collision event for later processing
   * @param {Object} event - The collision event to queue
   */
  queueCollisionEvent(event) {
    this.#collisionEvents.push(event);
  }
  
  /**
   * Reset world transformations (clears transform stack)
   */
  resetTransforms() {
    this.#transformStack = [IdentityMatrix];
  }
  
  /**
   * Push a transformation onto the stack
   * @param {Matrix2d} transformation - The transformation to push
   */
  pushTransformation(transformation) {
    this.#transformStack.push(transformation);
  }
  
  /**
   * Pop the last transformation from the stack and restore it.
   * @returns {Matrix2d|null} The top-most transformation off the stack, or null if stack is empty
   */
  popTransformation() {
    if (this.#transformStack.length === 0) throw new RenderEngineError('Cannot pop from an empty transform stack');
    return new Matrix2d(this.#transformStack.pop());
  }

  /**
   * Peek at the top-most transformation in the stack.
   * @returns {Matrix2d|null} The last transformation in the stack, or null if stack is empty
   */
  peekTransformation() {
    if (this.#transformStack.length === 0) {
      Console.error('Transform stack is empty!');
      return IdentityMatrix;
    }
    return new Matrix2d(this.#transformStack[this.#transformStack.length - 1]);
  }

}

// Export the GameWorld for use by Engine
export default GameWorld;
