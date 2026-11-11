import $Math from '../../core/lang/Math.js';

import Particle from '../Particle.js';
import DiffuseParticle from './DiffuseParticle.js';

/**
 * @class TrailParticle
 * @classdesc The `TrailParticle` class is a specialized particle type that generates a trail of particles of its
 * own as it moves through space. 
 * @extends DiffuseParticle
 */
export default class TrailParticle extends DiffuseParticle {
  static sizeOf = 2;
  static byteOffset = 66;
  static OFFSETS = {
    QUANTITY:   TrailParticle.byteOffset + 0,
    OPAQUE_ID:  TrailParticle.byteOffset + 1
  };

  constructor(overrides = {}, url = import.meta.url) {
    super({
      /**
       * The quanitity of particles to spawn as a trail. This can be a single number or an array of numbers to allow for randomization.
       * @type {number|Array<number>}
       */
      trailQuantity: [1, 2],

      /**
       * The angle at which the trail particles are ejected relative to the direction of the parent particle. 
       * @type {number} A value in degrees, where 0 is straight ahead, 90 is perpendicular, and 180 is directly behind.
       */
      ejectionAngle: 180,

      /**
       * The fuzziness of the ejection angle. A higher value will result in a wider spread of trail particles.
       * @type {number} A value between 0 and 1, where 0 is no spread and 1 is maximum spread.
       */
      ejectionFuzz: 0.35,
      
      /**
       * The particle type to spawn as a trail. This should correspond to 
       * a valid particle type in the engine.
       * @type {Particle}
       */
      trailParticle: null
    }, url);
    this.merge(overrides);
  }
  
  /**
   * The memory size (in bytes) to store the particle's instantaneous memory
   * @returns {Number} The size in bytes
   */
  get memoryRequirement() {
    return super.memoryRequirement + TrailParticle.sizeOf;
  }
  
  /**
   * Called when a particle is spawned to initialize its settings
   * @param {Array<number>} worldPos - The spawn position
   * @param {number} time - The current world time in milliseconds
   * @param {Spark} memSegment - The particle's instantaneous memory
   */
  spawn(worldPos, time, memSegment) {
    super.spawn(worldPos, time, memSegment);

    const quantity = $Math.getRangeValueInt(this.trailQuantity);
    const opaqueId = this.trailParticle ? this.trailParticle.opaqueId : 0;
    memSegment.setUint8(TrailParticle.OFFSETS.QUANTITY, quantity);
    memSegment.setUint8(TrailParticle.OFFSETS.OPAQUE_ID, opaqueId);
  }

  /**
   * Update the particle
   * @param {number} time - Current world time in milliseconds
   * @param {number} deltaTime - Time since last frame was rendered in milliseconds.
   * @param {Spark} memSegment - The memory segment containing the particle's instantaneous properties
   * @param {UInt16} life - Remaining life of the particle
   */
  update(time, deltaTime, memSegment, life) {
    super.update(time, deltaTime, memSegment, life);
    
    const pType = this.engine.types.get(memSegment.getUint8(TrailParticle.OFFSETS.OPAQUE_ID));
    if (pType) {
      const count = memSegment.getUint8(TrailParticle.OFFSETS.QUANTITY);
      const worldPos = memSegment.getVecF32(Particle.OFFSETS.POSITION);
      const pVel = memSegment.getVecF32(Particle.OFFSETS.VELOCITY);
      const inverseVel = $Math.normalize($Math.invVec(pVel));
      for (let i = 0; i < count; i++) {
        const memSegment = this.engine.spawnParticle(worldPos, time, pType);
        const angle = $Math.randomRange(this.ejectionAngle * this.ejectionFuzz, this.ejectionAngle * this.ejectionFuzz);     
        const vel = $Math.vecMul($Math.getDirectionVector([0, 0], angle), inverseVel);
        memSegment.setVecF32(Particle.OFFSETS.VELOCITY, vel);
      }
    }
  }

  /**
   * Reduce the trail particle type to its name
   * @returns {Object}
   */
  dehydrate() {
      const props = super.dehydrate();
      props.trailParticle = props.trailParticle ? props.trailParticle.$name : null;
      return props;
  }

  /**
   * Resolves the trail particle type from its name.
   * @returns 
   */
  async rehydrate(props) {
    if (props.trailParticle !== null) {
      await new Promise((resolve) => {
        const resolveParticleType = () => {
          if (this.engine.typesByName.get(props.trailParticle))
              return resolve(true);
          else
              setTimeout(resolveParticleType, 250);
        };
        resolveParticleType();
      });
      
      this.trailParticle = this.engine.typesByName.get(props.trailParticle);
      await super.rehydrate(props);
    }
  }
}