import Constants from '../Constants.js';
import Config from '../core/Config.js';
import Context from '../Context.js';

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
            circularBuffer: true
        });
    }
}

class ParticleEngineThreadingConfig extends Config {
    constructor() {
        super({
          /**
           * Threading enabled
           * @type {boolean}
           */
          enabled: true,
          /**
           * Name of the collisions thread. Default is 'RE4 Collision Thread'.
           * @type {String}
           */
          name: 'RE4ParticleThread'
        });
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
    static async getInstance(width, height, config, threading) {
        if (ParticleEngine.#particleEngine === null) {
            if (threading.enabled && self.Worker) {
                console.debug('Loading particle thread manager');
                const pEngine = await import(new URL(`./threading/$ParticleEngine.js${ctx.preventScriptCache()}`, import.meta.url));
                const manager = new pEngine.default(width, height, config, threading, { engineOpts: ctx.engineOpts, debugOpts: ctx.debugOpts });
                await manager.start();
                ParticleEngine.#particleEngine = manager;
            } else {
                // load the particle engine interface into the main thread
                const pEngine = await import(new URL(`./$ParticleEngine.js${ctx.preventScriptCache()}`, import.meta.url));
                ParticleEngine.#particleEngine = pEngine.default.getInstance(width, height, config, threading);
                console.debug('Loaded particle engine')
            }
        }

        return ParticleEngine.#particleEngine;
    }
}

