/**

 * Engine - Main render loop engine class
 * Implements simple rendering loop and game object management system
 */
import Console from './lang/Console.js';
import Constants from '../Constants.js';
import Context from '../Context.js';
import RenderEngineError from './RenderEngineError.js';

import { initializeSystemMM } from './memory/FastMemoryPool.js';
import { EngineConfig } from './config/Config.js';
import GameWorld from './GameWorld.js'
import EventEngine from './EventEngine.js'
import RenderContext from '../rendering/context/RenderContext.js';
import Renderer from '../rendering/renderers/Renderer.js';
import ParticleEngine, { ParticleEngineConfig, ParticleEngineThreadingConfig } from './../particlesystem/ParticleEngine.js';
import Camera from '../rendering/cameras/Camera.js';
import GridBroadphase from '../collisionSystems/broadphase/GridBroadphase.js';
import AABBModel from '../collisionSystems/narrowband/AABBModel.js';

import FPSCounter from '../ui/debug/FPSCounter.js';

/**
 * Primary object for storing references to Engine, EventEngine, World, and RenderContext.
 * @type {Object} primary - Namespace object containing references to Engine, EventEngine, World, and RenderContext.
 */
const primary = {
  ENGINE: null,
  PARTICLE_ENGINE: null
};

const _paths = {
  engine: null,
  game: null,
  startup: null
};

const ctx = Context.getInstance();
let waitInit = false;

