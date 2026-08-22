import TransferrableConfig from '../../core/TransferrableConfig.js';
import Enum from '../../core/Enum.js';

export default class ParticleAffector extends TransferrableConfig {
  
  static TYPE = new Enum({
    AFFECTOR: 'affector',
    REPULSOR: 'repulsor',
    COLLIDER: 'collider',
    CUSTOM: 'custom'
  });

  constructor(opts = {}, url = import.meta.url) {
    super({
      type: ParticleAffector.TYPE.AFFECTOR,
      pos: [0, 0],
      impulse: 0.0
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
    return null;
  }
}