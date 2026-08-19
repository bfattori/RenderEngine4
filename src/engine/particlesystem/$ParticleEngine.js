import RenderEngineError from '../core/RenderEngineError.js';
import Engine from '../core/Engine.js';
import Context from '../Context.js';
import LoadCounter from '../ui/debug/LoadCounter.js';

import { ParticleEngineConfig, ParticleEngineThreadingConfig } from './ParticleEngine.js';

const ctx = Context.getInstance();

export default class $ParticleEngine {
    static #instance = null;
    static #useBuilder = true;

    #config = new ParticleEngineConfig();
    #threading = new ParticleEngineThreadingConfig();

    // particle types the engine is configured to render
    #particleTypes = new Map();

    // particle effects the engine is configured to run
    #particleEffects = new Map();

    // when new particles are added, this goes true
    #newParticles = false;

    // these are the arrays of particle "memories", positions, velocities, and lifespans.  
    // the particle engine only has access to this information during the lifecycle stages
    #memories = null;
    #pPos = null;
    #pVel = null;
    #pSpan = null;
    
    // pointer to the arrays above
    #particleIdx = 0;
    
    // number of particles that are live in the engine
    #liveParticles = 0;
    
    // particles are added to a buffer to be added after each update completes
    // this comes down to threading, since world updates occur simultaneous to particle updates
    #buffered = [];

    // the render context for the particle engine, combined back with the
    // context in the main thread
    #offscreen = null;
    #surface = null;

    #engineLoadView = null;
    #start = 0;

    /**
     * Get the instance of the ParticleEngine.  This method should be used instead of creating 
     * a new instance directly to enforce the singleton pattern.
     * @param {number} width - The width of the render context of the particle engine
     * @param {number} height - The height of the render context of the particle engine
     * @param {Object} config - The `particleEngine` portion of the engine configuration
     * @param {Object} threading - The `particleEngine` portion of the engine threading configuration
     * @returns {ParticleEngine} The `ParticleEngine` singleton instance
     * @static
     */
    static getInstance(width, height, config, threading) {
        if ($ParticleEngine.#instance === null) {
            $ParticleEngine.#useBuilder = false;
            $ParticleEngine.#instance = new $ParticleEngine(width, height, config, threading);
        }

        return $ParticleEngine.#instance;
    }

    /**
     * @private
     * Initialize the particle engine.
     */
    constructor(width, height, config, threading) {
        if ($ParticleEngine.#useBuilder)
            throw new RenderEngineError("Cannot instantiate $ParticleEngine directly. Use getInstance() instead.");

        // enforce singleton pattern
        $ParticleEngine.#useBuilder = true;

        PRAGMA('showParticleEngineLoad', () => {
            if (!threading.enabled) {
                const config = {
                    left: 5,
                    counters: ['Update:Load', 'Update:Time', 'Render:Load', 'Render:Time', 'Particles'],
                    options: {
                        'Update:Time': { suffix: ' ms' },
                        'Render:Time': { suffix: ' ms' },
                        'Update:Load': { bar: true, suffix: '%', clamp: 100.0 },
                        'Render:Load': { bar: true, suffix: '%', clamp: 100.0 },
                        'Particles': {}
                    }
                }
                this.#engineLoadView = new LoadCounter("Particle Engine Load", config);
            }
        });

        this.#config.merge(config);
        this.#threading.merge(threading);

        // the rendering context for the particle engine
        this.#offscreen = new OffscreenCanvas(width, height);
        this.#surface = this.#offscreen.getContext('2d');
        this.#initializeParticles(config.maxParticles);
    }

    /**
     * Get the current configuration for the particle engine.
     * @returns {ParticleConfig} The current configuration
     */
    get config() {
        return this.#config;
    }

    get thread() {
        return this.#threading;
    }

    get enabled() {
        return !this.config.disabled;
    }

    get offscreen() {
        return this.#offscreen;
    }

    get surface() {
        return this.#surface;
    }

    /**
     * Get the maximum number of particles the engine can produce.
     * @returns {number} The maximum particle count
     */
    get maxParticles() {
        return this.config.maxParticles;
    }

    /**
     * Set the maxmimum number of particles the engine can produce.
     * @param {number} max - The maximum particle count
     */
    set maxParticles(count) {
        this.config.maxParticles = count;
        this.#initializeParticles(count);
    }

    /**
     * The number of particles that have not reached their lifespan
     * @return {number} Number of live particles
     */
    get liveParticles() {
        return this.#liveParticles;
    }

    /**
     * Returns `true` if the buffer is circular
     * @returns {boolean} `true` if the buffer is circular, `false` otherwise.
     */
    get isCircular() {
        return this.config.circularBuffer;
    }

    /**
     * The particle types available to the engine
     * @returns {Map<string, ParticleType>} A map of particle types to their corresponding ParticleType objects.
     */
    get types() {
        return this.#particleTypes;
    }

    /**
     * The particle effects available to the engine
     * @returns {Map<string, ParticleEffect>} A map of particle effects to their corresponding ParticleEffect objects.
     */
    get effects() {
        return this.#particleEffects;
    }

    /**
     * Get the bitmap image of the offscreen canvas, and reset it
     * for the next rendering.
     * @returns {ImageBitmap} The bitmap image of the offscreen canvas, and reset it
     */
    get bitmap() {
        return this.#offscreen.transferToImageBitmap();
    }

    /**
     * Initialize the particle arrays.  This is also called if `maxParticles` is changed.
     * @param {number} count - The maximum number of particles the engine will create
     * @private
     */
    #initializeParticles(count) {
        this.#pPos = new Array(count).fill([0,0]);          // stores x and y as an array
        this.#pVel = new Array(count).fill([0,0]);          // stores vX and vY as an array
        this.#pSpan = new Array(count).fill(0);               // single value for each lifespan as Number
        this.#memories = new Array(count).fill(null);        // array that will hold the particle memory
    }

