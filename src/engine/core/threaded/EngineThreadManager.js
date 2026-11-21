import RenderEngine from '../../renderEngine4.js';
import Context from '../../Context.js';

import { Logger } from '../lang/Console.js';
import RunLoopError from './RunLoopError.js';
import protocol from './Protocol.js';

const ctx = Context.getInstance();

let log;

// this will run in the main thread
self.isMainThread = true;
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

  #callbackList = [];
  #callbackResults = [];

  #particleBitmap = null;

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

  static get instance() {
    return EngineThreadManager.#instance;
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

  get callbacks() {
    return this.#callbackList;
  }

  get callbackResults() {
    return this.#callbackResults;
  }

  set bitmap(image) {
    this.#particleBitmap = image;
  }

  get bitmap() {
    return this.#particleBitmap;
  }

  async loadThread() {
    this.#thread = new Worker(new URL(`./RunLoop.js${ctx.preventThreadCache}`, import.meta.url), {
      name: `RE4_gameLoop`,
      type: 'module'
    });

    // setup event handlers
    this.#thread.addEventListener("message", (event) => {
      this.runLoopInbound(event);     
    });

    this.#thread.addEventListener("error", (event) => {
      this.runLoopError(event);
    });

    this.#thread.addEventListener("messageerror", (event) => {
      console.error("Serialization/cloning failed:", event);
    });

    const $this = this;
    const p = new Promise(resolve => {
      log.debug('waiting for run-loop')
      $this.callWhenReady = resolve;
    });
    setTimeout(() => {
      // initialize the run loop and wait for it to start
      $this.send({ 
        type: protocol.MTYPE.ENGINE_MANAGER.INIT,
        renderer: this.#renderer.constructor.name
      });
    }, 250);
    return p;
  }

  send(data, transfer) {
    data = {
      re4: protocol.MSG.ENGINE_MANAGER,
      ... data };
    this.thread.postMessage(data, transfer);

    log.verbose('ETM::runLoopOutbound', data);
  }

  #callback(obj, model) {
    this.#callbackList.push({ obj: obj, fn: model});
    const fn = () => { this.processCallbacks() };
    setTimeout(fn, 0);
  }

  async processCallbacks() {
    while (this.callbacks.length > 0) {
      const cb = this.callbacks.shift();
      const obj = cb.obj;
      const model = await cb.fn(obj);
      this.#callbackResults.push([model._callbackid, model.result]);
    }
    const fn = () => { this.returnCallbacks() };
    setTimeout(fn, 0);
  }

  returnCallbacks() {
    while (this.callbackResults.length > 0) {
      const cbResult = this.callbackResults.shift();
      const result = {
        _callbackid: cbResult[0],
        type: protocol.MTYPE.ENGINE_MANAGER.CALLBACK,
        result: cbResult[1]
      };
      this.send(result);
    }
  }

  async runLoopInbound(event) {
    log.verbose('ETM::runLoopInbound', event.data);
    const { type, object } = event.data;
    let callbackId, procObj = null, callResult;
    if (event.data.re4 === protocol.MSG.RUN_LOOP) {
      
      // expecting a return value
      if (event.data._callbackid) {
        callbackId = event.data._callbackid;
        
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
            gameUrl: this.#gameUrl.toString(),
            assembler: RenderEngine.renderer.assembler.constructor.name
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
          this.#callback(structuredClone(procObj), async (obj) => { return {
            _callbackid: callbackId, 
            result: await this.#renderer.compileTile(obj) 
          }});
          break;

        case protocol.MTYPE.RUN_LOOP.COMPILE_TILE_MAP:
          this.#callback(structuredClone(procObj), async (obj) => { 
            return {
              _callbackid: callbackId,
              result: await this.#renderer.compileTileMap(obj)
            }
          });
          break;

        case protocol.MTYPE.RUN_LOOP.COMPILE_SPRITE:
          this.#callback(structuredClone(procObj), async (obj) => { 
            return {
              _callbackid: callbackId, 
              result: await this.#renderer.compileSprite(obj)
            }
          });
          break;

        case protocol.MTYPE.RUN_LOOP.COMPILE_SHAPE:
          this.#callback(structuredClone(procObj), async (obj) => { 
            return {
              _callbackid: callbackId,
              result: await this.#renderer.compileShape(obj.instructions, obj.tag)
            }
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

        //--------------------------
        // particles

        case protocol.MTYPE.RUN_LOOP.PARTICLE_BITMAP:
          this.bitmap = event.data.bitmap;
          break;

        //--------------------------
        // loading

        case protocol.MTYPE.RUN_LOOP.LOADING:
          document.querySelector('div#loading div.text').textContent = event.data.text || 'LOADING...';
          document.getElementById('loading').classList.remove('hide');
          break;

        case protocol.MTYPE.RUN_LOOP.DONE_LOADING:
          document.getElementById('loading').classList.add('hide');
          break;

        default:
          log.error('Unknown message type from RunLoop:', event.data);
      }
    }
  }

  runLoopError(event) {
      log.error(event.message, event);
      throw new RunLoopError(this.#thread, event.message, event);
  }
  
  resume() {
    this.send({
      type: protocol.MTYPE.ENGINE_MANAGER.RESUME
    });
  }

  pause() {
    this.send({
      type: protocol.MTYPE.ENGINE_MANAGER.PAUSE
    });
  }

  stop() {
    this.send({
      type: protocol.MTYPE.ENGINE_MANAGER.STOP
    });
  }

  step() {
    this.send({
      type: protocol.MTYPE.ENGINE_MANAGER.STEP
    });
  }

  shutdown() {
    this.send({
      type: protocol.MTYPE.ENGINE_MANAGER.SHUTDOWN
    });
  }

}