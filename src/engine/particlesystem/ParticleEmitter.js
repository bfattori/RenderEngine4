import Engine from '../core/Engine.js';

export default class ParticleEmitter {
    #active = true;
    #emitFn = null;
    #interval = null;
    #nextEmit = 0;

    /**
     * Create a `ParticleEmitter` to generate particles into the particle engine.
     * 
     * @param {Function} emitFn - The function to generate the particles
     * @param {number} interval - The interval (in milliseconds) to emit particles
     * @param {boolean} active - The initial state of the emitter (default: true)
     */
    constructor(emitFn, interval, active = true) {
        this.base("ParticleEmitter");
        this.#emitFn = emitFn;
        this.#interval = interval;
        this.#active = active;
        this.#nextEmit = 0;
    }

    /**
     * Destroy the emitter
     */
    destroy() {
        this.#emitFn = null;
    }

    /**
     * Set the active state of the particle emitter
     * @param state {Boolean} <code>true</code> to enable emission of particles, <code>false</code> to
     *    disable emission.
     */
    set active(state) {
        this.#active = state;
    }

    /**
     * Method to check if the emitter is active.
     * @return {Boolean}
     */
    get isActive() {
        return this.#active;
    }

    /**
     * Set the interval at which particles are emitted.
     * @param interval {Number} The number of milliseconds between emissions
     */
    set interval(interval) {
        this.#interval = interval;
    }

    /**
     * Return the interval at which particles are emitted.
     * @return {Number}
     */
    get interval() {
        return this.#interval;
    }

    /**
     * Emit a particle to the particle engine, if the emitter is active.
     * @param offset {Array<number>} X, Y offset from the particle's position to render at
     * @param time {number} The world time, in milliseconds
     * @param deltaTime {number} The delta between the world time and the last time the world was updated
     *          in milliseconds.
     * @private
     */
    emit(offset, time, deltaTime) {
        if (this.active && time > this.#nextEmit) {
            this.#nextEmit = time + this.interval;
            var particles = this.#emitFn.call(this, offset, time, deltaTime);
            if (particles.length > 0)
                Engine.particleEngine.addParticles(particles);
        }
    }
}