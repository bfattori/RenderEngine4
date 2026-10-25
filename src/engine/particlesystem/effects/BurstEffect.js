import Constants from '../../Constants.js';
import $Math from '../../core/Math.js';
import ParticleEffect from './ParticleEffect.js';
import BasicParticle from '../types/BasicParticle.js';

/**
 * @class BurstEffect
 * @classdesc The BurstEffect class is a specialized particle effect that generates particles in a burst pattern. It extends 
 * from the ParticleEffect class and overrides the initParticle method to apply a random velocity to each spawned particle based 
 * on a specified velocity range. The effect can be configured with various options, including the number of particles to spawn, 
 * their initial position, and their velocity range.
 * 
 * @extends ParticleEffect
 */
export default class BurstEffect extends ParticleEffect {
    /**
     * Create a `BurstEffect` to use with the particle system.
     * 
     * @param {Object} opts - Configuration options for the effect
     * @param {String} url - The URL for the class file
     */
    constructor(overrides = {}, url = import.meta.url) {
        super({}, url);
        this.merge(overrides);
        this.$name = 'burstEffect';
    }

    /**
     * Sub-classes should override this method to modify the spawned 
     * particle before it is introduced into the `ParticleSystem`.
     * 
     * @param {Spark} header - The particle header
     * @param {Spark} heap - Initialized particle memory
     * @param {BasicParticle} particleType - Particle configuration
     * @param {Float32Array} pos - The position of the particle (x, y) in world coordinates
     * @param {Float32Array} vel - The velocity of the particle
     */
    initParticle(header, heap, particleType, pos, vel) {        
        const v = $Math.vecMulScalar(
            $Math.getDirectionVector([0, 0], $Math.randomRangeInt(0, 359)), 
            $Math.getRangeValue(particleType.velocity)
        );
        vel[0] = v[0];
        vel[1] = v[1];
    }
}
