import $Math from '../../core/Math.js';
import ParticleEffect from './ParticleEffect.js';
import Particle from '../types/Particle.js';

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
     * @param {Particle} particle - The particle config
     * @param {Spark} memSegment - Initialized particle memory
     */
    initParticle(particle, memSegment) {
        const vel = $Math.vecMulScalar(
            $Math.getDirectionVector([0, 0], $Math.randomRangeInt(0, 359)), 
            $Math.getRangeValue(particle.velocity)
        );
        memSegment.setVecF32(Particle.OFFSETS.VELOCITY, vel);
    }
}
