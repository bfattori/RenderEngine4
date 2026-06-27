import Console from '../core/Console.js'
import RenderEngineError from '../core/RenderEngineError.js';

/**
 * GameObjectError contains the {@link GameObject} related to the error.
 * @param {GameObject} gameObject - The GameObject this error relates to.
 * @param {String} message - The error message.
 * @param {Error} rootCause - Optional root cause Error instance
 * @extends RenderEngineError
 */
class GameObjectError extends RenderEngineError {
  constructor(gameObject, message, rootCause) {
    super(message, rootCause);
    this.gameObject = gameObject;
  }
};

/**
 * A container for GameComponent(s) that define the behavior of an object in the game world.
 * Each GameObject can have multiple components attached to it, which are responsible for 
 * different aspects of its behavior such as position, rotation, scale, input, and rendering.
 */
export default class GameObject {
  /**
   * Creates a new GameObject instance
   * @param {string} name - The name of the game object (defaults to "GameObject###" with ### being the creation index)
   */
  constructor(name = 'GameObject') {
    // Generate default name if none provided
    if (!name || name.trim() === '') {
      const count = GameObject._nextId++;
      name = `GameObject${count}`;
    }
    
    this._name = name;
    this.components = [];
    this._componentMap = new Map();
    this._eventHandlers = new Map();
    this._gameWorld = null;
  }

  // -------------------------------
  // Getters and Setters
  // -------------------------------

  set name(name) {
    this._name = name;
  }

  get name() {
    return this._name;
  }

  /**
   * Sets the reference to the GameWorld this object belongs to
   * @param {GameWorld} world - The GameWorld instance to attach to
   */
  set world(world) {
    this._gameWorld = world;
  }

  get world() {
    return this._gameWorld;
  }

  /**
   * Gets all components in this GameObject (ordered by priority)
   * @returns {Array<GameComponent>} - Array of components ordered by priority
   */
  get allComponents() {
    // Sort components by priority (highest first)
    return [...this.components].sort((a, b) => {
      const aPriority = a.priority !== undefined ? a.priority : 0;
      const bPriority = b.priority !== undefined ? b.priority : 0;
      return bPriority - aPriority;
    });
  }

  //-------------------------------
  // Properties
  //-------------------------------

  get properties() {
    const componentProperties = this.allComponents.map(component => {
      return { type: component.type, properties: component.properties };
    });
    return {
      name: this._name,
      components: componentProperties
    }
  }

  //-------------------------------
  // Lifecycle Methods
  //-------------------------------

  /**
   * Adds a component to the game object
   * @param {GameComponent} component - The component to add
   * @returns {GameObject} - Returns this for chaining
   */
  addComponent(component) {
    // Validate that component is not null/undefined and has required methods
    if (!component || typeof component.update !== 'function') {
      throw new GameObjectError(this, `Invalid component: ${component.name} must have an update method`);
    }

    // Add to components array
    this.components.push(component);
    
    // Register component in the map for quick lookup by type
    const componentType = component.constructor.name;
    if (!this._componentMap.has(componentType)) {
      this._componentMap.set(componentType, []);
    }
    this._componentMap.get(componentType).push(component);
    
    component.host = this;
    return this;
  }

  /**
   * Removes a component from the game object
   * @param {GameComponent} component - The component to remove
   * @returns {boolean} - True if component was removed, false otherwise
   */
  removeComponent(component) {
    const index = this.components.indexOf(component);
    if (index === -1) {
      return false;
    }

    // Remove from components array
    this.components.splice(index, 1);
    
    // Remove from component map
    for (const [type, components] of this._componentMap.entries()) {
      const compIndex = components.indexOf(component);
      if (compIndex !== -1) {
        components.splice(compIndex, 1);
        break;
      }
    }

    component.host = null;
    return true;
  }

  /**
   * Gets all components of a specific type
   * @param {string} componentType - The constructor name of the component type to retrieve
   * @returns {Array<GameComponent>} - Array of components of the specified type
   */
  getComponentsByType(componentType) {
    return this._componentMap.get(componentType) || [];
  }

  /**
   * Updates the state of this game object based on time and delta time
   * @param {number} time - Current world time
   * @param {number} deltaTime - Time elapsed since last update
   */
  update(time, deltaTime) {
    // Update all components in priority order
    const sortedComponents = this.allComponents;
    
    for (const component of sortedComponents) {
      if (typeof component.update === 'function') {
        try {
          component.update(time, deltaTime);
        } catch (error) {
          Console.error(`Error updating component ${component.constructor.name}:`, error);
        }
      }
    }
  }

  /**
   * Publishes an event to all components in this game object
   * @param {string} eventName - The name of the event to publish
   * @param {*} data - Data to pass along with the event
   */
  publish(eventName, data) {
    // Get all handlers for this event
    const handlers = this._eventHandlers.get(eventName);
    
    if (handlers && handlers.length > 0) {
      // Call each handler with the provided data
      handlers.forEach(handler => {
        try {
          handler.call(this, data);
        } catch (error) {
          Console.error(`Error in event handler for ${eventName}:`, error);
        }
      });
    }
  }

  /**
   * Subscribes to an event from this game object's components
   * @param {string} eventName - The name of the event to subscribe to
   * @param {Function} callback - Callback function when event is published
   */
  on(eventName, callback) {
    if (!this._eventHandlers.has(eventName)) {
      this._eventHandlers.set(eventName, []);
    }
    
    // Add handler to the list for this event
    this._eventHandlers.get(eventName).push(callback);
  }

  /**
   * Removes an event subscription
   * @param {string} eventName - The name of the event to unsubscribe from
   * @param {Function} callback - Callback function to remove (if not provided, removes all handlers)
   */
  off(eventName, callback) {
    if (!callback) {
      // Remove all handlers for this event
      this._eventHandlers.delete(eventName);
      return;
    }
    
    const handlers = this._eventHandlers.get(eventName);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  //-------------------------------
  // Serialization Methods
  //-------------------------------

  /**
   * Serializes a game component's properties into a plain object. Subclasses should override this to include specific properties.
   * 
   * @param {...string} ignoreKeys - Optional list of property keys to ignore during serialization
   * @returns {Object} Serialized representation of the component's properties, excluding any specified keys
   * @example
   * // In a subclass, you might implement serialize like this:
   * serialize() {
   *     return {
   *         ...super.serialize('temporaryState'), // Ignore 'temporaryState' from base properties
   *         customProperty: this.customProperty
   *     };
   * }
   */
  serialize(...ignoreKeys) {
      return Engine.ENGINE.serialize.call(this, ...ignoreKeys);
  }

  /**
   * Deserializes the GameObject state. Subclasses should override this to handle specific properties.
   * 
   * @param {Object} data - Serialized component data to restore from
   * @param {Array} data.host - The component host
   * @param {number} data.name - The component name
   * @param {number} data.priority - Component priority value
   */
  deserialize(data) {
    if (data.name !== undefined) this.name = data.name;  
  }
}

// Static counter for generating unique names
GameObject._nextId = 0;

export {
  GameObjectError
};