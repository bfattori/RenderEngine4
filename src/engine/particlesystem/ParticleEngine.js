import Constants from '../Constants.js';
import RenderEngineError from '../core/RenderEngineError.js';
import Particle from '../particlesystem/Particle.js';
import { FixedPointMath as FMath } from '../core/Math.js';

export default class ParticleEngine {
    static #instance = null;
    static #useBuilder = true;

    #renderer = null;
    #engine = null;

    #maxParticles = 0;
    #particles = null;
    #pPos = null;
    #pVel = null;
    #pSpan = null;
    
    // pointer to the arrays above
    #particleIdx = 0;
    #liveParticles = 0;
    #particleEffects = [];

    #qN = 0;
    
    /**
     * @private
     * Initialize the particle engine.
     */
    constructor(engine, renderer) {
        if (ParticleEngine.#useBuilder)
            throw new RenderEngineError("Cannot instantiate ParticleEngine directly. Use getInstance() instead.");
        ParticleEngine.#useBuilder = true;
        
        this.#renderer = renderer;
        this.#engine = engine;
        this.#initializeParticles(this.#engine.options.particleEngine.maxParticles);
    }

    /**
     * Get the instance of the ParticleEngine.  This method should be used instead of creating 
     * a new instance directly.
     * @param {Engine} engine - The game engine
     * @param {Renderer} renderer - The renderer the particle engine renders to
     * @returns {ParticleEngine} The engine's `ParticleEngine` instance
     * @static
     */
    static getInstance(engine, renderer) {
        if (ParticleEngine.#instance === null) {
            ParticleEngine.#useBuilder = false;
            ParticleEngine.#instance = new ParticleEngine(engine, renderer);
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
     * Initialize the particle array.  This is called if `maxParticles` is changed.
     * @param {number} count - The maximum number of particles the engine will create
     * @private
     */
    #initializeParticles(count = Constants.MAX_PARTICLES) {
        this.#maxParticles = count;
        let pType = Uint8Array;
        let vType = Uint8Array;
        switch(this.#precision) {
            case Constants.PARTICLE_PRECISION_MEDIUM:
                pType = Uint16Array;
                vType = Uint16Array;
                break;
            case Constants.PARTICLE_PRECISION_HIGH:
                pType = Uint32Array;
                vType = Uint32Array;
                break;
        }
        
        this.#pPos = new pType(count * 2);                  // stores x and y sequentially as FixedPointNumber
        this.#pVel = new vType(count * 2);                  // stores vX and vY sequentially as FixedPointNumber
        this.#pSpan = new Uint16Array(count);               // single value for each lifespan as Number
        this.#particles = new Array(count).fill(null);      // array of particle configuration pointers
    }

    get renderer() {
        return this.#renderer;
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
        const v = (this.#precision === Constants.PARTICLE_PRECISION_HIGH ? 32 : this.#precision === Constants.PARTICLE_PRECISION_MEDIUM ? 16 : 8) * 2;
        const p = (this.#precision === Constants.PARTICLE_PRECISION_HIGH ? 32 : 16) * 2;
        return (v * this.maxParticles) + (p * this.maxParticles) + (this.maxParticles * 16) /* lifespan */ + (this.maxParticles * 864) /* particle config (est) */;
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

    get #precisionBits() {
        return this.#precision === Constants.PARTICLE_PRECISION_HIGH ? Constants.FP_HIGH : this.#precision === Constants.PARTICLE_PRECISION_MEDIUM ? Constants.FP_MEDIUM : Constants.FP_LOW;
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
            this.#pSpan[idx] = particle.lifeSpan;

            // store as fixed point for performance
            this.#pPos[idx * 2] = particle.position[0];
            this.#pPos[(idx * 2) + 1] = particle.position[1];
            this.#pVel[idx * 2] = particle.velocity[0];
            this.#pVel[(idx * 2) + 1] = particle.velocity[1];
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

        this.#renderer.surface.save();       // FIXME: this is specific to Canvas

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
        if (this.liveParticles === 0) {
            this.#renderer.surface.restore();       // FIXME: this is specific to Canvas
            return;
        }


        let lives = 0;
        this.#particles.forEach((particle, idx) => {
            if (particle !== null && this.#pSpan[idx] !== 0) {
                lives++;
                this.#runParticle(particle, idx, time, deltaTime);
            }
        })

        this.#renderer.surface.restore();       // FIXME: this is specific to Canvas
        this.#liveParticles = lives;
    }

    /**
     * Run a particle
     * @param {ParticleConfig} particle - The particle configuration
     * @param {number} idx - The particle index
     */
    #runParticle(particle, idx, time, deltaTime) {
        const bits = this.#precisionBits;
        if (particle.run !== null) {
            // custom update method
            const pUpdate = particle.run(
                time, 
                deltaTime,
                bits,                           // fractional bits in FP numbers 
                [this.#pPos[(idx * 2)],         // X, Y position 
                    this.#pPos[(idx * 2) + 1]],      
                [this.#pVel[(idx * 2)],         // X, Y velocity
                    this.#pVel[(idx * 2) + 1]],      
                this.#pSpan[idx]                // Lifespan remaining
            );

            // update the particle
            this.#pPos[(idx * 2)] = pUpdate.pos[0]; 
            this.#pPos[(idx * 2) + 1] = pUpdate.pos[1];
            this.#pVel[(idx * 2)] = pUpdate.vel[0];   
            this.#pVel[(idx * 2) + 1] = pUpdate.vel[1];
        } else {
            // standard update (add velocity to position)
            this.#pPos[idx * 2] = FMath.add(this.#pPos[(idx * 2)], this.#pVel[(idx * 2)], bits);
            this.#pPos[(idx * 2) + 1] = FMath.add(this.#pPos[(idx * 2) + 1], this.#pVel[(idx * 2) + 1], bits);
        }

        // age the particle
        this.#pSpan[idx] -= deltaTime;

        // free-up space if dead
        if (this.#pSpan[idx] <= 0) {
            if (particle.cleanUp !== null) 
                particle.cleanUp();
            this.#particles[idx] = null;
        }
    }

    /**
     * Render all of the active particles to the renderer
     * @param {number} time - The current world time 
     * @param {number} deltaTime - The time since the last frame
     */
    renderParticles(time, deltaTime) {
        this.#particles.forEach((p, i) => {
            const bits = this.#precisionBits; 
            if (p !== null) {
                if (p.render) 
                    p.render(
                        this.renderer, 
                        [ FMath.toFloat(this.#pPos[i * 2], bits), FMath.toFloat(this.#pPos[(i * 2) + 1], bits) ],
                        this.#pSpan[i],
                        time, deltaTime);
                else
                    this.renderer.render(`POINT ${FMath.toFloat(this.#pPos[i * 2], bits)} ${FMath.toFloat(this.#pPos[(i * 2) + 1], bits)}, ${p.size}`, time, deltaTime);  // this is a bit of a hack since both IL's have the POINT instruction  
            }
        });
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