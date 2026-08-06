import Console from '../../core/Console.js';
import Context from '../../Context.js';
import Constants from '../../Constants.js';

import ParticleWorkerError from './ParticleWorkerError.js';

import $ParticleEngine from '../$ParticleEngine.js';
import Particle from '../Particle.js';
import ParticleEffect from '../ParticleEffect.js';

import $Math from '../../core/Math.js';
import { Matrix2d } from '../../core/Matrix.js';


self.$Math = $Math;
self.Matrix2d = Matrix2d;

let worker = null;
const ctx = Context.getInstance();

export default class ParticleWorker {
    #engineInstance = null;
    #workerId = null;
    #rendering = false;
    #updating = false;
    #running = false;

    constructor(workerId, width, height, config, threading, systemOpts) {
        this.#engineInstance = $ParticleEngine.getInstance(width, height, config, threading);
        this.#workerId = workerId;

        // initialize the context with the system options
        ctx.debugOpts = systemOpts.debugOpts;
        ctx.engineOpts = systemOpts.engineOpts;
    
        this.start(workerId);
    }

    get instance() {
        return this.#engineInstance;
    }

    get workerId() {
        return this.#workerId;
    }

    get rendering() {
        return this.#rendering;
    }

    get updating() {
        return this.#updating;
    }

    set rendering(state) {
        this.#rendering = state;
    }

    set updating(state) {
        this.#updating = state;
    }

    get isRunning() {
        return this.#running;
    }

    start(workerId) {
        postMessage({ 
            re4: Constants.PARTICLE_WORKER_MSG, 
            type: Constants.MSG_READY, 
            workerId: workerId 
        });  // inform the orchestrator that the worker is ready
    }

    process(data) {
        switch(data.type) {
            case Constants.MSG_ADD_TYPE:
                const strict = '"use strict;"\n'; 

                // create a proxy particle type in the worker thread
                const p = new Particle(data.particle.props);
                p.spawn = new Function("$memory", "time", "type", "config", strict + data.particle.f['spawn']);
                p.update = new Function("time", "deltaTime", "$memory", "pos", "vel", "life", strict +  data.particle.f['update']);
                p.render = new Function("time", "deltaTime", "$memory", "pos", "life", "target", "surface", strict +  data.particle.f['render']);
                p.cleanUp = new Function("$memory", strict +  data.particle.f['cleanUp']);
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
            case Constants.MSG_UPDATE:
                if (this.isRunning) return;
                this.updateParticles(data.time, data.deltaTime);
                break;
            default:
                console.error('[ParticleWorker] Unknown message type:', data.type);
        }
    }

    async updateParticles(time, deltaTime) {
        try {
            // start running until empty
            if (this.isRunning) return;
            this.#running = true;

            let lastTime = 0, time = performance.now(), deltaTime = time;

            while(this.isRunning) {
                lastTime = time;
                time = performance.now();
                deltaTime = time - lastTime;

                const updateTime = this.instance.update(time, deltaTime);
                const renderTime = this.instance.renderParticles(time, deltaTime, null);
                const image = this.instance.bitmap;
                postMessage({ 
                    re4: Constants.PARTICLE_WORKER_MSG, 
                    type: Constants.MSG_RENDERED, 
                    workerId: worker.workerId,
                    time: time,
                    deltaTime: deltaTime, 
                    image: image,
                    metrics: {
                        updateTime: updateTime,
                        renderTime: renderTime,
                        live: this.instance.liveParticles
                    }
                }, [image]);

                if (this.instance.liveParticles === 0) this.#running = false;

                // free the CPU for processing
                await new Promise(resolve => setTimeout(resolve, 17));
            }
        } catch (ex) {
            throw new ParticleWorkerError(this, ex.message, ex);        
        }
    }
}

addEventListener('message', (event) => {
    if (event.data.re4 && event.data.re4 === Constants.ORCHESTRATOR_MSG) {
        if (event.data.type === Constants.MSG_INIT) {
            console.debug(`Starting ParticleWorker ${event.data.workerId}`);
            worker = new ParticleWorker(event.data.workerId, event.data.width, event.data.height, event.data.config, event.data.threading, event.data.systemOpts);
        } else if (worker) {
            worker.process(event.data);
        }
    }
});
