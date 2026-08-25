import ParticleAffector from './ParticleAffector.js';
import Enum from '../../core/Enum.js';
import $Math from '../../core/Math.js';

/**
 * A `ParticleRepulsor` establishes an area of influence on `PhysicalParticles` over a particular falloff. The repulsion is inversely proportional to the distance from the 
 * center of the repulsor, with a maximum value defined by `radius`.
 * 
 * @param {Object} opts - Configuration options for the particle repulsor
 * @param {number} maxDistance - The maximum distance at which particles are affected by this repulsor
 * @param {number} falloff - The falloff rate of the repulsion, where 0 is no repulsion and 1 is full repulsion
 * @param {String} url - The module's Url

 */
export default class ParticleRepulsor extends ParticleAffector {
  static FALLOFF_TYPE = new Enum({
    LINEAR: 'linear',
    SQUARED: 'squared',
    ATTENUATE: 'log',
    CUSTOM: 'custom'
  });
  
  constructor(opts = {}, url = import.meta.url) {
    super({
      type: ParticleAffector.TYPE.REPULSOR,
      /**
       * The affected radius for the repulsor.
       * @type {number} The distance from the center of the repulsor
       */
      radius: 50,
      /**
       * The type of falloff applied
       * @type {ParticleRepulsor#FALLOFF_TYPE} 
       */
      falloffType: ParticleRepulsor.FALLOFF_TYPE.LINEAR,
      /**
       * The rolloff factor for attenuated falloff.
       * @type {number} The rolloff factor
       */
      rolloffFactor: 0.0
    }, url);
    this.merge(opts);
  }

  /**
   * Impact a particle's position and velocity based on the
   * affector's properties. Return an object with updated position
   * and velocity for the particle.
   * @param {Array<number>} pos - The particle's poisition
   * @param {Array<number>} vel - The particle's velocity vector
   * @param {number} time - The current world time
   * @param {number} deltaTime - The time since the last frame 
   * @returns {Object|null} An object containing the particle's updated `pos`(isition) and `vel`(ocity). 
   * Return `null` for no impact on the particle.
   */
  affect(position, velocity, time, deltaTime) {
    // early out
    const dist = $Math.distance(position, this.pos);

    if (dist < this.radius && dist > 0) {
      const normX = (position[0] - this.pos[0]) / dist;
      const normY = (position[1] - this.pos[1]) / dist;

      const fallOff = this.#getFallOff(this.pos[0], this.pos[1], dist);
      const impulseVec = $Math.vecMulScalar($Math.vecMulScalar([normX, normY], fallOff), this.impulse);

      // nudge away from the repulsor
      const v = $Math.vecAdd(velocity, impulseVec);
      velocity[0] = v[0] * this.friction;
      velocity[1] = v[1] * this.friction;
    }
  }

  /**
   * Calculate the repulsor impulse falloff given the type
   * of falloff configured.
   * 
   * @param {number} x - The x position of the particle
   * @param {number} y - The x position of the particle
   * @param {number} dist - The distance to the affector
   * @returns 
   */
  #getFallOff(x, y, dist) {
    switch (+this.falloffType) {
      case +ParticleRepulsor.FALLOFF_TYPE.LINEAR:
        return $Math.clamp(1.0 - (dist / this.radius), 0.0, 1.0);  
      case +ParticleRepulsor.FALLOFF_TYPE.SQUARED:
        return $Math.clamp(1.0 / (dist * dist), 0.0, 1.0);
      case +ParticleRepulsor.FALLOFF_TYPE.ATTENUATE:
        return 1.0 / ((1.0 + this.rolloffFactor) * (dist - this.radius));
      case +ParticleRepulsor.FALLOFF_TYPE.CUSTOM:
        return this.customFalloff(x, y, dist);
    }
  }

  customFalloff(x, y, dist) {
    return null;
  }
}