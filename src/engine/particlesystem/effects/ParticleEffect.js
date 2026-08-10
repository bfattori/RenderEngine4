import Constants from '../../Constants.js';
import $Math from '../../core/Math.js';
import TransferrableConfig from '../../core/TransferrableConfig.js';
import BasicParticle from '../types/BasicParticle.js';

export default class ParticleEffect extends TransferrableConfig {
    #lastTime = 0;
    #engine = null;

    /**
     * Create a `ParticleEffect` to use with the particle system. Particle effects
     * generate particles and introduce them into the `ParticleSystem` with an initial
     * position, velocity, and run-time options.
     * 
     * @param {String} name - The name of the effect to make it unique
     * @param {Object} opts - Configuration options for the effect
     * @param {Array<BasicParticle>} types - The type of particles this effect can select from 
     */
    constructor(opts = {}, url = import.meta.url) {
        super({
            /**
             * Set the number of particles emitted per frame
             * @type {number}
             */
            count: 20,
            /**
             * The variance of particle count, from frame-to-frame
             * @type {number}
             */
            countVariance: 0,
            /**
             * The frequency at which particles are emitted. `0` is "always on".
             * Otherwise, the value is a time delay between emissions.
             * @type {number} - milliseconds
             */
            emissionFrequency: 0,
            /**
             * The variance, from frame-to-frame, of emission frequency
             * @type {number} - milliseconds
             */
            frequencyVariance: 0,
            /**
             * The types of particles this effect uses to generate particles.
             * The effect will randomly select from the available particles
             * when it spawns a new particle.
             * @type {Array<BasicParticle>}
             */
            particleTypes: []
        }, url);
        this.merge(opts);
        this.$name = 'particleEffect';
    }

    /**
     * Set the associated particle engine this effect will
     * generate particles into.
     * @param {ParticleEngine} pEngine - The particle engine instance
     */
    set engine(pEngine) {
        this.#engine = pEngine;
    }

    /**
     * Reduce the particle types to their names
     * @returns {Object}
     */
    dehydrate() {
        const props = super.dehydrate();
        props.particleTypes = props.particleTypes.map(e => e.$name);
        return props;
    }

    /**
     * Replace particle types with their configured instances
     * @returns 
     */
    rehydrate() {
        const obj = super.rehydrate();
        obj.particleTypes = obj.particleTypes.map(e => this.#engine.types.get(e));
        return obj;
    }

    /**
     * Add a particle to this effect. When the effect runs, it selects randomly
     * from the particles provided.
     * @param {BasicParticle} type - A particle available to this effect. 
     */
    addParticleType(type) {
        this.particleTypes.push(type);
    }

    /**
     * Run the particle effect, generating particles at the frequency, quantity, and variances specified
     * @param {number} time - The current world time in milliseconds
     * @param {number} deltaTime - The time since the last frame in milliseconds
     * @param {Array<number>} worldPos - [x, y] the world position where to emit particles
     */
    run(worldPos, time, deltaTime) {
        const freq = this.emissionFrequency + $Math.randomRange(-this.frequencyVariance, this.frequencyVariance, true);
        if (time - this.#lastTime > freq) {
            this.#generateParticles(worldPos, time);
            this.#lastTime = time;
        }
    }

    /**
     * Generate particles for the effect and introduce them into the `ParticleSystem`
     * @param worldPos {Array<number>} The world position where the particles are emitted from
     * @param time {Number} The current world time
     * @param deltaTime {Number} The time between the last frame and current time
     */
    #generateParticles(worldPos, time) {
        const count = this.count + $Math.randomRange(-this.countVariance, this.countVariance, true);
        for (let i = 0; i < count; i++) {
            const typeIdx = $Math.randomRange(0, this.particleTypes.length - 1, true);
            const pType = this.particleTypes.at(typeIdx);
            if (pType) {
                let particle = pType.spawn(time, pType.opts);
                // give sub-classes an opportunity to modify 
                // these values or introduce new ones
                particle = this.initParticle(particle, pType.opts);
                this.#engine.spawnParticle(worldPos, time, particle);
            }
        }
    }

    /**
     * Sub-classes can override this method to modify a spawned 
     * particle before it is introduced into the `ParticleSystem`.
     * 
     * @param {Object} particle - Particle instantiation config
     * @param {Object} options - The particle configuration options
     * @return {Object} Particle spawn data
     */
    initParticle(particle, options) {
        return particle;
    }
}
