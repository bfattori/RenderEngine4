import Constants from '../Constants.js';
import $Math from '../core/Math.js';
import Particle from './Particle.js';

export default class ParticleEffect {
    #particleCount = 20;
    #particleCountVariance = 0;
    #frequency = 0;
    #frequencyVariance = 0;
    #lastTime = 0;
    #types = [];
    #engine = null;

    constructor(types) {
        this.#types = types;
    }

    static getInstance(types) {
        return new ParticleEffect(types);
    }

    getTransferrable(name) {
        const t = {type:'ParticleEffect', name: name, props:{}};
        for (const prop of ['quantity', 'quantityVariance', 'frequency', 'frequencyVariance']) {
            t.props[prop] = this[prop];
        }
        t.types = this.#types;
        return t;
    }

    set engine(pEngine) {
        this.#engine = pEngine;
    }

    /**
     * Set the number of particles emitted per frame
     * @param {number} particleCount - The number of particles to emit per frame
     * @returns {*}
     */
    set quantity(particleCount) {
        this.#particleCount = particleCount;
        return this;
    }

    /**
     * The number of variables to emit per frame
     * @returns {number}
     */
    get quantity() {
        return this.#particleCount;
    }

    /**
     * Set the variance amount for the count emitted at each frame
     * @param {number} variance - The variance between emissions (+/-) this amount
     */
    set quantityVariance(variance) {
        this.#particleCountVariance = variance;
    }

    /**
     * Get the variance in the number of particles emitted per frame
     * @returns {number}
     */
    get quantityVariance() {
        return this.#particleCountVariance;
    }

    /**
     * Set the frequency at which particles will be emitted
     * @param emitFrequency
     */
    set frequency(emitFrequency) {
        this.#frequency = emitFrequency;
    }

    /**
     * Get the frequency at which particles are emitted
     * @returns {number} The frequency in milliseconds
     */
    get frequency() {
        return this.#frequency;
    }

    /**
     * Set the emission frequence variance
     * @param {number} variance - The amount to vary the frequency of emission (+/-) each frame
     */
    set frequencyVariance(variance) {
        this.#frequencyVariance = variance;
    }

    /**
     * Get the variance in the frequency at which particles are emitted
     * @return {number} Frequency variance in milliseconds (+/-) each frame
     */
    get frequencyVariance() {
        return this.#frequencyVariance;
    }

    set particleTypes(types) {
        this.#types = types;
    }

    addParticleType(type) {
        this.#types.push(type);
    }

    /**
     * Run the particle effect, generating particles at the frequency, quantity, and variances specified
     * @param {number} time - The current world time in milliseconds
     * @param {number} deltaTime - The time since the last frame in milliseconds
     * @param {Array<number>} worldPos - [x, y] the world position where to emit particles
     */
    run(worldPos, time, deltaTime) {
        const freq = this.#frequency + $Math.randomRange(-this.#frequencyVariance, this.#frequencyVariance, true);
        if (time - this.#lastTime > freq) {
            this.generateParticles(worldPos, time, this.#types);
            this.#lastTime = time;
        }
    }

    /**
     * Generate particles for the effect.
     * @param worldPos {Array<number>} The world position where the particles are emitted from
     * @param time {Number} The current world time
     * @param deltaTime {Number} The time between the last world frame and current time
     */
    generateParticles(worldPos, time, types) {
        const count = this.#particleCount + $Math.randomRange(-this.#particleCountVariance, this.#particleCountVariance, true);
        for (let i = 0; i < count; i++) {
            const typeIdx = $Math.randomRange(0, types.length - 1, true);
            const type = types.at(typeIdx);
            this.#engine.spawnParticle(worldPos, time, type);
        }
    }
}
