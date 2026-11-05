import { NOP, ENGINE_ERRORS } from '../../Constants.js';
import Util from '../Util.js';

/**
 * Options Configuation
 */
export default class Config {
    #opts = {};

    /**
     * Construction an options configuration. Each property of the `opts` 
     * object will be accessible by name as a getter.
     * @param {Object} defaults - The options with compile-time configured values
     * @param {Object} overrides - The options to override the defaults
     */
    constructor(defaults = {}) {    
      if (defaults instanceof Config) {
          this.merge(defaults.opts);
      } else {
          this.merge(defaults);
      }

      if (this.varname) {
        // setting the variable name in the Window/global scope
        // configures global-scoped runtime overrides
        const overrides = self[this.varname];
        this.merge(overrides);
      }
    }

    get varname() {
      return undefined;
    }

    /**
     * Merge this config with another object containing values that should override the current ones.
     * It instruments the `Config` with getters and setters for the properties in the incoming configuration.
     * @param {Object} incoming - Incoming config object
     */
    merge(incoming = {}) {
        const merged = Util.deepMerge(this.#opts, incoming);
        this.#opts = merged;
        Util.lombok(this, merged);
    }

    /**
     * Retrieve the options from this configuation
     * @returns {Object} The configuration obptions
     */
    get opts() {
        return this.#opts;
    }

    /**
     * Set the options for this configuration
     * @param {Object} options - The new options to set
     */
    set opts(options) {
        this.#opts = options;
    }
}

class EngineConfig extends Config {
  constructor() {
    super({
      /**
       * Feature flags
       */
      flags: {
        /**
         * Enable to track performance in the Browser's "Performance" tab.
         * @type {boolean}
         */
        trackPerformance: false,
        /**
         * Process pragmas in the engine (debug blocks)
         * @type {boolean}
         */
        pragmaDebugging: true,
        /** 
         * Enable engine debugging mode. Default is false.
         * @type {boolean}
         */
        debugMode: false,
        /**
         * Enable debug mode to use these options
         */
        debugOpts: {
            objectOrigins: true,
            boundingBoxes: false,
            collisionSep: false,
            charOrigin: false,
            showParticleWorkersPiP: false,
            showParticleEngineLoad: false,
            showParticleAffectors: false
        },
        /**
         * Enable performance logging for rendering and collision events. Default is false.
         * @type {boolean}
         */
        performanceLogging: false,
        /**
         * Display the current FPS, target FPS, and frame time on screen. Default is false.
         * @type {boolean}
         */
        showFps: false,
        /**
         * Disables the particle engine if not needed. Default is `false`.
         * @type {boolean}
         */
        particleEngineDisabled: false,
        
        /**
         * Enable and disable threading systems
         */
        threading: {
          particles: false,
          collisions: false,
          rendering: false
        }
      },
      engineOpts: {
        preventThreadCaching: true,
        preventScriptCaching: true,
      },
      /**
       * World configuration options.
       */
      world: {
        /**
         * Desired frames per second for rendering. Default is 60.
         * @type {number}
         */
        fps: 60,
        /**
         * Default time to start the engine with
         * @type {number}
         */
        seedTime: 0,
        /**
         * World dimensions: 
         *   {width: number, height: number}
         * @type {Object} 
         */
        dimensions: {width: 800, height: 600},
        /**
         * Viewport dimensions:
         *    {left: number, top: number, width: number, height: number}
         * @type {Object}
         */
        viewport: {left: 0, top: 0, width: 800, height: 600},
        /**
         * Background color of the game world. Default is 'black'.
         * @type {string} 
         */
        backgroundColor: 'black',
        /**
         * Number of render planes to use. Default is 3.
         * @type {number}
         */
        renderPlanes: 3,
        /**
         * World camera
         * @type {Camera}
         */
        camera: null,
        /**
         * World render context
         * @type {RenderContext}
         */
        renderContext: null,
        /**
         * The collision model for the engine. Default is {@link AABBCollisionModel}
         * @type {CollisionModel}
         */
        collisionModel: null
      },
      /**
       * Engine hooks. These are callback functions that can be used to hook into the engine lifecycle and runtime events.
       * @type {Object}
       */
      hooks: {
          //--------------------------------------------------
          // Licecycle hooks - no arguments, no return value

          /** 
           * Callback function executed after initialization. Default is No-op. 
           */
          onInit: NOP,
          /** 
           * Callback function executed when the engine starts. Default is No-op. 
           */
          onStart: NOP,
          /** 
           * Callback function executed when the engine stops. Default is No-op. 
           */
          onStop: NOP,
          /** 
           * Callback function executed when the engine is reset. Default is No-op. 
           */
          onReset: NOP,
          /** 
           * Callback function executed when the engine exits. Default is No-op. 
           */
          onShutdown: NOP,
          /**
           * Callback function executed when the engine is paused. Default is No-op.
           */
          onPause: NOP,
          /**
           * Callback function executed when the engine is stepped. Default is No-op.
           */
          onStep: NOP,
          
          //-----------------------------
          // Stateful runtime hooks

          /** 
           * Callback function executed when the engine experiences an error. 
           */
          onError: ENGINE_ERRORS,

          /**
           * Triggered when a world collision event occurs.
           * @param {CollisionData} collisionData - Collision data containing information about the collision. See {@link }
           */
          onCollision: (collisionData) => {},

          // --------------------------
          // FRAME LIFECYCLE HOOKS
          // --------------------------

          /**
           * Triggered at the start of a frame.
           * @param {number} time - The performance time at the start of the frame
           * @param {number} frameNumber - The current frame number
           */
          onBeforeFrame: (time, frameNumber) => {},

          /**
           * Triggered before world update.
           * @param {number} deltaTime - The delta time since the beginning of frame generation
           */
          onBeforeUpdate: (deltaTime) => {},

          /**
           * Triggered after world update.
           * @param {number} deltaTime - The delta time since the beginning of frame generation
           * @param {number} updateTime - The total time to update the world.
           */
          onUpdate: (deltaTime, updateTime) => {},

          /**
           * Triggered before frame rendering.
           * @param {number} deltaTime - The delta time since the beginning of frame generation
           */
          onPreRender: (deltaTime) => {},

          /**
           * Triggered after frame rendering.
           * @param {number} deltaTime - The delta time since the last frame beginning of frame generation
           * @param {number} renderTime - The total time to render the frame.
           */
          onRender: (deltaTime, renderTime) => {},

          /**
           * Triggered at the end of a frame.
           * @param {number} frameNumber - The current frame number
           * @param {number} time - The performance time at the end of the frame
           * @param {number} fps - The current frames per second
           * @param {Object} stats - An object containing performance statistics for the frame
           */
          onFrame: (time, frameNumber, fps, stats) => {}
      },
      system: {
        engineLocation: null,
        startupLocation: null,
        gameLocation: null
      }
    });
  }

