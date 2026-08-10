import Constants from '../../Constants.js';
import $Math from '../../core/Math.js';
import ParticleEffect from './ParticleEffect.js';
import BasicParticle from '../types/BasicParticle.js';

export default class BurstEffect extends ParticleEffect {
    /**
     * Create a `BurstEffect` to use with the particle system.
     * 
     * @param {Object} opts - Configuration options for the effect
     * @param {String} url - The URL for the class file
     */
    constructor(opts = {}, url = import.meta.url) {
        super(opts, url);
        this.merge(opts);
        this.$name = 'burstEffect';
    }

    /**
     * Sub-classes can override this method to modify a spawned 
     * particle before it is introduced into the `ParticleSystem`.
     * This instance multiplies a spawn angle, between 0 and 359, 
     * with the velocity scalar value.
     * 
     * @param {Object} particle - Particle instantiation config
     * @param {Object} options - The particle configuration options
     * @return {Object} Particle spawn data
     */
    initParticle(particle, options) {
        particle.vel = $Math.vecMulScalar(
            $Math.getDirectionVector([0, 0], $Math.randomRange(0, 359, true)), 
            $Math.getRangeValue(options.velocity)
        );
        return particle;
    }
}
