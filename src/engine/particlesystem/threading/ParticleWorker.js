import Context from '../../Context.js';
import Constants from '../../Constants.js';

import ParticleWorkerError from './ParticleWorkerError.js';

import $ParticleEngine from '../$ParticleEngine.js';
import ParticleEffect from '../effects/ParticleEffect.js';
import BasicParticle from '../types/BasicParticle.js';

import TransferrableConfig from '../../core/TransferrableConfig.js';
import $Math from '../../core/Math.js';
import { Matrix2d } from '../../core/Matrix.js';

import { CanvasRasterAssembler, CanvasVectorAssembler } from '../../rendering/assemblers/canvas/CanvasAssemblers.js';

self.$Math = $Math;
self.Matrix2d = Matrix2d;

self.CanvasRasterAssembler = CanvasRasterAssembler;
self.CanvasVectorAssembler = CanvasVectorAssembler;

self.$$worker = null;
const ctx = Context.getInstance();

export default class ParticleWorker {
    #engineInstance = null;
    #workerId = null;
    #classMap = new Map();
    #running = false;
    #lastTime = 0;
    #fps = 0;
    #startTime = 0;
    #assembler = null;

    constructor(workerId, assembler, width, height, config, threading, systemOpts) {
        this.#engineInstance = $ParticleEngine.getWorkerInstance(width, height, config, threading);
        this.#workerId = workerId;

        // initialize the context with the system options
        ctx.debugOpts = systemOpts.debugOpts;
        ctx.engineOpts = systemOpts.engineOpts;

        // add the root particle type
        this.#classMap.set('BasicParticle', BasicParticle);
        this.#fps = Math.floor(1000 / threading.framesPerSecond);
    
        this.readyUp(workerId, assembler);
    }

    set startTime(time) {
        this.#startTime = time;
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

    /**
     * Prepare the assembler for use by the worker. Let the orchestrator know the worker is ready to run.
     * 
     * @param {number} workerId - The worker's id for communicating back to the orchestrator
     * @param {string} assemblerClass - The assembler class to instantiate
     */
    readyUp(workerId, assemblerClass) {
        // create an assembler instance
        this.#assembler = self[assemblerClass].getInstance();

        postMessage({ 
            re4: Constants.PARTICLE_WORKER_MSG, 
            type: Constants.MSG_READY, 
            workerId: workerId 
        });  // inform the orchestrator that the worker is ready

        this.#run();
    }

    /**
     * Inform the orchestrator that we received a particle or effect. The orchestrator
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
            re4: Constants.PARTICLE_WORKER_MSG, 
            type: Constants.MSG_ACK, 
            workerId: this.#workerId,
            ack: type,
            name: obj.$name 
        });
    }

    /**
     * Process events from the Orchestrator thread
     * @param {Object} data 
     */
    async process(data) {
        switch(data.type) {
            case Constants.MSG_ADD_TYPE:
                const particle = await TransferrableConfig.reconstruct(data.particle);
                this.instance.addParticleType(particle);
                this.#acknowledge(particle, 'particle');
                break;
            case Constants.MSG_ADD_EFFECT:
                const effect = await TransferrableConfig.reconstruct(data.effect, (obj) => {obj.engine = this.instance;});
                this.instance.addEffect(effect);
                this.#acknowledge(effect, 'effect');
                break;
            case Constants.MSG_ADD_PARTICLES:
                this.instance.addParticles(data.particles);
                break;
            case Constants.MSG_RUN_EFFECT:
                this.instance.runEffect(data.pos, data.name, data.isReset, data.time, data.deltaTime);
                break;
            case Constants.MSG_SPAWN:
                this.instance.spawnParticle(data.pos, data.particle);
                break;
            case Constants.MSG_PAUSE:
                this.#running = false;
                break;
            case Constants.MSG_RUN:
                this.#run();
                break;
            case Constants.MSG_SHUTDOWN:
                this.#running = false;
                this.instance.shutdown();
                console.debug(`[ParticleWorker] Worker${this.#workerId} terminated`);
                self.close();
                break;
            default:
                console.error('[ParticleWorker] Unknown message type:', data.type);
        }
    }

    #run() {
        // this will run until the thread is terminated or paused
        setTimeout(() => {
            this.isRunning = true;
            this.startTime = performance.now();
            this.updateParticles();
        }, 100);
    }

    /**
     * The main processing loop updates, renders, then draws the particles
     * to a bitmap and informs the orchestrator when done, then pauses before the next
     * frame.
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
                const image = this.instance.bitmap;
                    postMessage({ 
                        re4: Constants.PARTICLE_WORKER_MSG, 
                        type: Constants.MSG_RENDERED, 
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
                }
                // free up to allow message handling and such
                await new Promise(resolve => setTimeout(resolve, this.#fps));
            }
        } catch (ex) {
            throw new ParticleWorkerError(this, ex.message, ex);        
        }
    }
}

/**
 * Listen for events from the orchestrator
 */
addEventListener('message', (event) => {
    if (event.data.re4 && event.data.re4 === Constants.ORCHESTRATOR_MSG) {
        if (event.data.type === Constants.MSG_INIT) {
            console.debug(`Starting ParticleWorker ${event.data.workerId}`);
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
            self.$$worker.process(event.data);
        }
    }
});
