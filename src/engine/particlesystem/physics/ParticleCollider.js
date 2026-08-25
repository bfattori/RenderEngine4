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
export default class ParticleCollider extends ParticleAffector {
  static TYPE = new Enum({
    KILL: 'kill',
    STICK: 'stick',
    REFLECT: 'reflect',
    CUSTOM: 'custom'
  });
  
  constructor(opts = {}, url = import.meta.url) {
    super({
      type: ParticleAffector.TYPE.REPULSOR,
      
      /**
       * The collision type for the surface
       * @type {ParticleCollider#TYPE} The collision type
       */
      collisionType: ParticleCollider.TYPE.REFLECT,
      /**
       * The bounciness of the surface if the type is `REFLECT`
       * @type {number} A number between 0.0 and 1.0, with 0.0 being no bounce and 1.0 being full bounce. 
       */
      surfaceRestitution: 0.0,
      /**
       * The stickyness of the surface if the type is `STICK`
       * @type {number} A number between 0.0 and 1.0, with 0.0 being not sticky, and 1.0 being totally sticky.
       */
      surfaceFriction: 0.0
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
    if (!$Math.pointInCircle(position, this.pos, this.radius)) return null;
    
    const dist = $Math.dist(position[0], position[1], this.pos[0], this.pos[1]);
    const fallOff = this.#getFallOff(position[0], position[1], dist);

    const pToA = [position[0] - this.pos[0], position[1] - this.pos[1]];
    const pToAUnit = [pToA[0]/dist, pToA[1]/dist];

    const aToP = [this.pos[0] - position[0], this.pos[1] - position[1]];
    const aToPUnit = [aToP[0]/dist, aToP[1]/dist];

    const angleBetween = $Math.angleBetween(pToAUnit, aToPUnit);
    const impulse = $Math.getDirectionVector(position, angleBetween);
    impulse = $Math.vecMulScalar(impulse, fallOff);

    // nudge away from the repulsor
    return {
      pos: position,
      vel: $Math.invVec(impulse)
    };
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
    switch (this.falloffType) {
      case +ParticleRepulsor.FALLOFF_TYPE.LINEAR:
        return $Math.clamp(1.0 - (dist / this.radius), 0.0, 1.0);  
      case +ParticleRepulsor.FALLOFF_TYPE.SQUARED:
        return $Math.clamp(1.0 / (dist * dist), 0.0, 1.0);
      case +ParticleRepulsor.FALLOFF_TYPE.ATTENUATE:
        return 1.0 / ((1.0 + this.falloff) * (dist - this.radius));
      case +ParticleRepulsor.FALLOFF_TYPE.CUSTOM:
        return this.customFalloff(x, y, dist);
    }
  }

  customFalloff(x, y, dist) {
    return null;
  }
}