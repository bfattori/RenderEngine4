import Console from './Console.js';
import GameObjectError from '../gameobject/GameObject.js';
import { IdentityMatrix } from './Matrix.js';

/**
 * GameWorld - Static class to contain game objects and manage their interactions
 */
class GameWorld {
  /**
   * Creates a new GameWorld instance
   * @param {Engine} engine - Reference to the Engine for global event access
   * @param {Camera} camera - The viewport camera
   * @param {RenderContext} renderContext - The rendering context
   */
  constructor(engine, camera, renderContext) {
    this._objects = []; // Array of GameObject instances
    
    // World-level data
    this._width = engine.options.world.dimensions[0];  // Default world width
    this._height = engine.options.world.dimensions[1]; // Default world height
    
    // Transform stack to manage coordinate transformations
    this._transformStack = [IdentityMatrix];  
     
    // Collision model reference
    this._worldCollisionModel = engine.collisionModel;
        
    // Collision events cache
    this._collisionEvents = [];

    // Tell the context about the world
    renderContext.world = this;

    // Store engine references
    this._engine = engine;
    this._camera = camera;
    this._renderContext = renderContext;
  }
  
  //--------------------------------
  // Getters and Setters
  //--------------------------------

  /**
   * Gets the reference to the Engine instance
   * @returns {Engine}
   */
  get engine() {
    return this._engine;
  }

  /**
   * Get the world camera
   * @returns {Camera} The world camera
   */
  get camera() {
    return this._camera;
  }

  /**
   * Get the world render context
   * @returns {RenderContext} The rendering context for the world
   */
  get renderContext() {
    return this._renderContext;
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
    this._worldCollisionModel = model;
  }
  
  /**
   * Get collision model for the world
   * @returns {Object|null}
   */
  get collisionModel() {
    return this._worldCollisionModel;
  }
  
  /**
   * Get world dimensions
   * @returns {Array} An array with two elements (width and height)
   */
  get dimensions() {
    return [this._width, this._height];
  }

  /**
   * Set world dimensions
   * @returns {Array} An array with two elements (width and height)
   */
  set dimensions([width, height]) {
    this._width = width;
    this._height = height;
  }

  /**
   * Get world width
   * @returns {number} The width of the world
   */
  get width() {
    return this._width;
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
    return this._height;
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
    return [...this._objects];
  }

  /**
   * Returns the current depth of the transform stack.
   * @returns {number} 
   */
  get stackDepth() {
    return this._transformStack.length;
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
    this._collisionEvents = [];
    
    // Update each GameObject in the world
    for (const object of this._objects) {
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
    if (!this._objects.includes(object)) {
        this._objects.push(object);
        
        if (this.eventEngine) {
          this.eventEngine.emit("objectAdded", {
            object: object,
            time: this.engine.time
          });
        }

        object.setWorld(this);        
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
    const index = this._objects.indexOf(object);
    if (index > -1) {
        this._objects.splice(index, 1);
        
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
    this._objects = [];
    this._transformStack = [];
    this._collisionEvents = [];
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
    for (const event of this._collisionEvents) {
      if (event.handler && typeof event.handler === 'function') {
        try {
          event.handler(event);
        } catch (error) {
          Console.error('GameWorld: Error in collision handler:', error);
        }
      }
    }
    this._collisionEvents = [];
  }
  
  /**
   * Add a pending collision event for later processing
   * @param {Object} event - The collision event to queue
   */
  queueCollisionEvent(event) {
    this._collisionEvents.push(event);
  }
  
  /**
   * Reset world transformations (clears transform stack)
   */
  resetTransforms() {
    this._transformStack = [IdentityMatrix];
  }
  
  /**
   * Push a transformation onto the stack
   * @param {Matrix2d} transformation - The transformation to push
   */
  pushTransformation(transformation) {
    const m = Matrix2d.
    this._transformStack.push(transformation);
  }
  
  /**
   * Pop the last transformation from the stack and restore it.
   * @returns {Matrix2d|null} The top-most transformation off the stack, or null if stack is empty
   */
  popTransformation() {
    if (this._transformStack.length === 0) throw new RenderEngineError('Cannot pop from an empty transform stack');
    return this._transformStack.pop();
  }

  /**
   * Peek at the top-most transformation in the stack.
   * @returns {Matrix2d|null} The last transformation in the stack, or null if stack is empty
   */
  peekTransformation() {
    if (this._transformStack.length === 0) {
      Console.error('Transform stack is empty!');
      return null;
    }
    return this._transformStack[this._transformStack.length - 1];
  }

}

// Export the GameWorld for use by Engine
export default GameWorld;
