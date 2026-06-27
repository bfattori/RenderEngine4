import Engine from './Engine.js';
import Console from './Console.js';

/**
 * EventEngine - A low-level pub/sub event system within the engine
 * Allows objects to produce events that other parts of the system can respond to
 */
export default class EventEngine {
  constructor() {
    // Map of event handlers: eventName -> Array of listener functions
    this.listeners = new Map();
  }
  
  /**
   * Get number of listeners for an event
   * @param {string} eventName - The name of the event to check
   * @returns {number}
   */
  getListenerCount(eventName) {
    return this.listeners.has(eventName) 
      ? this.listeners.get(eventName).length 
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
       * @param {string} eventName - The name of the event to listen for
       * @param {Function} listener - Function to be called when event is emitted
       */
      on(eventName, listener) {
        if (!this.listeners.has(eventName)) {
          this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(listener);
        
        // Return unsubscribe function for convenience
        return () => this.off(eventName, listener);
      },
      
      /**
       * Unsubscribe from an event within this GameObject's context
       * @param {string} eventName - The name of the event to unsubscribe from
       * @param {Function} listener - The listener function to remove (or null to remove all listeners)
       */
      off(eventName, listener = null) {
        if (!this.listeners.has(eventName)) return;
        
        const handlers = this.listeners.get(eventName);
        
        if (listener === null) {
          // Remove all listeners for this event
          this.listeners.delete(eventName);
        } else {
          // Remove specific listener
          const index = handlers.indexOf(listener);
          if (index > -1) {
            handlers.splice(index, 1);
          }
        }
      },
      
      /**
       * Publish an event to all listeners within this GameObject's context
       * @param {string} eventName - The name of the event to emit
       * @param {*} data - Data to pass along with the event
       */
      publish(eventName, data) {
        if (!this.listeners.has(eventName)) return;
        
        const handlers = this.listeners.get(eventName);
        for (const handler of handlers) {
          try {
            handler.call(this.gameObject, data);
          } catch (error) {
            // Don't crash the engine on a single listener error
            Console.error('EventEngine: Error in event handler:', eventName, error);
          }
        }
      },
      
      /**
       * Subscribe to an event from the global EventEngine (not limited to this GameObject)
       * @param {string} eventName - The name of the event to listen for globally
       * @param {Function} listener - Function to be called when event is emitted globally
       */
      subscribe(eventName, listener) {
        return Engine.ENGINE.eventEngine.on(eventName, listener);
      },
      
      /**
       * Publish an event to the global EventEngine (not limited to this GameObject)
       * @param {string} eventName - The name of the event to emit globally
       * @param {*} data - Data to pass along with the event
       */
      emit(eventName, data) {
        return Engine.ENGINE.eventEngine.emit(eventName, data);
      }
    };
    
    return context;
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - The name of the event to listen for
   * @param {Function} listener - Function to be called when event is emitted
   */
  on(eventName, listener) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(listener);
    
    // Return unsubscribe function for convenience
    return () => this.off(eventName, listener);
  }
  
  /**
   * Unsubscribe from an event
   * @param {string} eventName - The name of the event to unsubscribe from
   * @param {Function} listener - The listener function to remove (or null to remove all listeners)
   */
  off(eventName, listener = null) {
    if (!this.listeners.has(eventName)) return;
    
    const handlers = this.listeners.get(eventName);
    
    if (listener === null) {
      // Remove all listeners for this event
      this.listeners.delete(eventName);
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
   * @param {string} eventName - The name of the event to emit
   * @param {...*} args - Arguments to pass to all listeners
   */
  emit(eventName, ...args) {
    if (!this.listeners.has(eventName)) return;
    
    const handlers = this.listeners.get(eventName);
    for (const handler of handlers) {
      try {
        handler(...args);
      } catch (error) {
        // Don't crash the engine on a single listener error
        Console.error('EventEngine: Error in event handler:', eventName, error);
      }
    }
  }
  
  /**
   * Check if listeners exist for an event
   * @param {string} eventName - The name of the event to check
   * @returns {boolean}
   */
  has(eventName) {
    return this.listeners.has(eventName);
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
