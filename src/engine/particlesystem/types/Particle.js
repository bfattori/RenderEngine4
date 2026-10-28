import TransferrableConfig from '../../core/TransferrableConfig.js';
import $Math from '../../core/Math.js';

export default class Particle extends TransferrableConfig {
  /**
   * The size of the particle header in bytes
   * @type {number}
   */
  static byteOffset = 0;
  static sizeOf = 31;  

  #opaqueId = null;
  #engineRef = null;

  /**
   * Draw the particle as a point instead of a tile
   * @type {number}
   */
  static AS_POINT = 0;

    /* Particle Header Offsets */
  static OFFSETS = {
    LF_REMAINING: 0,    // Uint16
    LF_ORIGINAL: 2,     // Uint16
    OPAQUE_ID: 4,       // Uint8
    SPAWN_TIME: 5,      // BigUint64
    POSITION: 13,       // VecF32
    VELOCITY: 21,       // VecF32
    FLAGS: 29           // Uint16
  };

  constructor(overrides = {}, url = import.meta.url) {
    super({
      /**
       * Lifespan range of the particle in milliseconds
       * @type {Array<number>|number} [...mean], [minimum, maximum], or limit
       */
      lifeSpan: [90, 3000],
      /**
       * Variance to add to the lifespan to make
       * particles feel unique
       * @type {Array<number>|number} [...mean], [minimum, maximum], or limit
       */
      lifeVariance: 80
    }, url);
    this.merge(overrides);
  }

  get memoryRequirement() {
    return Particle.sizeOf;
  }

  /**
   * The opaque Id references this type of particle. This is used to identify 
   * particles in the engine's memory.
   * @type {number} - The opaque Id of the particle type
   */
  set opaqueId(opaqueId) {
      this.#opaqueId = opaqueId;
  }

  /**
   * The opaque Id representing this particle type
   * @returns {number}
   */
  get opaqueId() {
      return this.#opaqueId;
  }
  
  /**
   * Set up the particle, giving it a chance to initialize
   * after is has been configured and added to the engine.
   * 
   * @param {$ParticleEngine} particleEngine - The particle engine
   */
  setUp(particleEngine) {
    this.#engineRef = particleEngine;
    this.initializeParticleType();
  }

  /**
   * Sub-classes should implement this if there's any pre-processing
   * that needs to occur before spawning particles.
   */
  initializeParticleType() {
  }

  /**
   * Called when a particle is spawned to initialize its settings.
   * @param {Array<number>} worldPos - X & Y coordinates of the particle
   * @param {number} time - The current world time in milliseconds
   * @param {Spark} memSegment - The particle's instantaneous memory
   */
  spawn(worldPos, time, memSegment) {
    // lifespan 
    const lifeSpan = $Math.getRangeValueInt(this.lifeSpan);
    const variance = $Math.getRangeValueInt(this.lifeVariance);
    memSegment.setUint16(Particle.OFFSETS.LF_REMAINING, lifeSpan + variance);
    memSegment.setUint16(Particle.OFFSETS.LF_ORIGINAL, lifeSpan + variance);

    // opaque Id
    memSegment.setUint8(Particle.OFFSETS.OPAQUE_ID, this.opaqueId);

    // spawn time
    memSegment.setBigUint64(Particle.OFFSETS.SPAWN_TIME, BigInt(Math.floor(time)));

    // position
    memSegment.setVecF32(Particle.OFFSETS.POSITION, worldPos);
  }

  /**
   * Update the particle's position by adding the velocity.
   * 
   * @param {number} time - The world time
   * @param {number} deltaTime - Time since last frame
   * @param {Spark} memSegment - The particle's instantaneous memory
   * @param {number} life - The remaining lifespan
   */
  update(time, deltaTime, memSegment, life) {
    const pos = memSegment.getVecF32(Particle.OFFSETS.POSITION);
    const vel = memSegment.getVecF32(Particle.OFFSETS.VELOCITY);

    // add velocity to position
    pos[0] += vel[0];
    pos[1] += vel[1];

    memSegment.setVecF32(Particle.OFFSETS.POSITION, pos);
  }

  /**
   * Called to clean up the particle, such as for freeing resources
   * @param {Spark} memSegment - The memory object containing the particle's instantaneous properties
   */
  cleanUp(memSegment) {
    this.#engineRef.freeParticle(memSegment);
  }

  /**
   * Reduce the particle types to their names
   * @returns {Object}
   */
  dehydrate() {
      const props = super.dehydrate();
      props.opaqueId = this.opaqueId;
      return props;
  }

  /**
   * Replace particle types with their configured instances
   * @returns 
   */
  async rehydrate(obj) {
      this.opaqueId = obj.opaqueId;
      this.name = obj.$name;
      
      await super.rehydrate(obj);
      return obj;
  }
}