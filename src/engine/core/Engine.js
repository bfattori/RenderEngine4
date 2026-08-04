/**

 * Engine - Main render loop engine class
 * Implements simple rendering loop and game object management system
 */
import Constants from '../Constants.js';
import Context from '../Context.js';
import Console from './console.js'
import RenderEngineError from './RenderEngineError.js';

import { EngineConfig } from './Config.js';
import GameWorld from './GameWorld.js'
import EventEngine from './EventEngine.js'
import RenderContext from '../rendering/contexts/RenderContext.js';
import Renderer from '../rendering/renderers/Renderer.js';
import ParticleEngine from './../particlesystem/ParticleEngine.js';
import Camera from '../rendering/cameras/Camera.js';
import AABBCollisionModel from '../collisionModels/models/AABB.js';

import FPSCounter from '../ui/debug/FPSCounter.js'

/**
 * Primary object for storing references to Engine, EventEngine, World, and RenderContext.
 * @type {Object} primary - Namespace object containing references to Engine, EventEngine, World, and RenderContext.
 */
const primary = {
  ENGINE: null,
  PARTICLE_ENGINE: null
};

const ctx = Context.getInstance();
let waitInit = false;

/**
 * Creates a new Engine instance.
 * 
 * @param {EngineConfig} options - Configuration options from the initializer
 * @constructor
 */
export default class Engine {
  #ENGINE = null
  #WORLD = null
  #EVENT_ENGINE = null;
  #PARTICLE_ENGINE = null;
  #RENDER_CONTEXT = null;

  #ENGINE_OPTIONS = new EngineConfig();
  
  #width = 0;
  #height = 0;
  #currentTime = 0;
  #lastTime = 0;
  #deltaTime = 0;
  #isRunning = false;
  #animationFrameId = null;
  #lifecycleTiming = 0;
  #collisionModel = null;
  #fpsCounter = null;

  constructor(options) {
    if (!waitInit) {
      throw new RenderEngineError("Engine must be initialized before use. Please call 'init' first.")
    }
    waitInit = false;

    primary.ENGINE = this;

    // store the engine initialization options
    this.#ENGINE_OPTIONS.merge(options);

    ctx.debug = this.#ENGINE_OPTIONS.flags.debugMode;
    ctx.debugOpts = this.#ENGINE_OPTIONS.flags.debugOpts;

    ctx.engineOpts = this.#ENGINE_OPTIONS.engineOpts;
    ctx.engineOpts.showFps = this.#ENGINE_OPTIONS.flags.showFps;
    
    // Game timer maintained by the engine
    this.#currentTime = this.#ENGINE_OPTIONS.world.seedTime;
    this.#lastTime = 0;
    this.#deltaTime = 0;
    
    // render context (initialized later)
    const renderContext = this.#ENGINE_OPTIONS.world.renderContext || new RenderContext(new Renderer());
    renderContext.viewport = this.#ENGINE_OPTIONS.world.viewport;
    renderContext.worldDimensions = this.#ENGINE_OPTIONS.world.dimensions;
    
    // the world camera
    const camera = this.#ENGINE_OPTIONS.world.camera || new Camera();
    camera.viewport = this.#ENGINE_OPTIONS.world.viewport;

    // setup the game world
    this.#EVENT_ENGINE = new EventEngine(this);
    this.#WORLD = new GameWorld(this, camera, renderContext);
    this.#WORLD.width = renderContext.worldDimensions.width;
    this.#WORLD.height = renderContext.worldDimensions.height;

    // Collision model storage
    const collisionModel = this.#ENGINE_OPTIONS.world.collisionModel || new AABBCollisionModel(this);
    this.#ENGINE_OPTIONS.world.collisionModel = collisionModel;

    if (this.#ENGINE_OPTIONS.flags.showFps) {
      this.#fpsCounter = new FPSCounter();
    }

    // call init hook
    this.#ENGINE_OPTIONS.hooks.onInit();
  }

  //---------------------------
  // Primary engine components
  //---------------------------

  static get engine() {
    return primary.ENGINE;
  }

  /**
   * Get the Engine instance
   * @returns {Engine} The current instance of Engine.
   */
  get engine() {
    return primary.ENGINE;
  }

  static get world() {
    return primary.ENGINE.world;
  }

  /**
   * Get the the GameWorld instance
   * @returns {GameWorld}
   */
  get world() {
    return this.#WORLD;
  }

  static get eventEngine() {
    return primary.ENGINE.eventEngine;
  }

  /**
   * Get the EventEngine instance
   * @returns {EventEngine}
   */
  get eventEngine() {
    return this.#EVENT_ENGINE;
  }

  set particleEngine(engine) {
    this.#PARTICLE_ENGINE = engine;
    primary.PARTICLE_ENGINE = engine;
  }

  static get particleEngine() {
    return primary.ENGINE.particleEngine;
  }

