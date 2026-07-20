/**
 * Engine - Main render loop engine class
 * Implements simple rendering loop and game object management system
 */
import Constants from '../Constants.js';
import Context from '../Context.js';
import Console from './console.js'
import RenderEngineError from './RenderEngineError.js';

import GameWorld from './GameWorld.js'
import EventEngine from './EventEngine.js'
import RenderContext from '../rendering/contexts/RenderContext.js';
import Renderer from '../rendering/renderers/Renderer.js';
import ParticleEngine from './../particlesystem/ParticleEngine.js';
import Camera from '../rendering/cameras/Camera.js';
import AABBCollisionModel from '../collisionModels/models/AABB.js';

/**
 * Primary object for storing references to Engine, EventEngine, World, and RenderContext.
 * @type {Object} primary - Namespace object containing references to Engine, EventEngine, World, and RenderContext.
 */
const primary = {
  ENGINE: null,
  PARTICLE_ENGINE: null
};

const MAXSAMPLES = 100;
const ctx = Context.getInstance();
let waitInit = false;

/**
 * Creates a new Engine instance.
 * 
 * @param {Object} options - Configuration options from the initializer
 * @param {Object} options.flags - Flags for enabling or disabling specific features.
 * @param {boolean} options.flags.debugMode - Enable engine debugging mode. Default is false.
 * @param {boolean} options.flags.performanceLogging - Enable performance logging for rendering and collision events. Default is false.
 * @param {boolean} options.flags.showFps - Display the current FPS, target FPS, and frame time on screen. Default is false.
 * @param {Object} options.world - World configuration options.
 * @param {number} options.world.fps - Desired frames per second for rendering. Default is 60.
 * @param {number} options.world.seedTime - Desired time setting when initializing the engine. Default is 0.
 * @param {Array} options.world.dimensions - Two-element array representing the width and height of the game world. Default is [800, 600].
 * @param {Array} options.world.screenDimensions - Two-element array representing the width and height of the viewport. Default is [800, 600].
 * @param {string} options.world.backgroundColor - Background color of the game world. Default is 'black'.
 * @param {RenderContext} options.world.renderContext - The rendering context for the engine.
 * @param {CollisionModel} options.world.collisionModel - The collision model for the engine. Default is {@link AABBCollisionModel}
 * @param {number} options.world.renderPlanes - Number of render planes to use. Default is 3.
 * @param {Object} options.threading - Threading options.
 * @param {number} options.threading.renderThreads - Number of rendering threads to use. Default is 1.
 * @param {number} options.threading.renderThreadPriority - Priority level for rendering threads. Default is 0.
 * @param {string} options.threading.renderThreadName - Name of the rendering thread. Default is 'RE4 Render Thread'.
 * @param {number} options.threading.collisionThreads - Number of collision threads to use. Default is 1.
 * @param {number} options.threading.collisionThreadPriority - Priority level for collision threads. Default is 0.
 * @param {string} options.threading.collisionThreadName - Name of the collision thread. Default is 'RE4 Collision Thread'.
 * @param {Object} options.hooks - Engine hooks.
 * @param {Function} options.hooks.onInit - Callback function to be executed after initialization. Default is No-op.
 * @param {Function} options.hooks.onStart - Callback function to be executed when the engine starts. Default is No-op.
 * @param {Function} options.hooks.onStop - Callback function to be executed when the engine stops. Default is No-op.
 * @param {Function} options.hooks.onReset - Callback function to be executed when the engine is reset. Default is No-op.
 * @param {Function} options.hooks.onShutdown - Callback function to be executed when the engine exits. Default is No-op.
 * @param {Function} options.hooks.onError - Stateful callback function to be executed if an error occurs during the run-loop. Example: <code>(error) => {};</code> Default is console logging of errors.
 * @param {Function} options.hooks.onBeforeFrame - Stateful callback function to be executed before each frame is generate. Example: <code>(time) => {};</code> 
 * @param {Function} options.hooks.onBeforeUpdate - Stateful callback function to be executed before each world update. Example: <code>(time, deltaTime) => {};</code> 
 * @param {Function} options.hooks.onUpdate - Stateful callback function to be executed after each world update. Example: <code>(time, deltaTime) => {};</code> 
 * @param {Function} options.hooks.onBeforeRender - Stateful callback function to be executed before each frame is rendered. Example: <code>(time, deltaTime) => {};</code> 
 * @param {Function} options.hooks.onRender - Stateful callback function to be executed on each frame of rendering. Example: <code>(time, deltaTime, renderTime) => {};</code>
 * @param {Function} options.hooks.onCollision - Stateful callback function to be executed on collision events. Example: <code>(collisionData) => {};</code> 
 * @param {Function} options.hooks.onFrame - Stateful callback function to be executed after each frame is updated and rendered. Example: <code>(time, frameTime) => {};</code> 
 * @constructor
 */
export default class Engine {
  #ENGINE = null
  #WORLD = null
  #EVENT_ENGINE = null;
  #PARTICLE_ENGINE = null;
  #RENDER_CONTEXT = null;

  #ENGINE_OPTIONS = null;
  #width = 0;
  #height = 0;
  #currentTime = 0;
  #lastTime = 0;
  #deltaTime = 0;
  #isRunning = false;
  #animationFrameId = null;
  #lifecycleTiming = 0;
  #collisionModel = null;
  #fpsDisplay = null;
  #fpsCounter = null;
  #updateCounter = null;
  #renderCounter = null;
  
