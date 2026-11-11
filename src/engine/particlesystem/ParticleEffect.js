import $Math from '../core/lang/Math.js';
import TransferrableConfig from '../core/config/TransferrableConfig.js';
import Particle from './Particle.js';

/**
 * @class ParticleEffect
 * @classdesc The ParticleEffect class is responsible for generating particles and introducing them into the ParticleSystem. It defines the 
 * properties of the effect such as frequency, quantity, and types of particles to spawn, and provides a method for sub-classes to modify 
 * the properties of spawned particles before they are added to the system. The effect can be configured with various options, including 
 * the number of particles to spawn, their types, and their properties such as size, color, and lifetime.
 * @extends TransferrableConfig
 */
export default class ParticleEffect extends TransferrableConfig {
    #lastTime = 0;
    #engine = null;
    #reset = false;
    #opaqueId = null;

    /**
     * Create a `ParticleEffect` to use with the particle system. Particle effects
     * generate particles and introduce them into the `ParticleSystem` with an initial
     * position, velocity, and run-time options.
     * 
     * @param {Object} opts - Configuration options for the effect
     * @param {String} url - The URL for the class file
     */
    constructor(overrides = {}, url = import.meta.url) {
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
             * @type {number|Array<number>} - milliseconds
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
             * @type {Array<Particle>}
             */
            particleTypes: [],

            /**
             * The radius of the emission circle for the emitter.
             * @type {number} The radius of the emission circle
             */
            emissionRadius: 0,

            /**
             * The width of the emission rectangle for the emitter. Ignored if `emissionRadius` is != 0
             * @type {number} The width of the emission rectangle
             */
            emissionWidth: 0,

            /**
             * The height of the emission rectangle for the emitter. Ignored if `emissionRadius` is != 0
             * @type {number} The height of the emission rectangle
             */
            emissionHeight: 0
        }, url);
        this.merge(overrides);
        this.name = 'particleEffect';
    }

    set name(name) {
        this.$name = name;
    }

    get name() {
        return this.$name;
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
     * Get the particle engine the effect is associated with.
     * @returns {ParticleEngine} The particle engine 
     */
    get engine() {
        return this.#engine;
    }

    get opaqueId() {
        return this.#opaqueId;
    }

    set opaqueId(id) {
        this.#opaqueId = id;
    }

    /**
     * Reduce the particle types to their names
     * @returns {Object}
     */
    dehydrate() {
        const props = super.dehydrate();
        props.$opaqueId = this.opaqueId;
        props.particleTypes = props.particleTypes.map(e => e.$name);
        return props;
    }

    /**
     * Replace particle types with their configured instances
     * @returns 
     */
    async rehydrate(props) {
        await new Promise((resolve) => {
            const resolveParticleTypes = () => {
                const success = props.particleTypes.every(e => this.engine.typesByName.get(e));
                if (success)
                    return resolve(true);
                else
                    setTimeout(resolveParticleTypes, 250);
            };
            resolveParticleTypes();
        });

        this.opaqueId = props.$opaqueId;
        props.particleTypes = props.particleTypes.map(e => this.engine.typesByName.get(e));
        await super.rehydrate(props);
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
     * Run the particle effect, generating particles at the frequency, quantity, and variances specified.
     * A frequency of `0` is equivalent to running once. Call `reset()` to reuse the effect.
     * 
     * @param {Array<number>} worldPos - [x, y] the world position where to emit particles
     * @param {number} time - The current world time in milliseconds
     */
    run(worldPos, time) {
        const freq = this.emissionFrequency + $Math.randomRange(-this.frequencyVariance, this.frequencyVariance, true);
        if (freq === 0 || time - this.#lastTime > freq) {
            this.#generateParticles(worldPos, time);
            this.#lastTime = time;
        }

        if (this.#reset) {
            // reset after run
            this.#lastTime = 0;
            this.#reset = false;
        }
    }

    get isReset() {
        return this.#reset;
    }

    /**
     * Reset the effect for reuse.
     */
    reset() {
        this.#reset = true;
    }

    /**
     * Generate particles for the effect and introduce them into the `ParticleSystem`
     * @param worldPos {Array<number>} The world position where the particles are emitted from
     * @param time {Number} The current world time
     */
    #generateParticles(worldPos, time) {
        if (this.generate(worldPos, time)) {
            const count = this.count + $Math.randomRange(-this.countVariance, this.countVariance, true);
            for (let i = 0; i < count; i++) {
                const typeIdx = $Math.randomRangeInt(0, this.particleTypes.length - 1);
                const pType = this.particleTypes.at(typeIdx);
                if (pType) {
                    // the world position of the emitter's host
                    let emitPosition = $Math.newVecF32(worldPos[0], worldPos[1]);

                    // calculate emission position
                    if (this.emissionRadius > 0) {
                        // radius around the point
                        let dir = $Math.getDirectionVector([0,0], $Math.randomRangeInt(0, 360));
                        emitPosition = $Math.vecMulScalar(dir, this.emissionRadius);
                    } else if (this.emissionWidth > 0 || this.emissionHeight > 0) {
                        // rectangle around the point
                        const halfWidth = this.emissionWidth * 0.5;
                        const halfHeight = this.emissionHeight * 0.5;
                        emitPosition = $Math.randomPoint(emitPosition[0] - halfWidth, emitPosition[1] - halfHeight, this.emissionWidth, this.emissionHeight);
                    }

                    const memSegment = this.engine.spawnParticle(emitPosition, time, pType);
                    if (memSegment !== null) {
                        this.initParticle(pType, memSegment);
                    }
                }
            }
        }
    }

    /**
     * Sub-classes can override this method to implement custom logic to control generation.
     * @param {Array<number>} worldPos - [x, y] the world position where to emit particles
     * @param {number} time - The current world time in milliseconds
     * @returns {boolean} `true` if the effect should generate particles, `false` otherwise. 
     */
    generate(worldPos, time) {
        return true;
    }

    /**
     * Sub-classes should override this method to modify the spawned 
     * particle before it is introduced into the `ParticleSystem`.
     * 
     * @param {Particle} particle - The particle config
     * @param {Spark} memSegment - Initialized particle memory
     */
    initParticle(particle, memSegment) {        
    }
}
