import '../../_debug/DebugHarness.js';

import Context from '../../Context.js';
import { Paths } from '../../core/Engine.js';
import { Logger } from '../../core/lang/Console.js';
import TransferrableConfig from '../../core/config/TransferrableConfig.js';
import $Math from '../../core/lang/Math.js';
import { Matrix2d } from '../../core/lang/Matrix.js';
import { initializeSystemMM } from '../../core/memory/FastMemoryPool.js';

import ParticleWorkerError from './ParticleWorkerError.js';
import $ParticleEngine from '../$ParticleEngine.js';
import ParticleEffect from '../ParticleEffect.js';
import Particle from '../Particle.js';

import protocol from './Protocol.js';

import CanvasAssembler from '../../rendering/assemblers/CanvasAssembler.js';

self.$Math = $Math;
self.Matrix2d = Matrix2d;

self.CanvasAssembler = CanvasAssembler;

// this will reference ourselves in the worker thread so we can access the worker instance from the message handler
self.$$worker = null;
const ctx = Context.getInstance();

let log;

/**
 * @class ParticleWorker
 * @classdesc The ParticleWorker class is responsible for managing a single worker thread that handles particle system operations. It initializes the particle engine instance, 
 * processes messages from the orchestrator, and runs the main update loop for particle rendering and updates. The worker communicates with the orchestrator to acknowledge 
 * received particles, effects, and affectors, and sends rendered images back to the orchestrator for display.
 */
export default class ParticleWorker {
    #engineInstance = null;
    #workerId = null;
    #classMap = new Map();
    #running = false;
    #lastTime = 0;
    #fps = 0;
    #startTime = 0;
    #assembler = null;
    #latched = true;

    constructor(workerId, assembler, width, height, config, threading, systemOpts) {
        this.#workerId = workerId;

        // override the console
        log.debug('initializing ...');

        // setup memory management for the worker
        initializeSystemMM();

        this.#engineInstance = $ParticleEngine.getWorkerInstance(width, height, config, threading);

        // initialize the context with the system options
        ctx.debugOpts = systemOpts.debugOpts;
        ctx.engineOpts = systemOpts.engineOpts;
        ctx.pragmas = systemOpts.pragmas;
        ctx.trackPerformance = systemOpts.trackPerformance;

        // add the root particle type
        this.#classMap.set('Particle', Particle);
        this.#fps = Math.floor(1000 / threading.framesPerSecond);
        this.#assembler = self[assembler].getInstance();

        this.readyUp();
    }

    set startTime(time) {
        this.#startTime = time;
    }

    get startTime() {
        return this.#startTime;
    }

    set isRunning(state) {
        this.#running = state;
    }

    /**
     * Get the particle engine instance for this worker
     */
    get instance() {
        return this.#engineInstance;
    }

    /**
     * Get the worker's Id
     */
    get workerId() {
        return this.#workerId;
    }

    get classMap() {
        return this.#classMap;
    }

    get assembler() {
        return this.#assembler;
    }

    /**
     * The particle worker is ready to process requests
     */
    readyUp() {
        postMessage({ 
            re4: protocol.MSG.WORKER, 
            type: protocol.MTYPE.WORKER.READY, 
            workerId: this.workerId 
        });
        log.verbose('prepared');
    }