self.RE4_Context = ctx;

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
  
  #currentTime = 0;
  #lastTime = 0;
  #deltaTime = 0;
  #isRunning = false;
  #animationFrameId = null;
  #lifecycleTiming = 0;
  #fpsCounter = null;
  #frameTime = 1;

  #startupLocation = null;
  #engineLocation = null;

  #stepping = false;
  #stepTime = 0;

  #runOneFrame;

  #frameNumber = 0;
  #fpsRealtime = 0;

  constructor(options) {
    if (!waitInit) {
      throw new RenderEngineError("Engine must be initialized before use. Please call 'init' first.")
    }
    waitInit = false;

    primary.ENGINE = this;

    // store the engine initialization options
    this.#ENGINE_OPTIONS.merge(options);
    
    // configure the context
    ctx.debug = this.#ENGINE_OPTIONS.flags.debugMode;
    ctx.debugOpts = this.#ENGINE_OPTIONS.flags.debugOpts;

    ctx.engineOpts = this.#ENGINE_OPTIONS.engineOpts;
    ctx.engineOpts.showFps = this.#ENGINE_OPTIONS.flags.showFps;

    ctx.trackPerformance = this.#ENGINE_OPTIONS.flags.trackPerformance;
    ctx.pragmas = this.#ENGINE_OPTIONS.flags.pragmaDebugging;
    
    // Game timer maintained by the engine
    this.#currentTime = this.#ENGINE_OPTIONS.world.seedTime;
    this.#lastTime = 0;
    this.#deltaTime = 0;

    // call loading hook
    this.#ENGINE_OPTIONS.hooks.onLoad();

    // initialize memory management
    initializeSystemMM();

    // the game event engine
    this.#EVENT_ENGINE = new EventEngine(this);

    // render context (initialized later)
    const renderContext = this.#ENGINE_OPTIONS.world.renderContext || new RenderContext(new Renderer());
    renderContext.viewport = this.#ENGINE_OPTIONS.world.viewport;
    renderContext.worldDimensions = this.#ENGINE_OPTIONS.world.dimensions;
    
    // the world camera
    const camera = this.#ENGINE_OPTIONS.world.camera || new Camera();
    camera.viewport = this.#ENGINE_OPTIONS.world.viewport;

    // setup the game world
    this.#WORLD = new GameWorld(this, camera, renderContext);
    this.#WORLD.width = renderContext.worldDimensions.width;
    this.#WORLD.height = renderContext.worldDimensions.height;

    // broad phase collisions model
    const broadphaseModel = this.#ENGINE_OPTIONS.world.collisions.broadPhase || new GridBroadphase('defaultGrid', this.#WORLD.width, this.#WORLD.height);
    this.#ENGINE_OPTIONS.world.collisions.broadPhase = broadphaseModel;
    this.#WORLD.broadphaseModel = broadphaseModel;

    // narrow band collisions model
    const narrowbandModel = this.#ENGINE_OPTIONS.world.collisions.narrowBand || new AABBModel(this);
    this.#ENGINE_OPTIONS.world.collisions.narrowBand = narrowbandModel;
    this.#WORLD.narrowbandNodel = narrowbandModel;

    if (this.#ENGINE_OPTIONS.flags.showFps) {
      this.#fpsCounter = new FPSCounter();
    }
  }

  //---------------------------
  // relative locations
  //---------------------------

  /**
   * Get the URL to the main engine file
   * @returns {string} - The URL to the main engine file.
   */
  get engineUrl() {
    return this.options.engineLocation.toString();
  }

  /**
   * Get the URL to the startup file
   * @returns {string} - The URL to the startup file.
   */
  get startupUrl() {
    return this.options.startupLocation.toString();
  }

  //---------------------------
  // Primary engine components
  //---------------------------

  /**
   * Static method to return the engine instance
   * @return {Engine}
   */
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

  /**
   * Static method to get the world instance
   * @returns {GameWorld}
   */
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

  /**
   * Static method to get the event engine instance
   * @returns {EventEngine}
   */
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

  /**
   * Set the particle engine used by the engine
   * @param {$ParticleEngine}
   */
  set particleEngine(engine) {
    this.#PARTICLE_ENGINE = engine;
    primary.PARTICLE_ENGINE = engine;
  }

  /**
   * Static method to get the particle engine instance
   * @returns {$ParticleEngine}
   */
  static get particleEngine() {
    return primary.ENGINE.particleEngine;
  }

  /**
   * Get the ParticleEngine instance
   * @returns {$ParticleEngine|null}
   */
  get particleEngine() {
    return this.#PARTICLE_ENGINE;
  }
  
  /**
   * Static method to get the engine's render context
   * @return {RenderContext}
   */
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

  /**
   * Returns the callback hook configuration of the engine.
   * @returns {Object}
   */
  get hooks() {
    return this.#ENGINE_OPTIONS.hooks;
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

  /**
   * Get the update/render loop calculated FPS
   * @number
   */
  get realFPS() {
    return this.#fpsRealtime;
  }

  /**
   * Update the update/render calculated FPS
   */
  set realFPS(value) {
    this.#fpsRealtime = value;
  }

  /**
   * Returns the instance to the FPS counter instance
   * @return {FPSCounter}
   */
  get fpsCounter() {
    return this.#fpsCounter;
  }

  //--------------------------------
  // Threading

  /**
   * Returns `true` if threading is enabled for rendering.
   * @returns {boolean}
   */
  get renderThreading() {
    return this.options.threading.render.enabled;
  }

  /**
   * Returns `true` if threading is enabled for collisions.
   * @returns {boolean}
   */
  get collisionThreading() {
    return this.options.threading.collision.enabled;
  }

  /**
   * Returns `true` if threading is enabled for the particle engine.
   * @returns {boolean}
   */
  get particleThreading() {
    return this.options.threading.particleEngine.enabled;
  }

  //--------------------------------

  /**
   * Returns the current engine state: 'running', 'paused', or 'stepping'
   * @returns {String}
   */
  get state() {
    return this.isRunning ? (this.isStepping ? 'stepping' : 'running') : 'paused';
  }

  /**
   * The current frame number of the simulation. This is incremented every frame.
   * @returns {Number}
   */
  get frameNumber() {
    return this.#frameNumber;
  }

  /**
   * Calling this increments the frame number
   */
  nextFrame() {
    this.#frameNumber++;
  }

  /**
   * `true` if the engine is running
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
   * `true` if the engine is stepping
   * @returns {boolean}
   */
  get isStepping() {
    return this.#stepping;
  }

  /**
   * Set's the engine to stepping mode where it will advance one
   * frame when `engine.step()` is called.
   * @param {boolean} state - the new stepping state
   */
  set isStepping(state) {
    this.#stepping = state;
    this.#stepTime = this.#currentTime;
  }

  /**
   * The amount of time to step per call to `step()`
   * @param {Number} time - The amount of time to step each invocation
   */
  set stepTime(time) {
    this.#stepTime = time;
  }

  /**
   * Returns the amount of time that will be stepped at each `step()` invocation
   * @returns {Number}
   */
  get stepTime() {
    return this.#stepTime;
  }

  /**
   * Set the amount of time (milliseconds) alloted to generating a frame.
   * @param {Number} allot - Time alloted to frame generation
   */
  set frameTime(allot) {
    this.#frameTime = allot;
  }

  /**
   * Get the amount of time (milliseconds) alloted to generating a frame.
   * @returns {Number}
   */
  get frameTime() {
    return this.#frameTime;
  }

  /**
   * Stores the frame request Id pointer from `requestAnimationFrame()`
   * @param {Number} frameId - The pointer
   */
  set frameController(frameId) {
    this.#animationFrameId = frameId;
  }

  /**
   * Returns the pointer to the frame animation request.
   * @return {Number} The pointer
   */
  get frameController() {
    return this.#animationFrameId;
  }

  /**
   * Get the world's broad phase collision model
   * @returns {BroadphaseModel|null}
   */
  get broadphaseModel() {
    return this.#WORLD.broadphaseModel;
  }

  /**
   * Get the world's narrow band collision model
   * @returns {NarrowbandModel|null}
   */
  get narrowbandModel() {
    return this.#WORLD.narrowbandModel;
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

  /**
   * The function the Engine uses to generate a frame
   * @param {Function} fn - defaults to `animationLoop()`
   */
  set runOneFrame(fn) {
    this.#runOneFrame = fn;
  }

  /**
   * Returns the function used to generate a frame for the Engine.
   * @returns {Function}
   */
  get runOneFrame() {
    return this.#runOneFrame;
  }

  //-------------------------------
  // Lifecycle Control
  //-------------------------------

  /**
   * Static reset method to null the engine, allowing for re-initializaion.
   * DANGER!! This is untested
   */
  static reset() {
    primary.ENGINE.reset();
    primary.ENGINE = null;
  }

  /**
   * Initialize the Engine.
   * @param {String} gameLocation - The absolute Url where the game exists
   * @param {Object} engineOptions - See the {@link Engine} constructor for availble options
   * @returns {Engine} The current instance of Engine.
   */
  static async init(gameLocation, startupLocation, engineOptions) {
    waitInit = true;

    let engineUrl = new URL(import.meta.url);
    let srcPath = engineUrl.pathname.split('/');
    const srcLoc = srcPath.indexOf('src');
    srcPath.splice(srcLoc + 1);
    // this should give us 'http://.../src/engine/'
    engineUrl.pathname = srcPath.join('/');
  
    Paths.engine = engineUrl;
    Paths.startup = startupLocation;
    Paths.game = gameLocation;

    // validate engine options
    // ...
    const e = new Engine(engineOptions);
    e.frameTime = Math.ceil(1000 / (e.options.world.fps > 0 ? Math.min(Constants.FRAME_RATE_CAP, e.options.world.fps) : 1000));

    if (!e.options.flags.particleEngineDisabled) {
      // start the particle engine
      const config = new ParticleEngineConfig();
      let threading = null;
      if (e.options.flags.threading.particles)
        threading = new ParticleEngineThreadingConfig();
      e.particleEngine = await ParticleEngine.getInstance(engineOptions.world.renderContext, e.width, e.height, config, threading);
    }

    // call init hook
    e.hooks.onInit();

    return e;
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

      // Update the world state
      this.world.update(currentTime, deltaTime);
      
      // If render context exists and it has an update method, update the context
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
      currentTime = currentTime || this.time;
      deltaTime = deltaTime || this.deltaTime;
      
      // Render context traverses its internal structure of GameObjects
      // to update the scene and then render the scene
      return this.world.render(currentTime, deltaTime);
    } catch (error) {
      console.error('Engine: Error during rendering:', error);
      return false;
    }
  }
  
  /**
   * Starts the game loop
   */
  async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.isStepping = false;

    this.frameController = requestAnimationFrame(animationLoop);

    // engine started
    this.#ENGINE_OPTIONS.hooks.onStart();
  }

  /**
   * Stops (pauses) the game loop
   */
  stop() {
    this.isRunning = false;
    if (this.frameController) {
      cancelAnimationFrame(this.frameController);
      this.stepTime = this.#currentTime;
      this.frameController = null;
      this.isStepping = true;
    }

    // call stop hook
    this.#ENGINE_OPTIONS.hooks.onStop();
  }

  /**
   * Step by the number of milliseconds in the frame time calculated as `1000 / frameRate`
   * @param {number} timeDelta - Optional time step
   */
  step(timeDelta) {
    this.stepTime += this.frameTime || timeDelta;
    console.warn(`  - stepped ${this.frameTime}ms (worldTime: ${this.stepTime}ms)`);
    this.frameController = requestAnimationFrame(animationLoop);

    // engine started
    this.#ENGINE_OPTIONS.hooks.onStep(this.#frameNumber, this.#stepTime);
  }

  /**
   * Stop, then reset the engine state, zeroing out the world, 
   * particle engine, memory contexts, render context, and event engine.
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
   * Called to shutdown and clean up resources. Removes the Engine from
   * the global context
   */
  destroy() {
    // clean up before exiting
    cancelAnimationFrame(this.frameController);
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

  //--------------------------
  // DevTools

  /**
   * Returns a set of stats compiled from the engine and major systems
   * to display in the state bar at the top of the DevTools debugger.
   * @returns {Object<String, *>} Snapshot stats for the DevTools debugger   * 
   */
  snapshotStats() {
    let stats = {
      ...this.world.snapshotStats(), 
      ...this.eventEngine.snapshotStats()
    };
    if (this.particleEngine) {
      stats = {
        ...stats,
        ...this.particleEngine.snapshotStats()
      };
    }
    return stats;
  }
}

