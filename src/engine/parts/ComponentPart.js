/**
 * Base class for all game components.
 * Components provide functionality to GameObjects and are executed in priority order.
 */
import Constants from '../Constants.js';
import Engine from '../core/Engine.js';
import RenderEngineError from '../core/RenderEngineError.js';
import { Event } from '../core/EventEngine.js';

class ComponentPartEvent extends Event {
    #part = null;
    constructor(part, time, deltaTime) {
        super(time, deltaTime);
        this.#part = part;
    }

    get part() {
      return this.#part;
    }

    get priority() {
      return this.#part.priority;
    }

    consume(consumer) {
        super.consume(consumer);
        return null;
    }
}

/**
 * ComponentPartError contains the {@link ComponentPart} related to the error.
 * @param {GameObject} component - The GameObject this error relates to.
 * @param {String} message - The error message.
 * @param {Error} rootCause - Optional root cause Error instance
 * @extends GameObjectError
 */
class ComponentPartError extends RenderEngineError {
  constructor(component, message, rootCause) {
    super(message, rootCause);
    this.gameObject = component.host;
    this.component = component;
  }
}

class ComponentPart {
  #priority = 0;
  #name = null;
  #host = null;
  #type = null;
  #localEventContext = null;
  #cachedEvents = [];

  /**
   * Creates a new ComponentPart instance
   * @param {number} priority - Priority of execution (0.0 to 1.0, implying order of execution, with 0.0 being first and 1.0 being last)
   * @param {string} name - Optional name for this component
   */
  constructor(priority = Constants.defaultPriority, name = '') {
    this.#priority = priority;
    this.#name = name;
    
    // Store the component type for identification
    this.#type = this.constructor.name;
  }

  //--------------------------------
  // Getters and Setters
  //--------------------------------

  /**
   * Sets the name of the component
   * @param {string} newName - The new name for the component
   */
  set name(newName) {
    this.#name = newName;
  }

  /**
   * Gets the name of the component
   * @returns {string} The name of the component
   */
  get name() {
    return this.#name;
  }

  /**
   * Initializes the component with a GameObject host. This is called when the component is added to a GameObject.
   * @param {GameObject} gameObject - The GameObject this component is attached to
   */
  set host(gameObject) {
    this.#host = gameObject;
    this.#localEventContext = this.host.eventContext;
    this.#processCachedEvents();
  }

  /**
   * Gets the GameObject this component is attached to
   * @returns {GameObject|null} The host game object or null if not set
   */
  get host() {
    return this.#host;
  }

  get world() {
    return this.#host.world;
  }

  /**
   * Gets the priority of this component for execution ordering
   * @returns {number} - Priority value (0.0 to 1.0)
   */
  get priority() {
    return this.#priority;
  }

  /**
   * Sets the priority of this component
   * @param {number} newPriority - New priority value (0.0 to 1.0)
   */
  set priority(newPriority) {
    if (newPriority < 0 || newPriority > 1) {
      throw new ComponentPartError(this, 'Component priority must be between 0.0 and 1.0');
    }
    this.#priority = newPriority;
  }

  /**
   * Gets the type of the component
   * @returns {string} The type of the component
   */
  get type() {
    return this.#type;
  }

  //-------------------------------
  // Internal Event Queue
  //-------------------------------

  /**
   * Connect event handlers when the host has been set.
   */
  #processCachedEvents() {
    while (this.#cachedEvents.length > 0) {
      const eventClass = this.#cachedEvents.shift();
      this.#localEventContext.on(eventClass, this.#eventHandler.bind(this));
    }
  }

  /**
   * Internal method to bubble events to the sub-classes.
   * @param {String} eventName - The event name 
   * @param {*} data - The event data
   * @private
   */
  #eventHandler(eventObject) {
    this.onEvent(eventObject);
  }

  /**
   * Fired when a subscribed event is received by the component. 
   * This method should be overridden in subclasses to handle specific events.
   * @param {String} eventName - The name of the event that was received 
   * @param {*} data - The related event data
   */
  onEvent(eventObject) {
    return eventObject.priority > this.priority;
  }

  /**
   * Subscribe to an event by class
   * @param {Class} eventClass - The class of the event to listen for
   */
  on(eventClass) {
    if (!this.#localEventContext) {
      this.#cachedEvents.push(eventClass.name);
    } else {
      this.#localEventContext.on(eventClass.name, this.#eventHandler.bind(this));
    }
  }

  /**
   * Unsubscribe from an event by class
   * @param {Class} eventClass - The class of the event to stop listening for
   */
  off(eventClass) {
    if (!this.#localEventContext)
      throw new ComponentPartError(this, "Component does not have a local event context! Cannot unbind event.");

    this.#localEventContext.off(eventClass.name, this.#eventHandler);
  }

  /**
   * Publish an event internally to the {@link GameObject} so other components can
   * execute on state changes within the game object, free from the outside world (local events)
   * @param {Event} eventObject - An event to publish to the internal event context.
   */
  emit(eventObject) {
    return this.#localEventContext.emit(eventObject);
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
      return Engine.engine.serialize.call(this, ...ignoreKeys);
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

  destroy() {
    if (this.host) {
      this.host.removeComponent(this);
    }
    this.#type = null;
    this.#localEventContext = null;
  }
}

export default ComponentPart;

export { 
  ComponentPartError,
  ComponentPartEvent
};