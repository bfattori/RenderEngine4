import Util from '../../core/Util.js';

export default class ParticleEffect {
    #particleCount = 10;
    #particleCountVariance = 0;
    #particleLifetime = 500;
    #particleLifetimeVariance = 0;
    #origin = [0,0];
    #particleClass = null;
    #ttl = 0;
    #run = false;
    #emitFrequency = 0;
    #emitFrequencyVariance = 0;
    #lastTime = 0;
    #velocity = 0.2;
    #velocityVariance = 0;

    constructor(origin) {
        this.#origin = origin;
    }

    destroy() {
        this.#particleClass = null;
        this.#origin = null;
    }

    get isRun() {
        return this.#run;
    }

    /**
     * Get the origin of the effect
     * @returns {Array<number>} [x, y]
     */
    get origin() {
        return this.#origin;
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
     * The lifespan of the particles emitted
     * @returns {number} Lifespan in milliseconds
     */
    get lifespan() {
        return this.#particleLifetime;
    }

    /**
     * Set the lifespan of the effect
     * @param {number} ttl - The lifespan in milliseconds
     */
    set lifespan(ttl) {
        this.#particleLifetime = ttl;
    }

    /**
     * The lifespan variance for emitted particle
     * @returns {number} The lifespan variance in milliseconds (+/-) this amount
     */
    get lifespanVariance() {
        return this.#particleLifetimeVariance;
    }

    /**
     * Set the variance in the lifespan for particles emitted
     * @param {number} ttl - The lifespan variance in milliseconds (+/-) this amount
     */
    set lifespanVarince(ttl) {
        this.#particleLifetimeVariance = ttl;
    }

    /**
     * Set the frequency at which particles will be emitted
     * @param emitFrequency
     */
    set frequency(emitFrequency) {
        this.#emitFrequency = emitFrequency;
    }

    /**
     * Get the frequency at which particles are emitted
     * @returns {number} The frequency in milliseconds
     */
    get frequency() {
        return this.#emitFrequency;
    }

    /**
     * Set the emission frequence variance
     * @param {number} variance - The amount to vary the frequency of emission (+/-) each frame
     */
    set frequencyVariance(variance) {
        this.#frequenceVariance = variance;
    }

    /**
     * Get the variance in the frequency at which particles are emitted
     * @return {number} Frequency variance in milliseconds (+/-) each frame
     */
    get frequencyVariance() {
        return this.#frequencyVariance;
    }

    /**
     * Set the particle class which is emitted from the effect
     * @param {Particle} particleClass - the particle class to emit
     */
    set particle(particleClass) {
        this.#particleClass = particleClass;
        return this;
    }

    get particle() {
        return this.#particleClass;
    }

    /**
     * Set the scalar velocity at which particles move after emission.
     * @param {number} scalar - Velocity step per millisecond
     */
    set velocity(velocity) {
        this.#velocity = velocity;
    }

    /**
     * Get the scalar velocity at which particles move
     */
    get velocity() {
        return this.#velocity;
    }

    /**
     * Set the scalar velocity variance at which particles move.
     * @param {number} variance - Velocity step per millisecond (+/-) each frame
     */
    set velocityVariance(variance) {
        this.#velocityVariance = variance;
    }

    /**
     * Get the scalar velocity variance for particle emission
     * @return {number}
     */
    get velocityVariance() {
        return this.#velocityVariance;
    }

    /**
     * Run the particle effect.
     * @param time
     * @param deltaTime
     * @private
     */
    run(time, deltaTime) {
        const count = this.#particleCount + Util.randomRange(-this.#particleCountVariance, this.#particleCountVariance, true);
        const life = this.#particleLifetime + Util.randomRange(-this.#particleLifetimeVariance, this.#particleLifetimeVariance, true);
        const vel = this.#velocity + Util.randomRange(-this.#velocityVariance, this.#velocityVariance, true);
        const freq = this.#emitFrequency + Util.randomRange(-this.#emitFrequencyVariance, this.#emitFrequencyVariance, true);

        if (!this.isRun || (this.isRun && time - this.#lastTime > freq)) {
            var options = {};
            this.generateParticles(count, life, vel, time, deltaTime);
            this.#lastTime = time;
        }

        Engine.particleEngine.addParticles(particles);
        this.#run = true;
    }

    /**
     * A method to give an effect the ability to modify a particle's options for each particle generated.
     * @param {ParticleConfig} particle - The particle state configuration
     * @param {number} time - The current world time
     * @param {number} deltaTime - The number of milliseconds since the last rendered frame
     */
    modifyParticle(particle, time, deltaTime) {
        const variance = this.velocity + Util.randomRange(0, this.velocityVariance);
        particle.velocity = variance;
    }

    /**
     * Generate particles for the effect.
     * @param count {number} The number of particles to create
     * @param life {number} The lifespan of the particles
     * @param velocity {number} A scalar velocity
     * @param time {Number} The current world time
     * @param deltaTime {Number} The time between the last world frame and current time
     */
    generateParticles(count, life, velocity, time, deltaTime) {
        particles.forEach((particle) => {
            this.modifyParticle(particle.config, time, deltaTime);
            this.#particles.push(new this.#particleClass(this.origin, [velocity, velocity], {
                position: this.origin,
                velocity: [velocity, velocity],
                span: life
            }));  
        })
    }
}