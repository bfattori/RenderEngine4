import $Math from '../../core/Math.js';
import ParticleEffect from './ParticleEffect.js';

/**
 * @class SmokeEffect
 * @classdesc The SmokeEffect class is a specialized particle effect that generates particles in a smoke-like pattern. It extends 
 * from the ParticleEffect class and overrides the initParticle method to apply a random velocity to each spawned particle based 
 * on a specified velocity range. The effect can be configured with various options, including the number of particles to spawn, 
 * their initial position, and their velocity range.
 * 
 * @extends ParticleEffect
 */
export default class SmokeEffect extends ParticleEffect {
  /**
   * Create a `SmokeEffect` to use with the particle system.
   * 
   * @param {Object} overrides - Configuration options for the effect
   * @param {String} url - The URL for the class file
   */
  constructor(overrides = {}, url = import.meta.url) {
    super({
      count: 10,
      emissionFrequency: 100,
      frequencyVariance: 250,
      spread: 15
    }, url);
    this.merge(overrides);
    this.$name = 'smokeEffect';
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
    // mostly straight up
    particle.vel = $Math.vecMulScalar(
        $Math.getDirectionVector([0, 0], $Math.randomRange(-this.spread, this.spread, true)), 
        $Math.getRangeValue(options.velocity)
    );
    return particle;
  }
}
