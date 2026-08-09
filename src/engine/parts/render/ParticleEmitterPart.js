import Engine from '../../core/Engine.js';
import RenderPart from './RenderPart.js';
import ParticleEffect from '../../particlesystem/effects/ParticleEffect.js';
import { Matrix2d } from '../../core/Matrix.js';

export default class ParticleEmitterPart extends RenderPart {
    #active = false;
    #effect = new ParticleEffect();

    /**
     * Create a `ParticleEmitter` to generate particles into the particle engine. Particle emitters use
     * an effect to generate particles into the particle engine. Effects contain the properties for particle generation,
     * including things like frequency of emission, quantity, and variation of each property for more natural behavior. 
     * 
     * @param {String} effectName - The particle effect name that generates particles. See {@link ParticleEffect} for more details.
     * @param {Array<number>} worldPosition - The initial world position where particles emit from
     * @param {boolean} active - Particle emitters default to active
     */
    constructor(priority = Constants.RENDER_PRIORITY, name = 'ParticleEmitter') {
        super(priority, name);
    }

    /**
     * Method to check if the emitter is active.
     * @return {Boolean}
     */
    get active() {
        return this.#active;
    }

    /**
     * Set the emitter to the active state, which emits particles.
     * @params {boolean} state - `true` to make the emitter active
     */
    set active(state) {
        this.#active = state;
    }

    /**
     * Get the effect associated with the emitter. This is the name of the particle effect that generates particles.
     * @return {String} The particle effect associated with the emitter.
     */
    get effect() {
        return this.#effect;
    }

    set effect(particleEffect) {
        this.#effect = particleEffect;
    }

    /**
     * Enable the particle emitter.
     * Each invocation will cause the emitter to create particles until complete.
     */
    emit() {
        this.#active = true;
    }

    /**
     * Emit particles to the particle engine, if the emitter is active, using the effect this emitter is configured with.
     * @param offset {Array<number>} X, Y offset from the particle's position to render at
     * @param time {number} The world time, in milliseconds
     * @param deltaTime {number} The delta between the world time and the last time the world was updated
     *          in milliseconds.
     * @private
     */
    update(time, deltaTime) {
        if (!this.active) return;

        // convert to world coordinates
        const transform = Matrix2d.from(this.renderTransform).multiplySelf(this.world.currentTransform);
        Engine.particleEngine.runEffect([transform.e, transform.f], this.effect, time, deltaTime);
        this.#active = false;
    }
}