  get varname() {
    return 'ENGINE_OPTIONS';
  }
}

class SparkHeapConfig extends Config {
    constructor(overrides = {}) {
        super({
          name: 'SystemMemory',
          /**
           * This is the maximum sized value that will be
           * stored in the heap for all data types.
           * @type {number}
           */
          baseUnit: 4,  // SparkHeap.BYTE_32

          /**
           * The total amount of memory to reserve in bytes.
           * @type {number} The number of bytes to allocate
           */
          heapSize: 524288, // 512KB

          /**
           * Balance the amount of memory to favor the
           * most used type. Zero indicates equal distribution.
           * @type {number} A percentage
           */
          reserveSize: 0.65,

          /**
           * The offset (in base units) between memory segments.
           * @type {number}
           */
          boundaryElementOffset: 5,
          
          /**
           * When set to `true`, `SparkHeap` will throw `SparkError` when memory is 
           * unavailable to allocate. Otherwise, the head pointer for the segment is reset 
           * to zero allowing for endless allocations. The latter method is destructive in 
           * that it overwrites memory that is possibly in use.
           * @type {boolean}
           */
          throwAllocErrors: false
        });
        this.merge(overrides);
    }

    /**
     * Override configuration options with this global variable name
     * @returns {String} The variable name
     */
    get varname() {
        return 'SPARK_OPTIONS';
    }
}

export {
    EngineConfig,
    SparkHeapConfig
};