  #tickers = {
    total: {
      index: 0,
      sum: 0,
      samples: new Array(MAXSAMPLES).fill(0)
    },
    update: {
      index: 0,
      sum: 0,
      samples: new Array(MAXSAMPLES).fill(0)
    },
    render: {
      index: 0,
      sum: 0,
      samples: new Array(MAXSAMPLES).fill(0)
    }
  }

  constructor(options) {
    if (!waitInit) {
      throw new RenderEngineError("Engine must be initialized before use. Please call 'init' first.")
    }
    waitInit = false;

    primary.ENGINE = this;

    // store the engine initialization options
    this.#ENGINE_OPTIONS = { 
      flags: {...Constants.DEFAULT_ENGINE_OPTIONS.flags, ...options.flags},
      world: {...Constants.DEFAULT_ENGINE_OPTIONS.world, ...options.world},
      threading: {...Constants.DEFAULT_ENGINE_OPTIONS.threading, ...options.threading},
      hooks: {...Constants.DEFAULT_ENGINE_OPTIONS.hooks, ...options.hooks},
      canvasDefaults: {...Constants.DEFAULT_ENGINE_OPTIONS.canvasDefaults, ...options.canvasDefaults}
    };

    ctx.debug = this.#ENGINE_OPTIONS.flags.debugMode;

    // configure basics
    this.#width = this.#ENGINE_OPTIONS.world.dimensions[0];
    this.#height = this.#ENGINE_OPTIONS.world.dimensions[1];
    
    // Game timer maintained by the engine
    this.#currentTime = this.#ENGINE_OPTIONS.world.seedTime;
    this.#lastTime = 0;
    this.#deltaTime = 0;
    
    // render context (initialized later)
    const renderContext = this.#ENGINE_OPTIONS.world.renderContext || new RenderContext(new Renderer());
    renderContext.screenDimensions = this.#ENGINE_OPTIONS.world.screenDimensions;
    renderContext.worldDimensions = this.#ENGINE_OPTIONS.world.dimensions;
    
    // the world camera
    const camera = this.#ENGINE_OPTIONS.world.camera || new Camera();
    camera.viewport = this.#ENGINE_OPTIONS.world.viewport;

    // setup the game world
    this.#EVENT_ENGINE = new EventEngine(this);
    this.#WORLD = new GameWorld(this, camera, renderContext);
    this.#PARTICLE_ENGINE = new ParticleEngine();

    // Collision model storage
    const collisionModel = this.#ENGINE_OPTIONS.world.collisionModel || new AABBCollisionModel(this);
    this.#ENGINE_OPTIONS.world.collisionModel = collisionModel;

    if (this.#ENGINE_OPTIONS.flags.showFps) {
      this.#fpsDisplay = document.createElement('div');
      this.#fpsDisplay.classList.add('fpsCounter');
      this.#fpsCounter = document.createElement('div');
      this.#updateCounter = document.createElement('div');
      this.#renderCounter = document.createElement('div');
      this.#fpsDisplay.appendChild(this.#fpsCounter);
      this.#fpsDisplay.appendChild(this.#updateCounter);
      this.#fpsDisplay.appendChild(this.#renderCounter);
      document.body.appendChild(this.#fpsDisplay);
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
   * Get all game objects in the world
   * @returns {GameObject[]}
   */
  get allObjects() {
    return this.#WORLD.allObjects;
  }

  /**
   * Get the engine operating options
   * @returns {Object}
   */
  get options() {
    return this.#ENGINE_OPTIONS;
  }

  static get options() {
    return primary.ENGINE.options;
  }

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

      if (this.#ENGINE_OPTIONS.flags.showFps) {
        const updateTick = updateEnd - updateStart;
        const renderTick = renderEnd - renderStart;
        const totalTick = renderEnd - frameStart;
        
        this.#tickers.update.sum -= this.#tickers.update.samples[this.#tickers.update.index];
        this.#tickers.render.sum -= this.#tickers.render.samples[this.#tickers.render.index];
        this.#tickers.total.sum -= this.#tickers.total.samples[this.#tickers.total.index];

        this.#tickers.update.sum += updateTick;
        this.#tickers.render.sum += renderTick;
        this.#tickers.total.sum += totalTick;

        this.#tickers.update.samples[this.#tickers.update.index] = updateTick;
        this.#tickers.render.samples[this.#tickers.render.index] = renderTick;
        this.#tickers.total.samples[this.#tickers.total.index] = totalTick;

        if(++this.#tickers.update.index===MAXSAMPLES)    /* inc buffer index */
          this.#tickers.update.index=0;

        if(++this.#tickers.render.index===MAXSAMPLES)    /* inc buffer index */
          this.#tickers.render.index=0;

        if(++this.#tickers.total.index===MAXSAMPLES)    /* inc buffer index */
          this.#tickers.total.index=0;

        const totalFPS = ((1 / (this.#tickers.total.sum / MAXSAMPLES)) * MAXSAMPLES).toFixed(0);
        const updateFPS = ((1 / (this.#tickers.update.sum / MAXSAMPLES)) * MAXSAMPLES).toFixed(0);
        const renderFPS = ((1 / (this.#tickers.render.sum / MAXSAMPLES)) * MAXSAMPLES).toFixed(0);

        this.#fpsCounter.textContent = `Total: ${totalFPS} fps`;
        this.#updateCounter.textContent = `Update: ${updateFPS} fps (${(updateFPS/totalFPS).toFixed(0)}%)`;
        this.#renderCounter.textContent = `Render: ${renderFPS} fps (${(renderFPS/totalFPS).toFixed(0)}%)`;
      }

      // one frame generated
      lifecycleHooks.onFrame(performance.now() - frameStart);

      if (this.isRunning) {
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
      // Remove any keys that should be ignored
      ignoreKeys.forEach(key => {
          delete serialize[key];
      });
      return serialize;
  }

}
