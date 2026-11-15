import RenderEngine from '../../renderEngine4.js';
import Context from '../../Context.js';

import { Logger } from '../lang/Console.js';
import RunLoopError from './RunLoopError.js';
import protocol from './Protocol.js';

const ctx = Context.getInstance();

let log;
self.threadedEngine = true;

/**
 * This is the go between from the main thread where the renderer will run
 * and the worker thread running the engine loop and game code.
 * 
 *
 */
export default class EngineThreadManager {
  #thread;
  #ready = false;
  #whenReady = null;
  #gameUrl;
  #renderer = null;

  static #instance;

  static async start(gameUrl, renderer) {
    EngineThreadManager.#instance = new EngineThreadManager(gameUrl, renderer);
    log.log('starting engine thread');
    await EngineThreadManager.#instance.loadThread();
    log.log('run-loop started');
  }

  constructor(gameUrl, renderer) {
    log = new Logger(EngineThreadManager, null, true);
    this.#gameUrl = gameUrl;
    this.#renderer = renderer;
  }

  get renderer() {
    return this.#renderer;
  }

  get gameUrl() {
    return this.#gameUrl;
  }

  get thread() {
    return this.#thread;
  }

  set callWhenReady(fn) {
    this.#whenReady = fn;
  }

  get callWhenReady() {
    return this.#whenReady;
  }

  get isReady() {
    return this.#ready;
  }

  async loadThread() {
    this.#thread = new Worker(new URL(`./RunLoop.js${ctx.preventThreadCache}`, import.meta.url), {
      name: `RE4_gameLoop`,
      type: 'module'
    });

    // setup event handlers
    this.#thread.onmessage = async (event) => {
      this.#runLoopInbound(event);     
    }

    this.#thread.onerror = (event) => {
      this.#runLoopError(event);
    }

    const $this = this;
    return new Promise(resolve => {
      log.debug('waiting for run-loop')
      $this.callWhenReady = resolve;

      setTimeout(() => {
        // initialize the run loop and wait for it to start
        $this.thread.postMessage({ 
          re4: protocol.MSG.ENGINE_MANAGER, 
          type: protocol.MTYPE.ENGINE_MANAGER.INIT,
          renderer: this.#renderer.constructor.name
        });
      }, 250);
    });
  }

  #send(data, transfer) {
    self.postMessage({
      re4: protocol.MSG.ENGINE_MANAGER,
      ... data }, transfer);
  }

  #callback(promise, transfer) {
    promise.then((data) => {
      data = {
        type: protocol.MTYPE.ENGINE_MANAGER.CALLBACK,
        ... data
      };
      this.#send(data, transfer);
    });
  }

  async #runLoopInbound(event) {
    let callbackId, procObj = null, callResult;
    if (event.data.re4 === protocol.MSG.RUN_LOOP) {
      
      // expecting a return value
      if (event.data._callbackId) {
        callbackId = event.data._callbackId;
        
        // a dehydrated transferrable, or a set of instructions and a label
        procObj = event.data.object && !event.data.object.tag ? 
          await TransferrableConfig.reconstruct(event.data.object) : 
          event.data.object;

      }

      switch(event.data.type) {
        //-------------------------
        // management

        case protocol.MTYPE.RUN_LOOP.READY:
          this.#ready = true;
          this.thread.postMessage({
            re4: protocol.MSG.ENGINE_MANAGER,
            type: protocol.MTYPE.ENGINE_MANAGER.START,
            gameUrl: this.#gameUrl.toString()
          });
          this.callWhenReady();
          break;

        case protocol.MTYPE.RUN_LOOP.ENGINE_CONFIG:
          event.data.engineConfig._runLoop = true;
          await RenderEngine.setEngineConfig(event.data.engineConfig);
          break;

        case protocol.MTYPE.RUN_LOOP.TERMINATED:
          this.#thread.terminate();
          this.#thread = null;
          log.verbose('RunLoop reports terminated');
          break;

        //-------------------------
        // asset management

        case protocol.MTYPE.RUN_LOOP.COMPILE_TILE:
          const tileId = await this.#renderer.compileTile(procObj);
          this.#callback({
            _callbackid: callbackId, 
            result: tileId 
          });
          break;

        case protocol.MTYPE.RUN_LOOP.COMPILE_TILE_MAP:
          const mapId = await this.#renderer.compileTileMap(procObj);
          this.#callback({
            _callbackid: callbackId, 
            result: mapId
          });
          break;

        case protocol.MTYPE.RUN_LOOP.COMPILE_SPRITE:
          const spriteId = await this.#renderer.compileSprite(procObj);
          this.#callback({
            _callbackid: callbackId, 
            result: spriteId
          });
          break;

        case protocol.MTYPE.RUN_LOOP.COMPILE_SHAPE:
          const shapeId = this.#renderer.compileShape(procObj.instructions, procObj.tag);
          this.#callback(shapeId, {
            _callbackid: callbackId
          });
          break;

        case protocol.MTYPE.RUN_LOOP.DESTROY_TILE:
          break;

        case protocol.MTYPE.RUN_LOOP.DESTROY_TILE_MAP:
          break;

        case protocol.MTYPE.RUN_LOOP.DESTROY_SPRITE:
          break;

        case protocol.MTYPE.RUN_LOOP.DESTROY_SHAPE:
          break;

        //-------------------------
        // rendering

        case protocol.MTYPE.RUN_LOOP.PRE_FRAME:
          this.#renderer.preFrame(event.data.time, event.data.deltaTime);
          break;

        case protocol.MTYPE.RUN_LOOP.RENDER_INSTRUCTIONS:
          this.#renderer.renderInstructionBuffer(event.data.buffer);
          break;

        case protocol.MTYPE.RUN_LOOP.POST_FRAME:
          this.#renderer.postFrame(event.data.time, event.data.deltaTime);
          break;

        default:
          log.error('Unknown message type from RunLoop:', event.data);
      }
    }
  }

  #runLoopError(event) {
      log.error(event.message, event);
      throw new RunLoopError(this.#thread, event.message, event);
  }  

}