/**
 * Engine and game paths
 */
export class Paths {
  static #engineLocation = null;
  static #startupLocation = null;
  static #gameLocation = null;

  /**
   * The engine Url: `./src/engine` 
   * @returns {String}
   */
  static get engine() {
      return Paths.#engineLocation.toString();
  }

  static set engine(url) {
    Paths.#engineLocation = new URL(url, self.location);
  }

  /**
   * The engine startup invocation Url: `./renderEngine4.js`
   * @returns {String}
   */
  static get startup() {
      return Paths.#startupLocation.toString();
  }

  static set startup(url) {
    Paths.#startupLocation = new URL(url, self.location);
  }

  /**
   * The game location url
   * @returns {String}
   */
  static get game() {
      return Paths.#gameLocation.toString();
  }

  static set game(url) {
    Paths.#gameLocation = new URL(url, self.location);
  }
};


/**
 * The default Engine update/render loop
 */
function animationLoop() {
  const e = Engine.engine;
  if (!(e.isRunning || e.isStepping)) return;

  // the frame lifecycle callbacks
  const lifecycleHooks = e.options.hooks;

  // start frame generation
  const frameStart = PERF('frameStart');
  const currentTime = e.stepTime || frameStart;     // allows stepping

  if (currentTime >= e.lastTime + e.frameTime) {
    // advance the frame counter
    e.nextFrame();

    lifecycleHooks?.onBeforeFrame(currentTime, e.frameNumber);

    // Calculate delta time in milliseconds
    const deltaTime = (currentTime - e.lastTime); // / this.frameTime;
    e.lastTime = currentTime;
    
    // Update the scene, once per frame
    const updateStart = PERF('updateStart');
    lifecycleHooks?.onBeforeUpdate(updateStart - frameStart);
    e.update(currentTime, deltaTime);
    const updateEnd = PERF('updateEnd');
    lifecycleHooks?.onUpdate(currentTime, deltaTime);
    
    // Render the world
    const renderStart = PERF('renderStart');
    lifecycleHooks?.onPreRender(renderStart - frameStart);
    e.renderWorld(currentTime, deltaTime);
    const renderEnd = PERF('renderEnd');
    lifecycleHooks?.onRender(currentTime, deltaTime);

    // one frame generated
    const frameTime = performance.now() - frameStart;
    const fps = 1000 / frameTime;
    e.realFPS = (fps > 1000 / e.frameTime ? 1000 / e.frameTime : fps).toFixed(1); // 1000 / frameTime;
    lifecycleHooks.onFrame(performance.now(), e.frameNumber, e.realFPS, e.snapshotStats(deltaTime, updateEnd - updateStart, renderEnd - renderStart, frameTime));
    const frameEnd = PERF('frameEnd');

    MEASURE('Generate Frame', 'frameStart', 'frameEnd');
    MEASURE('Update World', 'updateStart', 'updateEnd');
    MEASURE('Render Scene', 'renderStart', 'renderEnd');

    if (e.options.flags.showFps) {
      e.fpsCounter.frame(deltaTime, frameStart, updateStart, updateEnd, renderStart, renderEnd, frameEnd);
    }
  }

  if (e.isRunning) {
    e.frameController = requestAnimationFrame(animationLoop);
    e.stepTime = 0.0;
  }
}
