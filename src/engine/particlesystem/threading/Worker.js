import Console from '../../core/Console.js';
import Context from '../../Context.js';

import $ParticleEngine from '../$ParticleEngine.js';
import Particle from '../Particle.js';
import ParticleEffect from '../ParticleEffect.js';

import $Math from '../../core/Math.js';
import { Matrix2d } from '../../core/Matrix.js';

self.$Math = $Math;
self.Matrix2d = Matrix2d;

let worker = null;

const ctx = Context.getInstance();

class ParticleWorker {
    #engineInstance = null;
    #workerId = null;
    #rendering = false;
    #updating = false;

    constructor(workerId, width, height, config, threading, systemOpts) {
        this.#engineInstance = $ParticleEngine.getInstance(width, height, config, threading);
        this.#workerId = workerId;

        // initialize the context with the system options
        ctx.debugOpts = systemOpts.debugOpts;
        ctx.engineOpts = systemOpts.engineOpts;
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
}

console.debug('Initialize worker thread listener');
self.onmessage = (event) => {
    if (event.data.re4 && event.data.re4 === 'particles') {
        if (event.data.type === 'init') {
            worker = new ParticleWorker(event.data.workerId, event.data.width, event.data.height, event.data.config, event.data.threading, event.data.systemOpts);
            postMessage({ re4: 'pWorker', workerId: event.data.workerId, type: 'ready' });
            console.debug(`Worker thread ${worker.workerId} started.`);
        } else if (worker) {
            switch(event.data.type) {
                case 'type':
                    // create a proxy particle type in the worker thread
                    const p = new Particle(event.data.particle.props);
                    p.spawn = new Function("$memory", "time", "type", "config", event.data.particle.f['spawn']).bind(self);
                    p.update = new Function("time", "deltaTime", "$memory", "pos", "vel", "life", event.data.particle.f['update']).bind(self);
                    p.render = new Function("time", "deltaTime", "$memory", "pos", "life", "target", "surface", event.data.particle.f['render']).bind(self);
                    p.cleanUp = new Function("$memory", event.data.particle.f['cleanUp']).bind(self);
                    worker.instance.addParticleType(event.data.name, p);
                    break;
                case 'addEffect':
                    // create a proxy particle effect in the worker thread
                    const e = new ParticleEffect(event.data.effect.types);
                    for (const prop in event.data.effect.props)
                        e[prop] = event.data.effect.props[prop];
                    worker.instance.addEffect(event.data.name, e);
                    break;
                case 'addParticles':
                    worker.instance.addParticles(event.data.particles);
                    break;
                case 'effect':
                    worker.instance.runEffect(event.data.pos, event.data.name, event.data.time, event.data.deltaTime);
                    break;
                case 'spawn':
                    worker.instance.spawnParticle(event.data.pos, event.data.particle);
                    break;
                case 'update':
                    // prevent repeat calls while performing other operations
                    if (worker.updating) return;
                    worker.updating = true;
                    worker.instance.update(event.data.time, event.data.deltaTime);
                    postMessage({ re4: 'pWorker', type: 'updated', workerId: worker.workerId, load: worker.instance.liveParticles / worker.instance.maxParticles, burden: worker.instance.maxParticles, live: worker.instance.liveParticles });
                    worker.updating = false;
                    break;
                case 'render':
                    if (worker.rendering) return;
                    worker.rendering = true;
                    worker.instance.renderParticles(event.data.time, event.data.deltaTime, event.data.mask);
                    const image = worker.instance.bitmap;
                    postMessage({ re4: 'pWorker', type: 'rendered', workerId: worker.workerId, image: image }, [image]);
                    worker.rendering = false;
                    break;
                default:
                    console.error('Unknown message type:', event.data.type);
            }
        }
    }
};