  /**
   * Get the ParticleEngine instance
   * @returns {ParticleEngine|null}
   */
  get particleEngine() {
    return this.#PARTICLE_ENGINE;
  }
  
  static get renderContext() {
    return primary.ENGINE.renderContext;
  }

  /**
   * Get the render context
   * @returns {RenderContext|null}
   */
  get renderContext() {
    return this.#WORLD.renderContext;
  }

  //---------------------------------

  /**
   * Get current world width in pixels
   * @returns {number}
   */
  get width() {
    return this.#WORLD.width;
  }

  /**
   * Get current world height in pixels
   * @returns {number}
   */
  get height() {
    return this.#WORLD.height;
  }

  //---------------------------------

  /**
   * Get current world time in milliseconds
   * @returns {number}
   */
  get time() {
    return this.#currentTime;
  }

  /**
   * Set the current world time in milliseconds
   * @param {number} time - New world time in milliseconds
   */
  set time(time) {
    this.#currentTime = time;
  }
  
  /**
   * Get delta time since last frame in milliseconds
   * @returns {number}
   */
  get deltaTime() {
    return this.#deltaTime;
  }

  /**
   * Set the delta time since last frame in milliseconds
   * @param {number} time - New delta time in milliseconds
   */
  set deltaTime(time) {
    this.#deltaTime = time;
  }

  /**
   * Get last world time in milliseconds
   * @returns {number}
   */
  get lastTime() {
    return this.#lastTime;
  }

  /**
   * Set the last world time in milliseconds
   * @param {number} time - The last world time in milliseconds
   */
  set lastTime(time) {
    this.#lastTime = time;
  }

  //--------------------------------
  // Threading

  get renderThreading() {
    return this.options.threading.render.enabled;
  }

  get collisionThreading() {
    return this.options.threading.collision.enabled;
  }

  get particleThreading() {
    return this.options.threading.particleEngine.enabled;
  }

  //--------------------------------

  /**
   * Check if the engine is running
   * @returns {boolean}
   */
  get isRunning() {
    return this.#isRunning;
  }

  /**
   * Set the running state of the engine
   * @param {boolean} state - The new running state of the engine
   */
  set isRunning(state) {
    this.#isRunning = state
  }

  /**
   * Get the world's collision model
   * @returns {CollisionModel|null}
   */
  get collisionModel() {
    return this.#WORLD.collisionModel;
  }

  /**
   * Get the engine operating options
   * @returns {Config}
   */
  get options() {
    return this.#ENGINE_OPTIONS;
  }