    get state() {
        const p = [], l = [], m = [];
        for (let i = 0; i < this.#memories.length; i++) {
            if (this.#memories[i] !== null) {
                p.push(this.#pPos[i]);
                l.push(this.#pSpan[i]);
                m.push(this.#memories[i]);
            }
        }
        return {
            positions: p,
            memory: m,
            spans: l
        };
    }

    /**
     * Get the next available pointer into the buffer. A circular buffer will wrap aroung
     * and being overwriting existing particles. A non-circular buffer will look for the first
     * available opening in the buffer. If none is available, -1 is returned.
     * @returns {number} The next available index in the buffer, or -1 if no free spot is available
     * @private
     */
    get #nextIndex() {
        if (this.isCircular && this.#particleIdx > this.maxParticles)
            this.#particleIdx = 0;    // wrap
        else if (this.isCircular)
            return this.#particleIdx++;
        else if (!this.isCircular) {
            // find first free index (could be -1)
            this.#particleIdx = this.#memories.findIndex((e) => e === null);
        }

        return this.#particleIdx;
    }

    /**
     * Add multiple particle types to the engine at once
     * @param  {...BasicParticle} particles - Particle types
     */
    addParticleTypes(...particles) {
        particles.forEach(p => this.addParticleType(p));
    }

    /**
     * Add a new particle type to the particle engine
     * @param {String} name 
     * @param {Particle} particle 
     */
    addParticleType(particle) {
        if (this.types.get(particle.$name) === undefined)
            this.types.set(particle.$name, particle);
    }

    /**
     * Get the particle type for the name
     * @param {String} name - The name of the particle type
     * @returns {Object} The configuration object for the specified particle type, or undefined if no such type exists
     */
    getParticleType(name) {
        return this.types.get(name);
    }

    /**
     * Add a set of particles at once. Particles have two properties: `pos` and `type`
     * @param {Array<Object>} particles The set of particles
     */
    addParticles(particles) {
        this.#newParticles |= particles.length !== 0;
        for (const particle of particles) {
            this.addParticle(particle);
        }
    }

    /**
     * Add a single particle to the engine
     * @param particle {Object} A particle contains `pos` ([x, y]) and `type`
     */
    addParticle(particle) {
        if (!this.enabled) return;
        this.#buffered.push(particle);
    }

    /**
     * 
     * @param {Array<number>} worldPos - [x,y] world position to spawn the particle 
     * @param {number} time - The current world time in milliseconds
     * @param {Object} particle - Initialized particle data 
     */
    spawnParticle(worldPos, time, particle) {
        this.#newParticles = true;
            const idx = this.#nextIndex;
            if (idx !== -1) {
                this.#pPos[idx] = [worldPos[0], worldPos[1]];
                this.#pVel[idx] = [particle.vel[0], particle.vel[1]];
                this.#pSpan[idx] = particle.life;
                this.#memories[idx] = particle.memory;                        
            } else if (ctx.debug)
                console.warn(`Failed to spawn particle: ${particle.$pType} - no available memory`);        
    }

    /**
     * Add multiple particle effects to the engine at once
     * @param  {...ParticleEffect} effects - Particle types
     */
    addEffects(...effects) {
        effects.forEach(e => this.addEffect(e));
    }

    /**
     * Add a particle effect
     * @param particleEffect
     * @return {ParticleEffect} The instance of the effect
     */
    addEffect(particleEffect) {
        particleEffect.engine = this;
        this.effects.set(particleEffect.$name, particleEffect);
    }

    /**
     * Get a particle effect by name
     * @param {String} name - The particle effect name
     * @returns {ParticleEffect} The instance of the effect or null if it does not exist.
     */
    getEffect(name) {
        return this.effects.get(name);
    }

    /**
     * Emit particles using an effect, into the particle engine, at a specified world position. 
     * 
     * @param {Array<number>} param0 - The [x,y] world coordinates where the effect should emit particles
     * @param {String} effectName - The name of the effect to run, effects contain the functionality to generate and modify particles emitted to the engine
     * @param {number} time - Current world time in milliseconds 
     * @param {number} deltaTime - The time in milliseconds since the last frame
     */
    runEffect([x, y], effectName, time, deltaTime) {
        const effect = this.getEffect(effectName);
        if (effect)
            effect.run([x, y], time, deltaTime);
    }

    //------------------------------------
    // Lifecycle methods

    /**
     * Update the particles within the render context, and for the specified time.
     *
     * @param time {Number} The global time within the engine.
     * @param deltaTime {Number} The delta between the world time and the last time the world was updated
     *          in milliseconds.
     */
    update(time, deltaTime) {
        if (!this.enabled) return 0;

        // If there are no new particles in the buffer, and no live particles, don't do anything
        if (!this.#newParticles && this.liveParticles === 0) {
            return 0;
        }

        // add any particles that are queued...
        this.#start = PERF('particlesUpdateStart');

        while(this.#buffered.length > 0) {
            // spawn the particle
            const p = this.#buffered.shift();
            this.spawnParticle(p.pos, time, p.type);
        }

        // run all particles
        let lives = 0;
        this.#memories.forEach((memory, idx) => {
            if (memory !== null && this.#pSpan[idx] !== 0) {
                this.#runParticle(memory, idx, time, deltaTime);
                lives++;
            }
        })

        this.#liveParticles = lives;
        this.#newParticles = false;
        PERF('particlesUpdateEnd');
        MEASURE('Update Particles', 'particlesUpdateStart', 'particlesUpdateEnd');

        const overall = performance.now() - this.#start;
        PRAGMA('showParticleEngineLoad', () => {
            if (!this.#threading.enabled) {
                this.#engineLoadView.update('Update:Load', (overall / deltaTime) * 100);
                this.#engineLoadView.update('Update:Time', overall);
            }
        });

        return overall;
    }

    /**
     * Run a single particle
     * @param {Object} memory - The particle's instantaneous memory
     * @param {number} idx - The particle index
     * @param {number} time - world time in milliseconds
     * @param {number} deltaTime - delta time in milliseconds since last frame
     */
    #runParticle(memory, idx, time, deltaTime) {
        // get the type configuration
        const pType = this.getParticleType(memory.$pType);
        
        // update the particle and then age it
        pType.update(time, deltaTime, memory, this.#pPos[idx], this.#pVel[idx], this.#pSpan[idx]);
        this.#pSpan[idx] -= deltaTime;

        // free-up space when dead
        if (this.#pSpan[idx] <= 0) {
            pType.cleanUp(memory);
            this.#memories[idx] = null;
        }
    }

    /**
     * Render all of the active particles to the render context
     * @param {number} time - The current world time 
     * @param {number} deltaTime - The time since the last frame
     * @param {Path2D} occlusionMask - Optional mask to clip areas that are occluded by objects
     */
    async renderParticles(time, deltaTime, occlusionMask = null, directSurface = null) {
        if (!this.enabled || this.liveParticles === 0) return -1;

        const render = PERF('particlesRenderStart');

        let surf = directSurface || this.#surface;
        this.#memories.forEach((memory, i) => {
            if (memory !== null) {
                const pType = this.getParticleType(memory.$pType);
                pType.render(time, deltaTime, memory, 
                    this.#pPos[i], this.#pSpan[i], 'canvas', surf);
            }
        });

        const renderTime = performance.now() - render;
        PERF('particlesRenderEnd');
        MEASURE('Render Particles', 'particlesRenderStart', 'particlesRenderEnd');
        PRAGMA('showParticleEngineLoad', () => {
            if (!this.#threading.enabled) {
                // using the last frame time, what
                // is the overall load of the PE on the CPU?
                this.#engineLoadView.update('Render:Load', (renderTime / deltaTime) * 100);
                this.#engineLoadView.update('Render:Time', renderTime);
                this.#engineLoadView.update('Particles', this.liveParticles);
            }
        });

        return renderTime;
    }

    reset() {
        this.#memories.fill(null);
        this.#liveParticles = 0;
        this.#newParticles = false;
    }

    shutdown() {
        this.reset();
        this.#particleEffects.clear();
        this.#particleTypes.clear();
    }

    /**
     * Get the properties object for the particle engine
     * @return {Object}
     */
    get properties() {
        return {
            liveParticles: this.liveParticles,
            ParticleEffects: this.particleEffects,

            _pointer: this.#particleIdx,
            _particleMemories: this.#memories,
            _particlePositions: this.#pPos,
            _particleVelocities: this.#pVel,
            _particleLifespans: this.#pSpan
        }
    }
}