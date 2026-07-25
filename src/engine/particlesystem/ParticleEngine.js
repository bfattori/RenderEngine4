import Constants from '../Constants.js';
import RenderEngineError from '../core/RenderEngineError.js';
import Particle from '../particlesystem/Particle.js';

export default class ParticleEngine {
    static #instance = null;
    static #useBuilder = true;

    #renderer = null;
    #gameEngine = null;

    #maxParticles = 0;
    #particles = null;
    #pPos = null;
    #pVel = null;
    #pSpan = null;
    
    // pointer to the arrays above
    #particleIdx = 0;
    #liveParticles = 0;
    #particleEffects = [];
    
    /**
     * @private
     * Initialize the particle engine.
     */
    constructor(engine, renderer) {
        if (ParticleEngine.#useBuilder)
            throw new RenderEngineError("Cannot instantiate ParticleEngine directly. Use getInstance() instead.");
        ParticleEngine.#useBuilder = true;
        this.#renderer = renderer;
        this.#gameEngine = engine;
        this.#initializeParticles(this.#engine.options.particleEngine.maxParticles);
    }

    /**
     * Get the instance of the ParticleEngine.  This method should be used instead of creating 
     * a new instance directly.
     * @param {Renderer} renderer - The renderer the particle engine renders to
     * @returns {ParticleEngine} The engine's `ParticleEngine` instance
     * @static
     */
    static getInstance(renderer) {
        if (ParticleEngine.#instance === null) {
            ParticleEngine.#useBuilder = false;
            ParticleEngine.#instance = new ParticleEngine(renderer);
        }

        return ParticleEngine.#instance;
    }

    /**
     * Precision indicates if we're using 8-bit, or 16-bit values for the particle 
     * positions and velocities.
     * @returns {String} {@link Constants.PARTICLE_PRECISION_LOW}, {@link Constants.PARTICLE_PRECISION_MEDIUM}, or 
     *                   {@link Constants.PARTICLE_PRECISION_HIGH}
     */
    get #precision() {
        return this.#engine.options.particleEngine.precision;
    }