  /**
   * Static accessor method to get to engine configuration options
   * @returns {Config}
   */
  static get options() {
    return primary.ENGINE.options;
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
      World: this.world,
      EventEngine: this.eventEngine,
      ParticleEngine: this.particleEngine,
      RenderContext: this.renderContext,
      CollisionModel: this.collisionModel,
      currentWorldTime: this.time,
      lastFrameTime: this.lastTime,
      deltaFrameTime: this.deltaTime,
      running: this.isRunning,
      options: this.options
    };
  }

  //-------------------------------
  // Lifecycle Control
  //-------------------------------

  /**
   * Initialize the Engine.
   * @param {Object} engineOptions - See the {@link Engine} constructor for availble options
   * @returns {Engine} The current instance of Engine.
   */
  static async init(engineOptions) {
    waitInit = true;
    // validate engine options
    // ...
    const e = new Engine(engineOptions);
    if (!e.options.particleEngine.disabled) {
      e.particleEngine = await ParticleEngine.getInstance(e.width, e.height, e.options.particleEngine, e.options.threading.particleEngine);
    }
    return e;
  }

  /**
   * Reset the current engine instance and set it to null, allowing for re-initializaion.
   */
  static reset() {
    primary.ENGINE.reset();
    primary.ENGINE = null;
  }
  
  /**
   * Update the scene with current time and delta
   * @param {number} currentTime - Current game time
   * @param {number} deltaTime - Time since last frame
   */
  update(currentTime, deltaTime) {
    if (!this.world) return;
    
    this.time = currentTime;
    this.deltaTime = deltaTime;

    try {
      // update the particles
      this.particleEngine.update(currentTime, deltaTime);

      // Update the world
      this.world.update(currentTime, deltaTime);
      
      // If render context exists, update its state
      if (this.world.renderContext && this.world.renderContext.update) {
        this.world.renderContext.update(currentTime, deltaTime);
      }

    } catch (ex) {
      // if any exception occurs during the update cycle, throw the exception and stop the engine
      this.options.hooks.onError(ex, "An error occurred in the render loop!");
      this.stop();
    }
  }
  
  /**
   * Render the scene using the render context
   * @param {number} currentTime - Current game time
   * @param {number} deltaTime - Time since last frame
   * @returns {boolean} Whether rendering succeeded
   */
  renderWorld(currentTime, deltaTime) {
    if (!this.world.renderContext) return false;

    try {
      // Render context traverses its internal structure of GameObjects
      // to update the scene and then render the scene
      return !!this.world.renderContext.renderScene(this.world.allObjects, currentTime, deltaTime);
    } catch (error) {
      console.error('Engine: Error during rendering:', error);
      return false;
    }
  }
  
  /**
   * Start the game loop
   * @param {number} frameRate - Target frame rate in frames per second
   * @param {number} seed - The world timer seed
   */
  start(frameRate = 60, seed = 0) {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameRate = this.options.world.fps;

    // the frame lifecycle callbacks are called in a loop until the game is stopped
    const lifecycleHooks = this.options.hooks;
    
    const loop = () => {
      if (!this.isRunning) return;

      const startTime = performance.now();

      // start frame generation
      const frameStart = performance.now();
      const currentTime = PERF('frameStart');
      lifecycleHooks?.onBeforeFrame(currentTime);

      // Calculate delta time in milliseconds
      const deltaTime = currentTime - this.lastTime; // Cap at ~60fps
      this.lastTime = currentTime;
      
      // Update the scene
      const updateStart = PERF('updateStart');
      lifecycleHooks?.onBeforeUpdate(updateStart - frameStart);
      this.update(currentTime, deltaTime);
      const updateEnd = PERF('updateEnd');
      lifecycleHooks?.onUpdate(updateEnd - frameStart, updateEnd - updateStart);
      
      // Render the world
      const renderStart = PERF('renderStart');
      lifecycleHooks?.onPreRender(renderStart - frameStart);
      this.renderWorld(currentTime, deltaTime);
      const renderEnd = PERF('renderEnd');
      lifecycleHooks?.onRender(renderEnd - frameStart, renderEnd - renderStart);

      // one frame generated
      lifecycleHooks.onFrame(performance.now() - frameStart);
      const frameEnd = PERF('frameEnd');

      if (this.isRunning) {
        MEASURE('Generate Frame', 'frameStart', 'frameEnd');
        MEASURE('Update World', 'updateStart', 'updateEnd');
        MEASURE('Render Scene', 'renderStart', 'renderEnd');
        if (this.options.flags.showFps) {
          this.#fpsCounter.frame(deltaTime, frameStart, updateStart, updateEnd, renderStart, renderEnd, frameEnd);
        }

        this.#animationFrameId = requestAnimationFrame(loop);
      }
    };
    
    this.#animationFrameId = requestAnimationFrame(loop);

    // engine started
    lifecycleHooks?.onStart();
  }
  
  /**
   * Stop the game loop
   */
  stop() {
    this.isRunning = false;
    if (this.#animationFrameId) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = null;
    }

    // call stop hook
    this.#ENGINE_OPTIONS.hooks.onStop();
    console.log('Stopped.');
  }
    
  /**
   * Reset the engine state
   */
  reset() {
    this.stop();
    
    this.#currentTime = 0;
    this.#lastTime = 0;
    this.#deltaTime = 0;
    
    if (this.world) {
      this.world.clear();
    }

    // Keep particle engine but may need to reinitialize
    if (this.particleEngine && this.particleEngine.reset) {
      this.particleEngine.reset();
    }

    // Keep render context but may need to reinitialize
    if (this.renderContext && this.renderContext.reset) {
      this.renderContext.reset();
    }

    // clear all event listeners
    this.eventEngine.clear();

    // call reset hook
    this.#ENGINE_OPTIONS.hooks.onReset();

    return this;
  }

  /**
   * Called to shutdown and clean up resources.
   */
  destroy() {
    // clean up before exiting
    cancelAnimationFrame(this.#animationFrameId);
    this.#EVENT_ENGINE?.shutdown();
    this.#WORLD?.shutdown();
    this.#PARTICLE_ENGINE?.shutdown();

    const $this = this;
    const $self = typeof global !== 'undefined' ? global : self;

    // async cleanup of the engine
    setTimeout(() => {
      console.debug('Engine terminated');
      console.shutdown();

      // call shutdown hook
      $this.options.hooks.onShutdown();
      primary.ENGINE = null;
      delete $self.RE4;
      delete $self.RenderEngine4;
    }, 250);
  }

  //-------------------------------
  // Serialization Method
  //-------------------------------
  
  /**
   * Serializes an object's properties into a plain object. Subclasses should override this to include specific properties.
   * 
   * @param {Object} object - The object to serialize
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
      let serialize = structuredClone(this);
      const props = Object.getOwnPropertyNames(this);

      // remove any functions
      for (const p of props) {
        if (typeof serialize[p] === 'function') {
          delete serialize[p];
        }
      }

      // Remove any properties that should be ignored
      ignoreKeys.forEach(key => {
          delete serialize[key];
      });
      return serialize;
  }

}
