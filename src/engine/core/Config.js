import Constants from '../Constants.js';
import { NOP, ENGINE_ERRORS } from '../Constants.js';

/**
 * Options Configuation
 */
export default class Config {
    #opts = null;
    #getters = [];

    /**
     * Construction an options configuration. Each property of the `opts` 
     * object will be accessible by name as a getter.
     * @param {Object} opts - The options
     */
    constructor(opts = {}) {
        this.#opts = opts;
        this.#lombok();
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

    merge(incoming) {
        const merged = this.#deepMerge(this.#opts, incoming);
        if (this.#getters.length !== 0) {
            // remove getters for properties that no longer exist
            const mKeys = Object.keys(merged);
            const dKeys = mKeys.filter(key => !this.#getters.includes(key));
            for (const dk of dKeys) {
                delete this[dk];
            } 
        }
        this.#getters = [];
        this.#opts = merged;
        this.#lombok();
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

    #lombok() {
        const props = Object.keys(this.#opts);
        for (const propName of props) {
            if (propName !== 'opts') {  // "opts" is restricted
                this.#getters.push(propName);
                const descriptor = Object.getOwnPropertyDescriptor(this, propName);
                if (!descriptor || typeof descriptor.get !== 'function') {
                    // only create getters not already present
                    Object.defineProperty(this, propName, {
                        get() {
                            return this.opts[propName];
                        },
                        set(val) {
                            this.opts[propName] = val;
                        },
                        enumerable: true,
                        configurable: true
                    });
                }
            }
        }
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
            Options: this.#opts,
            keys: this.#getters
        };
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
            objectOrigin: true,
            boundingBoxes: true,
            collisionSep: true,
            charOrigin: true
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
         * Disable the particle engine if not needed
         * @type {boolean}
         */
        disable: false,
        /**
         * Maximum number of particles to allow
         * @type {number}
         */
        maxParticles: Constants.MAX_PARTICLES,
        /**
         * Circular buffer for particles. If `false` particles are allocated as space becomes free.
         * @type {boolean}
         */
        circularBuffer: true,
        /**
         * Particle precision. "Low" uses 16-bits for the position and 8-bits for the velocity, medium uses 16-bits
         * @type {String} {@link Constants.PARTICLE_PRECISION_LOW}, {@link Constants.PARTICLE_PRECISION_MEDIUM}, {@link Constants.PARTICLE_PRECISION_HIGH}
         * @default Constants.PARTICLE_PRECISION_MEDIUM
         */
        precision: 'medium'
      },
      /**
       * Threading options.
       */
      threading: {
        /**
         * Rendering
         */
        render: {
          /**
           * Threading enabled
           * @type {boolean}
           */
          enabled: false,
          /**
           * Priority level for rendering threads. Default is 0.
           * @type {number}
           */
          priority: 0,
          /**
           * Name of the rendering thread. Default is 'RE4 Render Thread'.
           * @type {String}
           */
          name: 'RE4 Render Thread',
          /**
           * Number of rendering threads to use. Default is 1.
           */
          count: 1
        },
        collision: {
          /**
           * Threading enabled
           * @type {boolean}
           */
          enabled: false,
          /**
           * Priority level for rendering threads. Default is 0.
           * @type {number}
           */
          priority: 0,
          /**
           * Name of the collisions thread. Default is 'RE4 Collision Thread'.
           * @type {String}
           */
          name: 'RE4 Collision Thread',
          /**
           * Number of collision threads to use. Default is 1.
           */
          count: 1
        },
      },
      /**
       * Engine hooks.
       */
      hooks: {
          //------------------------
          // Licecycle hooks

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

class RenderConfig extends Config {
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

class CanvasConfig extends Config {
    constructor() {
        super({
            doubleBuffered: false,
            useCompiler: true,
            formatting: new Map(),
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

class ParticleConfig extends Config {
    constructor() {
        super({
            /**
             * Color of the particle
             * @type {String}
             */
            color: 'white',
            /**
             * Size of the particle
             * @type {number}
             */
            size: 1,
            /**
             * Lifespan of the particle
             * @type {number}
             */
            lifeSpan: 0,
            /**
             * Optional function to execute at each update. Position and velocity are `FixedPoint` values
             * so should not be manipulated as regular JavaScript primitives. See {@link FixedPointMath}
             * for methods to manipulate the values.
             * 
             * The function receives 3 arguments: (`time, deltaTime, bits, [x, y], [vX, vY], lifeSpan`) where
             * `bits` is the number of precision bits in the `FixedPoint` numbers
             * `[x, y]` is the current particle position
             * `[vX, vY]` is the current particle velocity
             * and `lifeSpan` is the remaining lifespan for the particle.
             * The function should return an object:
             * `{ pos: [x, y], vel: [xV, yV] }` containing the new x, y position and x, y velocity as `FixedPoint` values
             * @type {Function}
             */
            run: null,
            /**
             * Optional function to render the particle. The function is passed (`renderer, [x, y], remainingLife, world time, and deltaTime
             */
            render: null,
            /**
             * If defined, called to clean up the particle
             * @type {Function}
             */
            cleanUp: null
        });
    }
}

export {
    EngineConfig,
    RenderConfig,
    CanvasConfig,
    CameraConfig,
    ParticleConfig
};