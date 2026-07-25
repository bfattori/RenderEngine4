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
    this.#PARTICLE_ENGINE = ParticleEngine.getInstance(this, renderContext.renderer);

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
  static init(engineOptions) {
    waitInit = true;
    // validate engine options
    // ...
    return new Engine(engineOptions);
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
    this.lastTime = this.lastTime === 0 ? currentTime : this.lastTime;
    this.deltaTime = currentTime - this.lastTime;
      
    try {
      // Update the world with time and delta
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
      const result = this.world.renderContext.renderScene(this.world.allObjects, currentTime, deltaTime);
      
      return result !== false;
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

      const startTime = Date.now();

      // start frame generation
      const frameStart = performance.now();
      const currentTime = frameStart;
      lifecycleHooks?.onBeforeFrame(currentTime);

      // Calculate delta time in milliseconds (convert seconds back to ms)
      const deltaTime = Math.min((currentTime - this.lastTime), 16.67 * 1000); // Cap at ~60fps
      this.lastTime = currentTime;
      
      // Update the scene
      const updateStart = performance.now();
      lifecycleHooks?.onBeforeUpdate(updateStart - frameStart);
      this.update(currentTime, deltaTime);
      const updateEnd = performance.now();
      lifecycleHooks?.onUpdate(updateEnd - frameStart, updateEnd - updateStart);
      
      // Render the world
      const renderStart = performance.now();
      lifecycleHooks?.onPreRender(renderStart - frameStart);
      this.renderWorld(currentTime, deltaTime);
      const renderEnd = performance.now();
      lifecycleHooks?.onRender(renderEnd - frameStart, renderEnd - renderStart);

      // one frame generated
      lifecycleHooks.onFrame(performance.now() - frameStart);
      const frameEnd = performance.now();

      if (this.isRunning) {
        this.#animationFrameId = requestAnimationFrame(loop);
      }

      if (this.options.flags.showFps) {
        this.#fpsCounter.update(frameStart, updateStart, updateEnd, renderStart, renderEnd, frameEnd);
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
    this.#EVENT_ENGINE?.shutdown();
    this.#WORLD?.shutdown();
    this.#PARTICLE_ENGINE?.shutdown();

    const self = this;
    // async cleanup of the engine
    setTimeout(() => {
      // call shutdown hook
      self.options.hooks.onShutdown();
      primary.ENGINE = null;
      this.#ENGINE_OPTIONS = null;
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
