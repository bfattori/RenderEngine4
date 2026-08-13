import Constants from '../Constants.js';
import Context from '../Context.js';
import RenderEngineError from '../core/RenderEngineError.js';
import { NOP, ENGINE_ERRORS } from '../Constants.js';
import Util from './Util.js';

/**
 * Options Configuation
 */
export default class Config {
    #opts = {};

    /**
     * Construction an options configuration. Each property of the `opts` 
     * object will be accessible by name as a getter.
     * @param {Object} opts - The options
     */
    constructor(opts = {}) {
        if (opts instanceof Config) {
            this.merge(opts.opts);
        } else {
            this.merge(opts);
        }
    }

    #isObject(item) {
        return (item && item.constructor.name === 'Object' && !Array.isArray(item));
    }

    #deepMerge(target, source) {
        // Create a deep copy of target to keep the function pure
        const output = Object.assign({}, target);

        if (this.#isObject(target) && this.#isObject(source)) {
            Object.keys(source).forEach(key => {
            if (this.#isObject(source[key])) {
                if (!(target.hasOwnProperty(key))) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    // Recursive call for nested objects
                    output[key] = this.#deepMerge(target[key], source[key]);
                }
            } else {
                // Simple primitive overwrite
                Object.assign(output, { [key]: source[key] });
            }
            });
        }
        return output;
    }

    /**
     * Merge this config with another object containing values that should override the current ones.
     * It instruments the `Config` with getters and setters for the properties in the incoming configuration.
     * @param {Object} incoming - Incoming config object
     */
    merge(incoming = {}) {
        const merged = this.#deepMerge(this.#opts, incoming);
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
        this.#opts = opts;
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
            showParticleEngineLoad: false
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
        showFps: false
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
       * Particle Engine config
       */
      particleEngine: {
        /**
         * Disables the particle engine if not needed. Default is `false`.
         * @type {boolean}
         */
        disabled: false,
        /**
         * Maximum number of particles to allow. Default is {@link Constants.MAX_PARTICLES}.
         * @type {number}
         */
        maxParticles: Constants.MAX_PARTICLES,
        /**
         * Circular buffer for particles. If `true` particles are added to the buffer as they arrive.
         * New particles will overwrite existing particles that are live. If `false` the particle engine will 
         * not add new particles if the buffer is full. Default is `true`.
         * @type {boolean}
         */
        circularBuffer: true,
        /**
         * Play nicely with the main thread
         */
        nice: 5
      },
      /**
       * Threading options.
       */
      threading: {
        /**
         * Rendering threading options. These are used to configure the rendering threads which can be disabled, 
         * the number of workers (default is 4), and the operating priority of the rendering threads (default is 1).
         * @type {Object}
         */
        render: {
          /**
           * Threading enabled
           * @type {boolean}
           */
          enabled: false,
          /**
           * Operating priority for the rendering threads.
           * The value is a number between 0 and 1. Zero means the thread does 
           * not get any CPU time, and 1 means the thread gets all available 
           * CPU time. Default is 1.
           * @type {number}
           */
          nice: 1,
          /**
           * Name of the rendering thread. Default is 'RE4 Render Thread'.
           * @type {String}
           */
          name: 'RE4Render',
          /**
           * Number of workers to use for the particle engine. Default is 4.
           * @type {number}
           */
          workers: 4
        },
        /**
         * Collision threading options. These are used to configure the collision threads which can be disabled, 
         * the number of workers (default is 4), and the operating priority of the collision threads (default is 1).
         * @type {Object}
         */
        collision: {
          /**
           * Threading enabled
           * @type {boolean}
           */
          enabled: false,
          /**
           * Operating priority for the collision threads.
           * The value is a number between 0 and 1. Zero means the thread does 
           * not get any CPU time, and 1 means the thread gets all available 
           * CPU time. Default is 1.
           * @type {number}
           */
          nice: 1,
          /**
           * Name of the collision threads. Default is 'RE4Collisions'.
           * @type {String}
           */
          name: 'RE4Collisions',
          /**
           * Number of workers to use for the collision engine. Default is 2.
           * @type {number}
           */
          workers: 2
        },
        /**
         * Particle engine threading options. These are used to configure the particle engine threads which can be disabled, 
         * the number of workers (default is 4), and the operating priority of the particle engine threads (default is 1).
         * @type {Object}
         */
        particleEngine: {
          /**
           * Threading enabled. Default is `false`.
           * @type {boolean}
           */
          enabled: false,
          /**
           * Operating priority for the particle threads.
           * The value is a number between 0 and 1. Zero means the thread does 
           * not get any CPU time, and 1 means the thread gets all available 
           * CPU time. Default is 1.
           * @type {number}
           */
          nice: 1,
          /**
           * Name of the particle threads. Default is 'RE4Particles'.
           * @type {String}
           */
          name: 'RE4Particles',
          /**
           * Number of workers to use for the particle engine. Default is 4.
           * @type {number}
           */
          workers: 4,
          /**
           * The threshold used by the orchestrator to determine particle distribution 
           * during threading. As particles are added to the buffer, load determines the 
           * distribution. For circular buffers, this ensures a more even distribution. 
           * Default is 0.75 (75%).
           */
          loadThreshold: 0.75,
          /**
           * The load factor used in the orchestrator to determine particle distribution during threading.
           * As particles are added to the buffer, load determines the distribution. But as the load threshold 
           * is reached, the orchestrator will distribute particles to the next available worker by increasing
           * the threshold until it reaches 100%. Default is 0.1 (10%).
           */
          loadFactor: 0.03
        },
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
           * @param {number} time - The current engine time
           */
          onBeforeFrame: (time) => {},

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
           * @param {number} frameTime - The total time to generate the frame.
           */
          onFrame: (frameTime) => {}
      }
    });
  }
}

class RenderContextConfig extends Config {
  constructor() {
    super({
      enableCulling: false,
      immediateMode: false,
      viewport: {
        left: 0, 
        top: 0, 
        width: 800, 
        height: 600
      },
      worldDimensions: {
        width: 800, 
        height: 600
      },
      renderPlanes: {
        max: 3,
        names: [
          'background',      // Farthest plane (lowest priority)
          'middle',          // Middle plane
          'foreground'       // Closest plane (highest priority)
        ]
      },
      cursor: {
        x: 0, 
        y: 0,
        margins: {
          left: 0, right: 800, 
          top: 0, bottom: 600
        }
      },
      text: {
          formatting: {
            bold: false,
            italics: false,
            underline: false
          },
          letterSpacing: 2,
          lineHeight: 15,
          forceUpperCase: false
      }
    })
  }
}

class RendererConfig extends Config {
    constructor(defaults = {}) {
        super({
            doubleBuffered: false,
            useCompiler: true,
            formatting: new Map()
        });
        this.merge(defaults);
    }
}

class CanvasConfig extends RendererConfig {
    constructor(opts) {
        super({
            defaults: {
                filter: "none",
                globalAlpha: 1.0,
                globalCompositeOperation: "source-over",
                lineDashOffset: 0.0,
                lineJoin: "round",
                lineCap: "round",
                miterLimit: 10.0,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: "low",
                font: "10px sans-serif",
                letterSpacing: 0,
                textRendering: "auto"
            }
        });
        this.merge(opts);
    }
}

class CameraConfig extends Config {
    constructor() {
        super({
            position: [0, 0], 
            viewport: {left: 0, top: 0, width: 800, height: 600 }, 
            rotation: 0, 
            scale:[1, 1]
        });
    }
}

export {
    EngineConfig,
    RenderContextConfig,
    RendererConfig,
    CanvasConfig,
    CameraConfig
};