import Constants from '../Constants.js';
import Context from '../Context.js';

import Engine, { Paths } from '../core/Engine.js';
import Config from '../core/config/Config.js';

import $Thread from '../core/threading/$Thread.js';

const ctx = Context.getInstance();

class ParticleEngineConfig extends Config {
    constructor() {
        super({
            /**
             * Disable the particle engine if not needed
             * @type {boolean}
             */
            disabled: false,

            // ------------------------------
            // Run loop options
            
            /**
             * Link particle engine updates to frame generation. If `true` the update cycle
             * of the particle engine will be run during the game engine's update. When `false`
             * the particle engine updates during the browser's animation frame callback.
             * @type {boolean}
             */
            link: true,
            /**
             * Operating priority for the particle engine in relation to the game engine. When the
             * two share the same thread, this impacts how much time is allocated to the particle engine
             * for processing updates to reduce lag in the game engine. It has no effect on the
             * threaded particle engine. See {@link ParticleEngineThreadingConfig} to configure
             * the worker `nice` value instead.
             * @type {number} A value between 0.0 and 1.0
             */
            nice: 0.25,

            // --------------------------------------
            // Rendering options

            /**
             * The distance from the boundaries at which particles are automatically killed.
             * @type {number}
             */
            boundaryExpansion: 50,

            /**
             * The number of divisions along the X and Y coordinates for the collision model
             * used to determine when a particle is near an influence zone.
             * @type {Object}
             */
            modelSize: {
                x: 20,
                y: 15 
            },

            // --------------------------------------
            // Memory options

            /**
             * Maximum number of particles. Memory is allocated as `[largest particle] * maxParticles`
             * where `[largest particle]` is based on its memory size.
             * @type {number}
             */
            maxParticles: Constants.MAX_PARTICLES,
            /**
             * A circular buffer uses a destructive overwrite method that ignores remaining life
             * in running particles, giving the appearance of performance for the trade-off that
             * particles may pop out of existence. When not circular, memory is not reused
             * until the particle using it has expired.
             * @type {boolean}
             */
            circularBuffer: true,
            /**
             * The maximum lifespan expected for a particle before it is removed from the simulation.
             * @type {number}
             */
            maxLifespan: 30000,
            /**
             * Memory segments for a non-circular buffer. To prevent longer-lived particles from
             * impacting the ability to spawn shorter-lived particles, memory is broken up into
             * segments by the lifespan of the particles. The memory allocated for short-lived
             * is the smallest, while the allocation for longer-liver particles grows by the
             * `scalingFactor` option. Segments are allocated
             * @type {number}
             */
            memorySegments: 4,
            /**
             * Memory segments are scaled by this factor increase the allocation space for
             * longer-lived particles compared to shorter-lived ones. At the default of `2`,
             * memory allocation doubles per segment.
             * @type {number}
             */
            scalingFactor: 2
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
           * Operating priority for the particle threads. Since the threaded workers are running 
           * separate from the game thread, they can update faster but consume more processing time.
           * This impacts how much time is allocated to each thread for processing.
           * @type {number} A value between 0.0 and 1.0
           */
          nice: 0.125,
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
          loadFactor: 0.03
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
            if (Engine.options.flags.threading.particles && !($Thread.isThreaded && $Thread.isMainThread)) {
                console.debug('Loading particle thread manager');
                const pManager = await import(new URL(`./threading/ParticleManager.js${ctx.preventScriptCache}`, import.meta.url));
                const manager = new pManager.default(renderContext, width, height, config, threading, ctx.getOpts(), {engine: Paths.engine, startup: Paths.startup, game: Paths.game});
                await manager.start();
                ParticleEngine.#particleEngine = manager;
                console.log('ParticleManager loaded');
            } else if (!($Thread.isThreaded && $Thread.isMainThread)) {
                // load the particle engine interface into the main thread
                const pEngine = await import(new URL(`./$ParticleEngine.js${ctx.preventScriptCache}`, import.meta.url));
                ParticleEngine.#particleEngine = pEngine.default.getInstance(renderContext, width, height, config, null);
                console.log('ParticleEngine loaded')
            }
        }

        return ParticleEngine.#particleEngine;
    }
}

