import Engine from './Engine.js';
import Console from './Console.js';

/**
 * Event base class from which all other events derive
 */
class Event {
    #timestamp = {
        time: 0,
        deltaTime: 0
    };
    #eventType = null;
    #consumed = [];
    #published = 0;

    /**
     * Construct a new event with an event name and timestamp for the event's creation.
     * @param {number} time 
     * @param {number} deltaTime 
     */
    constructor(time, deltaTime) {
        this.#eventType = this.constructor;
        this.#timestamp.time = time;
        this.#timestamp.deltaTime = deltaTime;
    }

    /**
     * Returns the event type class.
     * @returns {Class} The event class type
     */
    get type() {
        return this.#eventType;
    }

    /**
     * The timestamp containing both the time and delta time the event was created.
     * @return {number}
     */
    get timestamp() {
        return this.#timestamp;
    }

    /**
     * Returns the time, in milliseconds, at which the event was created.
     * @returns {number}
     */
    get time() {
        return this.#timestamp.time;
    }

    /**
     * Returns the delta time, in milliseconds, between the current frame and the previous one.
     * @returns {number}
     */
    get deltaTime() {
        return this.#timestamp.deltaTime;
    }

    /**
     * Implemented by subclasses to return the data relevant to the event.
     * @param {Object} consumer - The object that consumed the event
     * @returns {Object} A serializable object
     */
    consume(consumer) {
      this.#consumed.push({consumer: consumer, time: performance.now()});
      return null;
    }

    /**
     * The event engine will set this time when the event is published
     */
    get published() {
      this.#published = performance.now();
    }

    /**
     * Returns some consumable metrics to gauge performance. This is useful for debugging and performance analysis.
     * @returns {Object} An object containing metrics such as time at access, delta invocation time, and the event's internal timestamp.
     */
    get metrics() {
      if (this.#consumed === 0) return {};
      return {
         type: this.type,
         published: this.published,
         timeAtAccess: this.#consumed,
         deltaInvocation: this.#consumed - this.time,
         timestamp: this.timestamp
      }
    }
}

export { Event };

/**
 * EventEngine - A low-level pub/sub event system within the engine
 * Allows objects to produce events that other parts of the system can respond to
 */
export default class EventEngine {
  static #instance = null;

  constructor() {
    // Map of event handlers: eventName -> Array of listener functions
    this.listeners = new Map();
    EventEngine.#instance = this;
  }
  
  static getInstance() {
    return EventEngine.#instance;
  }

  /**
   * Get number of listeners for an event
   * @param {Class} eventClass - The class of the event to check
   * @returns {number}
   */
  getListenerCount(eventClass) {
    return this.listeners.has(eventClass) 
      ? this.listeners.get(eventClass).length 
      : 0;
  }

  
  /**
   * Creates a sandboxed event context for a specific GameObject
   * @param {GameObject} gameObject - The game object to create a context for
   * @returns {Object} - A sandboxed event context with methods for publishing/subscribing events within the GameObject scope
   */
  createGameObjectContext(gameObject) {
    // Create an event context that operates within the GameObject's scope
    const context = {
      gameObject: gameObject,
      listeners: new Map(),
      
      /**
       * Subscribe to an event within this GameObject's context
       * @param {Class} eventClass - The class of the event to listen for
       * @param {Function} listener - Function to be called when event is emitted
       */
      on(eventClass, listener) {
        if (!this.listeners.has(eventClass)) {
          this.listeners.set(eventClass, []);
        }
        this.listeners.get(eventClass).push(listener);
        
        // Return unsubscribe function for convenience
        return () => this.off(eventClass, listener);
      },
      
      /**
       * Unsubscribe from an event within this GameObject's context
       * @param {Class} eventClass - The class of the event to unsubscribe from
       * @param {Function} listener - The listener function to remove (or null to remove all listeners)
       */
      off(eventClass, listener = null) {
        if (!this.listeners.has(eventClass.name)) return;
        
        const handlers = this.listeners.get(eventClass.name);
        
        if (listener === null) {
          // Remove all listeners for this event
          this.listeners.delete(eventClass.name);
        } else {
          // Remove specific listener
          const index = handlers.indexOf(listener);
          if (index > -1) {
            handlers.splice(index, 1);
          }
        }
      },
      
      /**
       * Emit an event to all listeners within this GameObject's context
       * @param {Event} eventObject - The event to emit
       */
      emit(eventObject) {
        if (!this.listeners.has(eventObject.type.name)) return;
        
        const handlers = this.listeners.get(eventObject.type.name);
        for (const handler of handlers) {
          try {
            handler(eventObject);
          } catch (error) {
            // Don't crash the engine on a single listener error
            Console.error('EventEngine: Error in event handler:', eventObject.type.name, error);
          }
        }
      },
      
      /**
       * Subscribe to an event from the global EventEngine (not limited to this GameObject)
       * @param {Class} eventClass - The class of the event to listen for globally
       * @param {Function} listener - Function to be called when event is emitted globally
       */
      subscribe(eventClass) {
        return Engine.ENGINE.eventEngine.on(eventClass, listener);
      },
      
      /**
       * Publish an event to the global EventEngine (not limited to this GameObject)
       * @param {Event} eventObject - The name of the event to emit globally
       */
      publish(eventObject) {
        return Engine.ENGINE.eventEngine.emit(eventObject);
      }
    };
    
    return context;
  }

  /**
   * Subscribe to an event
   * @param {Class} eventClass - The class of the event to listen for
   * @param {Function} listener - Function to be called when event is emitted
   */
  on(eventClass, listener) {
    if (!this.listeners.has(eventClass)) {
      this.listeners.set(eventClass, []);
    }
    this.listeners.get(eventClass).push(listener);
    
    // Return unsubscribe function for convenience
    return () => this.off(eventClass, listener);
  }
  
  /**
   * Unsubscribe from an event
   * @param {Class} eventClass - The class of the event to unsubscribe from
   * @param {Function} listener - The listener function to remove (or null to remove all listeners)
   */
  off(eventClass, listener) {
    if (!this.listeners.has(eventClass)) return;
    
    const handlers = this.listeners.get(eventClass);
    
    if (listener === null) {
      // Remove all listeners for this event
      this.listeners.delete(eventClass);
    } else {
      // Remove specific listener
      const index = handlers.indexOf(listener);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  /**
   * Emit an event to all listeners
   * @param {Event} eventObject - The event to emit
   */
  emit(eventObject) {
    if (!this.listeners.has(eventObject.type)) return;
    eventObject.published;
    
    const handlers = this.listeners.get(eventObject.type);
    for (const handler of handlers) {
      try {
        handler(eventObject);
      } catch (error) {
        // Don't crash the engine on a single listener error
        Console.error('EventEngine: Error in event handler:', eventObject.type, error);
      }
    }
  }
  
  /**
   * Check if listeners exist for an event
   * @param {Class} eventClass - The name of the event to check
   * @returns {boolean}
   */
  has(eventClass) {
    return this.listeners.has(eventClass);
  }
  
 
  /**
   * Clear all listeners
   */
  clear() {
    this.listeners.clear();
  }

  /**
   * Shutdown the event engine
   */
  shutdown() {
    this.clear();
  }
}
