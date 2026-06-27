/**
 * Base class for all game components.
 * Components provide functionality to GameObjects and are executed in priority order.
 */
import defaultPriority from '../constants.js';
import Engine from '../core/Engine.js';
import GameObjectError from '../gameobject/GameObject.js';

/**
 * ComponentPartError contains the {@link ComponentPart} related to the error.
 * @param {GameObject} component - The GameObject this error relates to.
 * @param {String} message - The error message.
 * @param {Error} rootCause - Optional root cause Error instance
 * @extends GameObjectError
 */
class ComponentPartError extends GameObjectError {
  constructor(component, message, rootCause) {
    super(component.host, message, rootCause);
    this.component = component;
  }
}

export default class ComponentPart {
  /**
   * Creates a new ComponentPart instance
   * @param {number} priority - Priority of execution (0.0 to 1.0, with 1.0 being highest)
   * @param {string} name - Optional name for this component
   */
  constructor(priority = defaultPriority, name = '') {
    this._priority = priority;
    this._name = name;
    this.__host = null; // The GameObject this component is attached to
    
    // Store the component type for identification
    this._type = this.constructor.name;

    /**
     * Reference to EventEngine's global event system
     * Components can publish/subscribe to global events through this interface
     */
    this._localEventContext = Engine.getEventEngine().createGameObjectContext(this);
  }

  //--------------------------------
  // Getters and Setters
  //--------------------------------

  /**
   * Sets the name of the component
   * @param {string} newName - The new name for the component
   */
  set name(newName) {
    this._name = newName;
  }

  /**
   * Gets the name of the component
   * @returns {string} The name of the component
   */
  get name() {
    return this._name;
  }

  /**
   * Initializes the component with a GameObject host. This is called when the component is added to a GameObject.
   * @param {GameObject} gameObject - The GameObject this component is attached to
   */
  set host(gameObject) {
    this.__host = gameObject;
  }

  /**
   * Gets the GameObject this component is attached to
   * @returns {GameObject|null} The host game object or null if not set
   */
  get host() {
    return this.__host;
  }

  /**
   * Gets the priority of this component for execution ordering
   * @returns {number} - Priority value (0.0 to 1.0)
   */
  get priority() {
    return this._priority;
  }

  /**
   * Sets the priority of this component
   * @param {number} newPriority - New priority value (0.0 to 1.0)
   */
  set priority(newPriority) {
    if (newPriority < 0 || newPriority > 1) {
      throw new ComponentPartError(this, 'Component priority must be between 0.0 and 1.0');
    }
    this._priority = newPriority;
  }

  /**
   * Gets the type of the component
   * @returns {string} The type of the component
   */
  get type() {
    return this._type;
  }

  /**
   * Gets a reference to the event context object (for advanced use)
   * @returns {Object|null} - The event context or null if not available
   */
  get eventContext() {
    return this._localEventContext;
  }

  //-------------------------------
  // Properties
  //-------------------------------

  /**
   * Gets the properties of this component as an object. Subclasses should override this to include specific properties.
   * @returns {Object} An object containing the component's properties
   */
  get properties() {
    return {
      name: this.name,
      _type: this.type,
      priority: this.priority
    };
  }

  //-------------------------------
  // Lifecycle Methods
  //-------------------------------

  /**
   * Updates the state of this component based on time and delta time
   * @param {number} time - Current world time
   * @param {number} deltaTime - Time elapsed since last update
   * @abstract Subclasses must implement this method to define specific update logic
   */
  update(time, deltaTime) {
    // Base class does nothing. Subclasses should implement specific logic.
    throw new ComponentPartError(this, 'ComponentPart.update() must be implemented by subclasses');
  }

  /**
   * Subscribe to an event within the component's GameObject context (local events)
   * @param {string} eventName - The name of the event to subscribe to
   * @param {Function} callback - Callback function when local event is published
   * @returns {Function} - Unsubscribe function that can be called to stop listening
   */
  on(eventName, callback) {
    return this._localEventContext.on(eventName, callback);
  }

  /**
   * Unsubscribe from a local event within the component's GameObject context
   * @param {string} eventName - The name of the event to unsubscribe from
   * @param {Function|null} callback - Callback function to remove (null removes all handlers for this event)
   */
  off(eventName, callback = null) {
    this._localEventContext.off(eventName, callback);
  }

  /**
   * Publish an event to the component's GameObject context (local events)
   * @param {string} eventName - The name of the event to publish
   * @param {*} data - Data to pass along with the event
   */
  emit(eventName, data) {
    return this._localEventContext.publish(eventName, data);
  }

  /**
   * Subscribe to a global event outside the component's GameObject context
   * @param {string} eventName - The name of the global event to subscribe to
   * @param {Function} callback - Callback function when global event is published
   * @returns {Function} - Unsubscribe function that can be called to stop listening
   */
  subscribeGlobal(eventName, callback) {
    return Engine.getEventEngine().subscribe(eventName, callback);
  }

  /**
   * Publish an event to the global EventEngine outside the component's GameObject context
   * @param {string} eventName - The name of the global event to publish
   * @param {*} data - Data to pass along with the event
   */
  emitGlobal(eventName, data) {
    return Engine.getEventEngine().emit(eventName, data);
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
   * Deserializes the component state. Subclasses should override this to handle specific properties.
   * 
   * @param {Object} data - Serialized component data to restore from
   * @param {Array} data.host - The component host
   * @param {number} data.name - The component name
   * @param {number} data.priority - Component priority value
   */
  deserialize(data) {
      if (data.host !== undefined) this.host = data.host;
      if (data.name !== undefined) this.name = data.name;
      if (data.priority !== undefined) this.priority = data.priority;
  }
}

export { 
  ComponentPartError
};