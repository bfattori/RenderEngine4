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
    // mostly straight up
    const v = $Math.vecMulScalar(
        $Math.getDirectionVector([0, 0], $Math.randomRange(-this.spread, this.spread, true)), 
        $Math.getRangeValue(particleType.velocity)
    );
    vel[0] = v[0];
    vel[1] = v[1];
  }
}
