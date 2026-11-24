import RenderEngine from '../../renderEngine4.js';
import Context from '../../Context.js';

import { Logger } from '../lang/Console.js';
import GameThreadError from './GameThreadError.js';
import protocol from './Protocol.js';

import LoadCounter from '../../ui/debug/LoadCounter.js';
import CanvasPIP from '../../ui/debug/CanvasPIP.js';

import $Thread from './$Thread.js';
import GameThread from './GameThread.js';

const ctx = Context.getInstance();
let log;

/**
 * This is the go between from the main thread where the renderer will run
 * and the worker thread running the engine loop and game code.
 * 
 *
 */
export default class MainThread extends $Thread {
  static #instance = null;
  
  #gamePath;
  #gameRoot;
  #renderer = null;

  #gameThread = null;

  #ready = false;
  #whenReady = null;
  #gameUrl;
  #callbackList = [];
  #callbackResults = [];
  #particleBitmap = null;
  #loadCounters = new Map();
  #pips = new Map();

  constructor(gamePath, gameRoot, renderer) {
    super($Thread.MAIN_THREAD_NAME);
    log = new Logger(MainThread, null, true);
    this.#gameUrl = new URL(gamePath, gameRoot);
    this.#gamePath = gamePath;
    this.#gameRoot = gameRoot;
    this.#renderer = renderer;
  }

  static get instance() {
    return MainThread.#instance;
  }
  
  get renderer() {
    return this.#renderer;
  }

  get gameUrl() {
    return this.#gameUrl;
  }

  get gameThread() {
    return this.#gameThread.thread;
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

  set particleBitmap(image) {
    this.#particleBitmap = image;
  }

  get particleBitmap() {
    return this.#particleBitmap;
  }

  async start() {
    log.log('Starting game thread');
    await this.load();
    log.log('Game thread started');
    return this;
  }

  async load() {
    const gameWorker = new Worker(new URL(`./GameThread.js${ctx.preventThreadCache}`, import.meta.url), {
      name: `RE4GameThread`,
      type: 'module'
    });

    // setup event handlers
    gameWorker.addEventListener("message", (event) => {
      this.gameThreadInbound(event);     
    });

    gameWorker.addEventListener("error", (event) => {
      this.runLoopError(event);
    });

    gameWorker.addEventListener("messageerror", (event) => {
      console.error("Serialization/cloning failed:", event);
    });

    const $this = this;
    const p = new Promise(resolve => {
      log.debug('Waiting for game thread to initialize')
      $this.callWhenReady = resolve;
    });

    // remeber the thread instance
    this.#gameThread = new GameThread(gameWorker, this.renderer);

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
    log.verbose('ETM::gameThreadOutbound', data);
    this.#gameThread.thread.postMessage(data, transfer);
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

  async gameThreadInbound(event) {
    log.verbose('ETM::gameThreadInbound', event.data);
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
          this.gameThread.postMessage({
            re4: protocol.MSG.ENGINE_MANAGER,
            type: protocol.MTYPE.ENGINE_MANAGER.START,
            gameUrl: this.#gameUrl.toString(),
            assembler: this.renderer.assembler.constructor.name
          });
          this.callWhenReady();
          break;

        case protocol.MTYPE.RUN_LOOP.ENGINE_CONFIG:
          event.data.engineConfig._runLoop = true;
          await RenderEngine.setEngineConfig(event.data.engineConfig);
          break;

        case protocol.MTYPE.RUN_LOOP.TERMINATED:
          log.verbose('RunLoop reports terminated');
          this.gameThread.terminate();
          this.gameThread = null;
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
          this.particleBitmap = event.data.bitmap;
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

        case protocol.MTYPE.RUN_LOOP.COUNTER_CONFIG:
          this.fixConfigFunctions(event.data.config);
          const counterView = new LoadCounter(event.data.config.title, event.data.config);
          this.#loadCounters.set(event.data.config.title, counterView);
          counterView.initializeView();
          break;

        case protocol.MTYPE.RUN_LOOP.COUNTER_UPDATE:
          const updCounter = this.#loadCounters.get(event.data.counter);
          updCounter.update(event.data.view, event.data.value);
          break;

        case protocol.MTYPE.RUN_LOOP.PIP_CONFIG:
          const pip = new CanvasPIP(event.data.pip, event.data.config.top, event.data.config.width, event.data.config.height);
          this.#pips.set(event.data.pip, pip);
          pip.initializeView();
          break;

        case protocol.MTYPE.RUN_LOOP.PIP_UPDATE:
          const pipView = this.#pips.get(event.data.pip);
          pipView.update(event.data.image);
          break;

        default:
          log.error('Unknown message type from RunLoop:', event.data);
      }
    }
  }

  fixConfigFunctions(configObject) {
    // convert the functions into JSON to reconstruct on the other side
    Object.keys(configObject.options).forEach(configName => {
      const config = configObject.options[configName];
      Object.keys(config).forEach(optionName => {
        if (typeof config[optionName] === 'string' && config[optionName].startsWith('{\"$T\":')) {
          const fnDecl = JSON.parse(config[optionName]);
          config[optionName] = new Function(`const fn=${fnDecl.fn};return fn;`)();
        }
      });
    });
  }

  runLoopError(event) {
      log.error(event.message, event);
      throw new GameThreadError(this.#gameThread, event.message, event);
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