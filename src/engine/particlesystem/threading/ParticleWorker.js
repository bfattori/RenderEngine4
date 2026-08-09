import Console from '../../core/Console.js';
import Context from '../../Context.js';
import Constants from '../../Constants.js';

import ParticleWorkerError from './ParticleWorkerError.js';

import $ParticleEngine from '../$ParticleEngine.js';
import ParticleEffect from '../effects/ParticleEffect.js';

import BasicParticle from '../types/BasicParticle.js';

import $Math from '../../core/Math.js';
import { Matrix2d } from '../../core/Matrix.js';


self.$Math = $Math;
self.Matrix2d = Matrix2d;

self.$$worker = null;
const ctx = Context.getInstance();

export default class ParticleWorker {
    #engineInstance = null;
    #workerId = null;
    #classMap = new Map();

    constructor(workerId, width, height, config, threading, systemOpts) {
        this.#engineInstance = $ParticleEngine.getInstance(width, height, config, threading);
        this.#workerId = workerId;

        // initialize the context with the system options
        ctx.debugOpts = systemOpts.debugOpts;
        ctx.engineOpts = systemOpts.engineOpts;

        // add the root particle type
        this.#classMap.set('BasicParticle', BasicParticle);
    
        this.readyUp(workerId);
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
     * Let the orchestrator know the worker is 
     * ready to handle particles
     * @param {number} workerId 
     */
    readyUp(workerId) {
        postMessage({ 
            re4: Constants.PARTICLE_WORKER_MSG, 
            type: Constants.MSG_READY, 
            workerId: workerId 
        });  // inform the orchestrator that the worker is ready

        // this will run until the thread is terminated
        setTimeout(() => {
            this.updateParticles(performance.now());
        }, 100);
    }

    /**
     * Process events from the Orchestrator thread
     * @param {Object} data 
     */
    process(data) {
        switch(data.type) {
            case Constants.MSG_ADD_TYPE:
                const strict = '"use strict;"\n'; 

                // create a proxy particle type in the worker thread
                const p = new BasicParticle(data.particle.props);

                // inheritance
                this.#classMap.set(data.particle.clazz, p);
                if (this.#classMap.get(data.particle.inheritance[0])) {
                    p.constructor = this.#classMap.get(data.particle.inheritance[0]);
                }

                p.spawn = new Function("type", "time", "config", strict + data.particle.f['spawn']);
                p.update = new Function("time", "deltaTime", "$memory", "pos", "vel", "life", strict + data.particle.f['update']);
                p.render = new Function("time", "deltaTime", "$memory", "pos", "life", "target", "surface", strict + data.particle.f['render']);
                p.cleanUp = new Function("$memory", "$sup", strict + data.particle.f['cleanUp']);
                this.instance.addParticleType(data.name, p);

                break;
            case Constants.MSG_ADD_EFFECT:
                // create a proxy particle effect in the worker thread
                const e = new ParticleEffect(data.effect.types);
                for (const prop in data.effect.props)
                    e[prop] = data.effect.props[prop];
                this.instance.addEffect(data.name, e);
                break;
            case Constants.MSG_ADD_PARTICLES:
                this.instance.addParticles(data.particles);
                break;
            case Constants.MSG_RUN_EFFECT:
                this.instance.runEffect(data.pos, data.name, data.time, data.deltaTime);
                break;
            case Constants.MSG_SPAWN:
                this.instance.spawnParticle(data.pos, data.particle);
                break;
            case Constants.MSG_SHUTDOWN:
                this.instance.shutdown();
                console.debug(`[ParticleWorker] Worker${this.#workerId} terminated`);
                self.close();
                break;
            default:
                console.error('[ParticleWorker] Unknown message type:', data.type);
        }
    }

    /**
     * The main processing loop updates, renders, then draws the particles
     * to a bitmap and informs the orchestrator when done, then pauses before the next
     * frame.
     * @param {number} timeOrigin - The time at which the worker started
     */
    async updateParticles(timeOrigin) {
        try {
            // start running until empty
            let lastTime = 0, time = timeOrigin, deltaTime = time;

            while(true) {
                lastTime = time;
                time = performance.now();

                const updateTime = this.instance.update(time, time-lastTime);
                const renderTime = await this.instance.renderParticles(time, time-lastTime, null);
                if (renderTime !== -1) {
                const image = this.instance.bitmap;
                    postMessage({ 
                        re4: Constants.PARTICLE_WORKER_MSG, 
                        type: Constants.MSG_RENDERED, 
                        workerId: this.#workerId,
                        time: time,
                        deltaTime: time-lastTime, 
                        image: image,
                        metrics: {
                            updateTime: updateTime,
                            renderTime: renderTime,
                            live: this.instance.liveParticles
                        }
                    }, [image]);
                }
                // free up to allow message handling and such
                await new Promise(resolve => setTimeout(resolve, 17));
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
            self.$$worker = new ParticleWorker(event.data.workerId, event.data.width, event.data.height, event.data.config, event.data.threading, event.data.systemOpts);
        } else if (self.$$worker) {
            self.$$worker.process(event.data);
        }
    }
});
