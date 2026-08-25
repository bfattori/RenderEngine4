import $Math from '../../core/Math.js';
import ParticleEffect from './ParticleEffect.js';

export default class SmokeEffect extends ParticleEffect {
  /**
   * Create a `SmokeEffect` to use with the particle system.
   * 
   * @param {Object} opts - Configuration options for the effect
   * @param {String} url - The URL for the class file
   */
  constructor(opts = {}, url = import.meta.url) {
    super({
      count: 10,
      emissionFrequency: 100,
      frequencyVariance: 250,
      spread: 15
    }, url);
    this.merge(opts);
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
