import Constants from '../../Constants.js';
import $Math from '../../core/Math.js';
import SprayParticle from '../types/BasicParticle.js';
import ParticleEffect from './ParticleEffect.js';

/**
 * @class FountainEffect
 * @classdesc The FountainEffect class is a specialized particle effect that generates particles in a fountain-like pattern. It extends 
 * from the ParticleEffect class and overrides the initParticle method to apply a random velocity to each spawned particle based 
 * on a specified velocity range. The effect can be configured with various options, including the number of particles to spawn, 
 * the spread of the fountain, and the maximum velocity of the particles.
 */
export default class FountainEffect extends ParticleEffect {
    /**
     * Create a `FountainEffect` to use with the particle system.
     * 
     * @param {Object} opts - Configuration options for the effect
     * @param {String} url - The URL for the class file
     */
    constructor(overrides = {}, url = import.meta.url) {
        super({
            /**
             * The angle of the fountain effect, in degrees. The angle is measured from the center of the fountain, with 0 degrees being straight up.
             */
            angle: 0,
            /**
             * The spread, or width, of the fountain effect, in degrees.
             * @type {number}
             */
            spread: 30,
            /**
             * Variance is measured in degrees toward the center of the spread. More than half the
             * spread will be ignored, and the variance will be capped at half the spread.
             * @type {number}
             */
            spreadVariance: 0
        }, url);
        this.merge(overrides);
        this.$name = 'fountainEffect';
    }

    /**
     * Modify a spawned particle, calculating the spawn angle from
     * the velocity scalar value.
     * 
     * @param {Object} particle - Particle instantiation config
     * @param {Object} options - The particle configuration options
     * @returns {Object} Particle spawn data
     */
    initParticle(particle, options) {
        const variance = $Math.randomRange(0, Math.round(Math.min(this.spread / 2, this.spreadVariance)), true);
        const lowAngle = this.angle - (this.spread - variance);
        const highAngle = this.angle + (this.spread - variance);

        particle.vel = $Math.vecMulScalar(
            $Math.getDirectionVector([0,0], $Math.randomRange(lowAngle, highAngle, true)), 
            $Math.getRangeValue(options.velocity)
        );
        return particle;
    }
}
