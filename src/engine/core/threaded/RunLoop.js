import '../../_debug/DebugHarness.js';
import RenderEngine from '../../renderEngine4.js';

import RunLoopError from './RunLoopError.js';
import { Logger } from '../lang/Console.js';
import protocol from './Protocol.js';

self.runLoopInstance = null;
let messageHandler = null;

let log;

// identify this as the game thread
self.isGameThread = true;
self.threadedEngine = true;

export default class RunLoop {
  #game;
  #renderer;
  #assembler;
  #cbWaiting = new Map();
  #waitId = 1;

  constructor(rendererClass) {
    log = new Logger(RunLoop, null, true);
    this.#initialize();
    this.#renderer = rendererClass;
  }
  
  get gameClass() {
    return this.#game;
  }

  get assembler() {
    return this.#assembler;
  }

  #initialize() {
    // tell the system there is a thread
    RenderEngine.runLoopThread = this;
    
    // the thread is ready
    this.#send({
      type: protocol.MTYPE.RUN_LOOP.READY
    });
  }

  async process(event) {
    log.verbose("RL::EngineThreadInbound", event.data);
    if (event.data.re4 === protocol.MSG.ENGINE_MANAGER) {
      switch(event.data.type) {
        // callback return
        case protocol.MTYPE.ENGINE_MANAGER.CALLBACK:
          const data = this.#cbWaiting.get(event.data._callbackid);
          const {res, rej} = data;
          if (!event.data._error)
            res(event.data.result);
          else
            rej(event.data._error);
          break;

        //------------------------------
        // engine control
        
        case protocol.MTYPE.ENGINE_MANAGER.START:
          this.#assembler = event.data.assembler;
          
          const gameModule = await import(new URL(event.data.gameUrl));
          this.#game = gameModule.default;

          // run the game
          if (this.#game && this.#game.run) {          
            this.#game.run();
          } else
            throw new RunLoopError(this, 'Game module does not have a "run" method');
          break;
        case protocol.MTYPE.ENGINE_MANAGER.RESUME:
          RenderEngine.resume();
          if (this.#game && this.#game.resume)
            this.#game.resumed();
          break;
        case protocol.MTYPE.ENGINE_MANAGER.PAUSE:
          RenderEngine.pause();
          if (this.#game && this.#game.pause)
            this.#game.paused();
          break;
        case protocol.MTYPE.ENGINE_MANAGER.STOP:
          RenderEngine.stop();
          if (this.#game && this.#game.stop)
            this.#game.stopped();
          break;
        case protocol.MTYPE.ENGINE_MANAGER.STEP:
          RenderEngine.step();
          if (this.#game && this.#game.step)
            this.#game.stepped();
          break;
        case protocol.MTYPE.ENGINE_MANAGER.TERMINATE:
          // shutdown the game
          if (this.#game && this.#game.shutdown)
            await this.#game.shutdown();
          else
            throw new RunLoopError(this, 'Game module does not have a "shutdown" method');
          
          // terminate the run loop
          self.terminate();
          break;
        default:
          log.error('Unknown message type from EngineManager:', event.data);
      }
    }
  }

  /**
   * Send a message to the orchestrator thread
   * @param {Object} data - Data to send to the thread 
   * @param {Array<Object>} transfer - Optional array of objects to transfer ownership of to the thread 
   */
  #send(data, transfer) {
    data = { 
      re4: protocol.MSG.RUN_LOOP, 
      ... data };
    self.postMessage(data, transfer);
    log.verbose("RL::EngineThreadOutbound", data);
  }

  /**
   * Wait for a callback from the main thread
   * @param {String} type - The type of operation being called
   * @param {*} obj - The object to process
   * @returns {Promise} A promise that will resolve with the result of the operation
   */
  #waitForResult(type, obj) {
    const callId = this.#waitId++;
    const p = new Promise((resolve, reject) => {
      this.#cbWaiting.set(callId, { res: resolve, rej: reject });
    });

    const data = {
      _callbackid: callId,
      type: type
    };

    if (obj && obj.tag)
      data.object = obj;
    else
      data.object = obj.transferrable;

    this.#send(data);
    return p;
  }

  //---------------------------------
  // engine management

  /**
   * Send the engine configuration back to the main thread
   * @param {Object} options - The engine configuration options
   */
  configEngine(options) {
    // we can't send the hooks or the objects...
    let engineOpts = {
      flags: options.flags,
      engineOpts: options.engineOpts,
      world: {
        fps: options.world.fps,
        seedTime: options.world.seedTime,
        dimensions: options.world.dimensions,
        viewport: options.world.viewport,
        backgroundColor: options.world.backgroundColor,
        renderPlanes: options.world.renderPlanes,
        renderContext: options.world.renderContext.config.opts
      },
      system: options.system
    };

    this.#send({
      type: protocol.MTYPE.RUN_LOOP.ENGINE_CONFIG,
      engineConfig: engineOpts
    });
  }

  //---------------------------------
  // loading dialog

  loading(text) {
    this.#send({
      type: protocol.MTYPE.RUN_LOOP.LOADING,
      text: text
    });
  }

  doneLoading() {
    this.#send({
      type: protocol.MTYPE.RUN_LOOP.DONE_LOADING
    });
  }

  //---------------------------------
  // particles

  passParticleBitmap(image) {
    this.#send({
      type: protocol.MTYPE.RUN_LOOP.PARTICLE_BITMAP,
      bitmap: image
    }, [ image ]);
  }

  //---------------------------------
  // asset management

  async compileTiles(tiles) {
    let promises = [];
    for (const tile of tiles) {
      promises.push(this.compileTile(tile));
    }
    return await Promise.all(promises);
  }

  async compileTile(tile) {
    return this.#waitForResult(protocol.MTYPE.RUN_LOOP.COMPILE_TILE, tile);
  }

  destroyTile(opaqueId) {
    this.#send({
      type: protocol.MTYPE.RUN_LOOP.DESTROY_TILE,
      opaqueId: opaqueId
    });
  }

  async compileTileMaps(tileMaps) {
    let promises = [];
    for (const tileMap of tileMaps) {
      promises.push(this.compileTileMap(tileMap));
    }
    return await Promise.all(promises);
  }

  async compileTileMap(tileMap) {
    return this.#waitForResult(protocol.MTYPE.RUN_LOOP.COMPILE_TILE_MAP, tileMap);
  }

  destroyTileMap(opaqueId) {
    this.#send({
      type: protocol.MTYPE.RUN_LOOP.DESTROY_TILE_MAP,
      opaqueId: opaqueId
    });
  }

  async compileSprites(sprites) {
    let promises = [];
    for (const sprite of sprites) {
      promises.push(this.compileSprite(sprite));
    }
    return await Promise.all(promises);
  }

  async compileSprite(sprite) {
    return this.#waitForResult(protocol.MTYPE.RUN_LOOP.COMPILE_SPRITE, sprite);
  }
  
  destroySprite(opaqueId) {
    this.#send({
      type: protocol.MTYPE.RUN_LOOP.DESTROY_SPRITE,
      opaqueId: opaqueId
    });
  }

  async getCompiledShapes(shapes) {
    let promises = [];
    for (const shape of shapes) {
      promises.push(this.getCompiledShape(shape));
    }
    return await Promise.all(promises);
  }

  async getCompiledShape(instructions, tag) {
    return this.#waitForResult(protocol.MTYPE.RUN_LOOP.COMPILE_SHAPE, { instructions, tag });
  }

  destroyCompiledShape(opaqueId) {
    this.#send({
      type: protocol.MTYPE.RUN_LOOP.DESTROY_SHAPE,
      opaqueId: opaqueId
    });
  }

  //-----------------------------------------
  // rendering

  preFrame(time, deltaTime) {
    // tell main thread a frame is starting
    this.#send({
      type: protocol.MTYPE.RUN_LOOP.PRE_FRAME,
      time: time,
      deltaTime: deltaTime
    });
  }

  renderInstructionBuffer(buffer, time, deltaTime) {
    // send to the main thread for processing
    this.#send({
      type: protocol.MTYPE.RUN_LOOP.RENDER_INSTRUCTIONS,
      time: time,
      deltaTime: deltaTime,
      buffer: buffer
    });
  }

  postFrame(time, deltaTime) {
    // tell main thread a frame is complete
    this.#send({
      type: protocol.MTYPE.RUN_LOOP.POST_FRAME,
      time: time,
      deltaTime: deltaTime
    });
  }

  passLoadCounter(counterConfig) {
    this.fixConfigFunctions(counterConfig);
    this.#send({
      type: protocol.MTYPE.RUN_LOOP.COUNTER_CONFIG,
      config: counterConfig
    });
  }

  fixConfigFunctions(configObject) {
    // convert the functions into JSON to reconstruct on the other side
    Object.keys(configObject.options).forEach(configName => {
      const config = configObject.options[configName];
      Object.keys(config).forEach(optionName => {
        if (config[optionName] !== null && typeof config[optionName] === 'function')
          config[optionName] = JSON.stringify({
            $T: 'function',
            fn: config[optionName].toString()
          });
      });
    });
  }

  counterUpdate(counterName, view, value) {
    this.#send({
      type: protocol.MTYPE.RUN_LOOP.COUNTER_UPDATE,
      counter: counterName,
      view: view,
      value: value
    });
  }

  passCanvasPIP(pipName, pipConfig) {
    this.#send({
      type: protocol.MTYPE.RUN_LOOP.PIP_CONFIG,
      pip: pipName,
      config: pipConfig
    });
  }

  pipUpdate(pipName, bitmap) {
    this.#send({
      type: protocol.MTYPE.RUN_LOOP.PIP_UPDATE,
      pip: pipName,
      image: bitmap
    }, [ bitmap ]);
  }
}

/**
 * Handler for messages received from the main thread. This function 
 * processes messages related to engine operations.
 */
messageHandler = addEventListener('message', (event) => {
    if (!log) log = new Logger(RunLoop, null, true);
    if (event.data.re4 && event.data.re4 === protocol.MSG.ENGINE_MANAGER) {
        if (!self.runLoopInstance && event.data.type === protocol.MTYPE.ENGINE_MANAGER.INIT) {
            self.runLoopInstance = new RunLoop(event.data.renderer);
        } else if (self.runLoopInstance) {
            // fixme: This is probably why effect and shit don't make it to the workers
            self.runLoopInstance.process(event);
        } else {
            console.error("Missed message in RunLoop", event);
        }
    }
});

addEventListener("messageerror", (event) => {
  console.error("Serialization/cloning failed:", event);
});

await PRAGMA_INIT(RunLoop); // required for PRAGMA debugging             