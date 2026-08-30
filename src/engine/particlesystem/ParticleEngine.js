import Constants from '../Constants.js';
import Config from '../core/Config.js';
import Context from '../Context.js';

import Engine from '../core/Engine.js';

const ctx = Context.getInstance();

class ParticleEngineConfig extends Config {
    constructor() {
        super({
            /**
             * Disable the particle engine if not needed
             * @type {boolean}
             */
            disabled: false,
            /**
             * Maximum number of particles to allow
             * @type {number}
             */
            maxParticles: Constants.MAX_PARTICLES,
            /**
             * Circular buffer for particles. If `false` particles are allocated as space becomes free.
             * @type {boolean}
             */
            circularBuffer: true,
            /**
             * Play nicely with the main thread
             */
            nice: 5
        });
    }

    get varname() {
        return 'PARTICLE_ENGINE_OPTIONS';
    }
}

/**
 * @class Particle engine threading options. These are used to configure the particle engine threads which can be disabled, 
 * the number of workers (default is 4), and the operating priority of the particle engine threads (default is 1).
 * @extends Config
 */
class ParticleEngineThreadingConfig extends Config {
    constructor() {
        super({
          /**
           * Operating priority for the particle threads.
           * The value is a number between 0 and 1. Zero means the thread does 
           * not get any CPU time, and 1 means the thread gets all available 
           * CPU time. Default is 1.
           * @type {number}
           */
          nice: 1,
          /**
           * Name of the particle threads. Default is 'RE4Particles'.
           * @type {String}
           */
          name: 'RE4Particles',
          /**
           * Number of workers to use for the particle engine. Default is 4.
           * @type {number}
           */
          workers: 4,
          /**
           * The threshold used by the orchestrator to determine particle distribution 
           * during threading. As particles are added to the buffer, load determines the 
           * distribution. For circular buffers, this ensures a more even distribution. 
           * Default is 0.75 (75%).
           */
          loadThreshold: 0.75,
          /**
           * The load factor used in the orchestrator to determine particle distribution during threading.
           * As particles are added to the buffer, load determines the distribution. But as the load threshold 
           * is reached, the orchestrator will distribute particles to the next available worker by increasing
           * the threshold until it reaches 100%. Default is 0.1 (10%).
           */
          loadFactor: 0.03,
          /**
           * The threaded engine is running separate from the game engine so it will can run at
           * frame rates higher than the game, causing effects to end sooner than desired. Tune this
           * value to get better results from particle rendering.
           */
          framesPerSecond: 30 
        });
    }

    get varname() {
        return 'PARTICLE_THREADING_OPTIONS';
    }
}


export { ParticleEngineConfig, ParticleEngineThreadingConfig };

export default class ParticleEngine {
    static #particleEngine = null;

    /**
     * Get the instance of the particle engine
     * @param {number} width - The width of the particle system
     * @param {number} height - The height of the particle system
     * @param {Object} config - The configuration for the particle engine
     * @param {Object} threading - The threading configuration for the particle engine
     * @returns {Orchestrator} The particle engine
     */
    static async getInstance(renderContext, width, height, config, threading) {
        if (ParticleEngine.#particleEngine === null) {
            if (Engine.options.flags.threading.particles && self.Worker) {
                console.debug('Loading particle thread manager');
                const pEngine = await import(new URL(`./threading/$ParticleEngine.js${ctx.preventScriptCache}`, import.meta.url));
                const manager = new pEngine.default(renderContext, width, height, config, threading, { engineOpts: ctx.engineOpts, debugOpts: ctx.debugOpts });
                await manager.start();
                ParticleEngine.#particleEngine = manager;
            } else {
                // load the particle engine interface into the main thread
                const pEngine = await import(new URL(`./$ParticleEngine.js${ctx.preventScriptCache}`, import.meta.url));
                ParticleEngine.#particleEngine = pEngine.default.getInstance(renderContext, width, height, config, null);
                console.debug('Loaded particle engine')
            }
        }

        return ParticleEngine.#particleEngine;
    }
}