    /**
     * Returns `true` if the buffer is circular
     * @returns {boolean} `true` if the buffer is circular, `false` otherwise.
     */
    get #isCircular() {
        return this.#engine.options.particleEngine.circularBuffer;
    }

    /**
     * Returns the Engine instance
     * @return {Engine}
     * @private
     */
    get #engine() {
        return this.#gameEngine;
    }

    /**
     * Initialize the particle array.  This is called if `maxParticles` is changed.
     * @param {number} count - The maximum number of particles the engine will create
     * @private
     */
    #initializeParticles(count = Constants.MAX_PARTICLES) {
        this.#maxParticles = count;
        let type = Int16Array;
        switch(this.#precision) {
            case Constants.PARTICLE_PRECISION_LOW:
                type = Int8Array;
            case Constants.PARTICLE_PRECISION_MEDIUM:
                this.#pPos = new Int16Array(count);
                this.#pVel = new type(count);
                break;
            case Constants.PARTICLE_PRECISION_HIGH:
                this.#pVel = new Int32Array(count);
                this.#pPos = new Int32Array(count);
                break;
        }
        
        // particle lifespans
        this.#pSpan = new Uint16Array(count);
        this.#particles = new Array(count).fill(null);
    }

    /**
     * Get the maximum number of particles the engine can produce.
     * @returns {number} The maximum particle count
     */
    get maxParticles() {
        return this.#maxParticles;
    }

    /**
     * Set the maxmimum number of particles the engine can produce.
     * @param {number} max - The maximum particle count
     */
    set maxParticles(max) {
        this.#initializeParticles(max);
    }

    /**
     * Returns an estimate of the memory used by the particle engine
     * @returns {number} The maximum number of particles multiplied by the precision setting.
     */
    get memoryEstimate() {
        return this.#maxParticles * this.#precision === Constants.PARTICLE_PRECISION_HIGH ? 16 : 8;
    }

    /**
     * Get the next available pointer into the buffer. A circular buffer will wrap aroung
     * and being overwriting existing particles. A non-circular buffer will look for the first
     * available opening in the buffer. If none is available, -1 is returned.
     * @returns {number} The next available index in the buffer, or -1 if no free spot is available
     * @private
     */
    get #nextIndex() {
        this.#particleIdx++;
        if (this.#isCircular && this.#particleIdx === this.maxParticles)
            this.#particleIdx = 0;    // wrap
        else {
            // find first free index
            this.#particleIdx = this.#particles.findIndex((e) => e === null);
        }

        return this.#particleIdx;
    }

    /**
     * Get the list of particle effects that are currently active
     * @return {Array<ParticleEffect>} List of active particle effects
     */
    get particleEffects() {
        return this.#particleEffects;
    }

    /**
     * The number of particles that have not reached their lifespan
     * @return {number} Number of live particles
     */
    get liveParticles() {
        return this.#liveParticles;
    }

    /**
     * Add a set of particles at once
     * @param {Array<Particle>} particles The set of particles
     */
    addParticles(particles) {
        for (const particle of particles) {
            this.addParticle(particle);
        }
    }

    /**
     * Add a single particle to the engine
     * @param particle {Particle} A particle
     */
    addParticle(particle) {
        if (R.Engine.options.disableParticleEngine) return;
    
        const idx = this.#nextIndex;
        if (idx !== -1 && particle.lifeSpan !== 0) {
            // add the particle config and relative values
            this.#particles[idx] = particle.config;
            this.#pPos[idx] = particle.position;
            this.#pVel[idx] = particle.velocity;
            this.#pSpan[idx] = particle.lifeSpan;
        }
    }

    /**
     * Add a particle effect
     * @param particleEffect
     * @return {ParticleEffect} The instance of the effect
     */
    addEffect(particleEffect) {
        this.particleEffects.push(particleEffect);
        return particleEffect;
    }

    /**
     * Update the particles within the render context, and for the specified time.
     *
     * @param time {Number} The global time within the engine.
     * @param deltaTime {Number} The delta between the world time and the last time the world was updated
     *          in milliseconds.
     */
    update(time, deltaTime) {
        if (Engine.options.particleEngine.disabled) return;

        // Run all queued effects
        const dead = [];
        for (const effect of this.particleEffects) {
            if (!effect.isRun || effect.lifespan(deltaTime) > 0) {
                effect.run(this, time, deltaTime);
            } else {
                // Dead effect - these are cleaned up later
                dead.push(effect);
            }
        }

        // clean up dead effects
        dead.forEach((e, i) => this.particleEffects.splice(i, 1));
        dead = null;

        // If there are no live particles, don't do anything
        if (this.liveParticles === 0) return;

        this.#renderer.surface.save();

        let lives = 0;
        this.#particles.forEach((particle, idx) => {
            if (particle !== null && this.#pSpan[idx] !== 0) {
                lives++;
                this.#runParticle(particle, idx, time, deltaTime);
            }
        })

        this.#renderer.surface.restore();
        this.#liveParticles = lives;
    }

    /**
     * Run a particle
     * @param {ParticleConfig} particle - The particle configuration
     * @param {number} idx - The particle index
     */
    #runParticle(particle, idx, time, deltaTime) {
        if (particle.run !== null) {
            const pUpdate = particle.run(
                time, 
                deltaTime, 
                this.#pPos[(idx * 2)],          // X 
                this.#pPos[(idx * 2) + 1],      // Y
                this.#pVel[(idx * 2)],          // Velocity X
                this.#pVel[(idx * 2) + 1],      // Velocity Y
                this.#pSpan[idx]                // Lifespan remaining
            );

            // update the particle
            this.#pPos[(idx * 2)] = pUpdate.pos[0]; 
            this.#pPos[(idx * 2) + 1] = pUpdate.pos[1];
            this.#pVel[(idx * 2)] = pUpdate.vel[0];   
            this.#pVel[(idx * 2) + 1] = pUpdate.vel[1];
        } else {
            // standard update (add velocity to position and age)
            this.#pPos[(idx * 2)] += this.#pVel[(idx * 2)];
            this.#pPos[(idx * 2) + 1] += this.#pVel[(idx * 2) + 1];
        }

        // age the particle
        this.#pSpan[idx] -= deltaTime;

        // remove if dead
        if (this.#pSpan[idx] <= 0) {
            if (particle.cleanUp !== null) 
                particle.cleanUp();
            this.#particles[idx] = null;
        }
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
            _particles: this.#particles,
            _particlePositions: this.#pPos,
            _particleVelocities: this.#pVel,
            _particleLifespans: this.#pSpan
        }
    }
}