    /**
     * Inform the orchestrator that we received a particle, effect, or repulsor. The orchestrator
     * will wait for workers to acknowledge all required assets before acknowledging readiness
     * itself.
     * 
     * @param {BasicParticle|ParticleEffect} obj - The particle or effect received
     * @param {String} type - 'particle' or 'effect'
     */
    #acknowledge(obj, type) {
        // let the orchestrator know that a 
        // particle or effect was received
        postMessage({ 
            re4: protocol.MSG.WORKER, 
            type: protocol.MTYPE.WORKER.ACK, 
            workerId: this.#workerId,
            ack: type,
            name: obj.$name 
        });
        log.verbose(`acknowledge receipt (${type})`, obj);
    }

    /**
     * Process events from the Orchestrator thread
     * @param {Object} data 
     */
    async process(data) {
        switch(data.type) {
            case protocol.MTYPE.ORCHESTRATOR.GENESIS:
                this.instance.initialize();     // creates the memory buffers
                this.#run();
                break;
            case protocol.MTYPE.ORCHESTRATOR.ADD_TYPE:
                const particle = await TransferrableConfig.reconstruct(data.particle, (obj) => {obj.engine = this.instance;});
                this.instance.addParticleType(particle);
                this.#acknowledge(particle, protocol.MTYPE.WORKER.ACK_TYPE);
                break;
            case protocol.MTYPE.ORCHESTRATOR.ADD_EFFECT:
                const effect = await TransferrableConfig.reconstruct(data.effect, (obj) => {obj.engine = this.instance;});
                this.instance.addEffect(effect);
                this.#acknowledge(effect, protocol.MTYPE.WORKER.ACK_EFFECT);
                break;
            case protocol.MTYPE.ORCHESTRATOR.ADD_ZONE:
                const influencer = await TransferrableConfig.reconstruct(data.affector, (obj) => {obj.engine = this.instance;});
                this.instance.addInfluencer(influencer);
                this.#acknowledge(influencer, protocol.MTYPE.WORKER.ACK_ZONE);
                break;
            case protocol.MTYPE.ORCHESTRATOR.UPDATE_ZONE:
                this.instance.updateInfluencer(data.affector);
                break;
            case protocol.MTYPE.ORCHESTRATOR.REMOVE_ZONE:
                this.instance.removeInfluencer(data.affector);
                break;
            case protocol.MTYPE.ORCHESTRATOR.ADD_PARTICLES:
                this.instance.addParticles(data.particles);
                break;
            case protocol.MTYPE.ORCHESTRATOR.RUN_EFFECT:
                this.instance.runEffect(data.pos, data.opaqueId, data.time, data.deltaTime);
                break;
            case protocol.MTYPE.ORCHESTRATOR.SPAWN:
                this.instance.spawnParticle(data.pos, data.particle);
                break;
            case protocol.MTYPE.ORCHESTRATOR.PAUSE:
                this.#running = false;
                break;
            case protocol.MTYPE.ORCHESTRATOR.RUN:
                this.#run();
                break;
            case protocol.MTYPE.ORCHESTRATOR.SHUTDOWN:
                this.#running = false;
                this.instance.shutdown();
                log.verbose(`TERMINATED`);
                self.terminate();
                break;
            default:
                log.error('Unknown message type from orchestrator:', data);
        }
    }

    #run() {
        // this will run until the thread is terminated or paused
        setTimeout(() => {
            this.isRunning = true;
            this.startTime = performance.now();
            this.updateParticles();
        }, 100);
        log.verbose('starting update/render loop');
    }

    /**
     * The main processing loop updates, renders, then draws the particles
     * to a bitmap and informs the orchestrator when done. Runs at the fps
     * configured for the particle system.
     * @param {number} timeOrigin - The time at which the worker started
     */
    async updateParticles() {
        try {
            while(this.#running) {
                let time = performance.now(), deltaTime = time - this.#lastTime;
                this.#lastTime = time;

                const updateTime = this.instance.update(time, deltaTime);
                const renderTime = await this.instance.renderParticles(time, deltaTime, null);
                if (renderTime !== -1) {
                    // latch the cleanup mechanism
                    this.#latched = true;               
                    const image = this.instance.bitmap;
                    postMessage({ 
                        re4: protocol.MSG.WORKER, 
                        type: protocol.MTYPE.WORKER.RENDERED, 
                        workerId: this.#workerId,
                        time: time,
                        deltaTime: deltaTime, 
                        image: image,
                        metrics: {
                            updateTime: updateTime,
                            renderTime: renderTime,
                            live: this.instance.liveParticles
                        }
                    }, [image]);
                } else  // rendertime of -1 indicates "no particles"
                    this.#cleanUp();
                
                // free up to allow message handling and such
                await new Promise(resolve => setTimeout(resolve, this.#fps));
            }
        } catch (ex) {
            log.error(ex);
            throw new ParticleWorkerError(this, ex.message, ex);        
        }
    }

    /**
     * After the last particle has been rendered, this cleans up the
     * bitmap so it doesn't linger with dead particles.
     * @private
     */
    #cleanUp() {
        if (this.#latched) {
            // no more particles, clean up the bitmap so dead particles don't get drawn anymore
            this.instance.surface.clearRect(0, 0, this.instance.offscreen.width, this.instance.offscreen.height);       
            const image = this.instance.bitmap;
            postMessage({ 
                re4: protocol.MSG.WORKER, 
                type: protocol.MTYPE.WORKER.RENDERED, 
                workerId: this.#workerId,
                time: 0,
                deltaTime: 0, 
                image: image,
                metrics: {
                    updateTime: 0,
                    renderTime: 0,
                    live: 0
                }
            }, [image]);
            
            // unlatch when completed
            this.#latched = false;
        }
    }
}

/**
 * Listen for events from the orchestrator
 */
addEventListener('message', (event) => {
    if (event.data.re4 && event.data.re4 === protocol.MSG.ORCHESTRATOR) {
        if (event.data.type === protocol.MTYPE.ORCHESTRATOR.INIT) {
            Paths.engine = event.data.paths.engine;
            Paths.startup = event.data.paths.startup;
            Paths.game = event.data.paths.game;

            self.console = new Logger(ParticleWorker, `${event.data.workerId}`, true);
            log = self.console;

            self.$$worker = new ParticleWorker(
                event.data.workerId, 
                event.data.assembler, 
                event.data.width, 
                event.data.height, 
                event.data.config, 
                event.data.threading, 
                event.data.systemOpts
            );
        } else if (self.$$worker) {
            // fixme: prolly also losing shit here...
            self.$$worker.process(event.data);
        } else {
            log.debug("Missed message in Worker", event);
        }
    }
});
