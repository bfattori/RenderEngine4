import PhysicalParticle from './PhysicalParticle.js';
import Util from '../../core/Util.js';
import Particle from './Particle.js';
import BasicParticle from './BasicParticle.js';
import DiffuseParticle from './DiffuseParticle.js';

export default class SparkParticle extends PhysicalParticle {
  static MAX_TRAIL_LENGTH = 10;

  /**
   * The size of the particle in bytes
   * @type {number}
   */
  static sizeOf = 85;
  static byteOffset = 66;

  static OFFSETS = {
    ROLLOFF:        SparkParticle.byteOffset + 0,
    TRAIL_LEN:      SparkParticle.byteOffset + 1,
    TRAIL:          SparkParticle.byteOffset + 5
  }

  constructor(overrides = {}, url = import.meta.url) {
    super({
      /**
       * The length of the trail for the spark.
       * @type {Array<number>|number}
       */
      trailLength: 5,
      /**
       * The width of the line to render the trail.
       * @type {number}
       */
      trailWidth: 2,

      // reasonable defaults
      colors: ['#ff0', '#fff', '#f90', '#ffd'],
      particleSize: 25,
      drag: 0,
      dragRate: 0,
      fadeRate: 0.01,
      softness: 0.75,
      velocity: [8, 25],
      gravity: [0, 0.2],
      lifeSpan: [80, 3000]
    }, url);
    this.merge(overrides);
    this.name = 'sparkParticle';
  }

  static getInstance() {
      return new SparkParticle();
  }

  get memoryRequirement() {
    return Particle.sizeOf + BasicParticle.sizeOf + DiffuseParticle.sizeOf + SparkParticle.sizeOf;
  }

  /**
   * Called when a particle is spawned to initialize its settings
   * @param {Array<number>} worldPos - The spawn position
   * @param {number} time - The current world time in milliseconds
   * @param {Spark} memSegment - The particle's instantaneous memory
   */
  spawn(worldPos, time, memSegment) {
    super.spawn(worldPos, time, memSegment);

    if (this.trailLength !== 0) {
      memSegment.setFloat32(SparkParticle.OFFSETS.ROLLOFF, 1 / this.trailLength);
      memSegment.setUint8(SparkParticle.OFFSETS.TRAIL_LEN, 0);
      const initArray = new Array(SparkParticle.MAX_TRAIL_LENGTH * 2).fill(0.0);
      memSegment.setVecF32Array(SparkParticle.OFFSETS.TRAIL, initArray, SparkParticle.MAX_TRAIL_LENGTH);
    }
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

    // calculate the trail if the particle has a trail length greater than 0
    const trLen = this.trailLength;
    if (trLen > 0) {
      let curLen = memSegment.getUint8(SparkParticle.OFFSETS.TRAIL_LEN);
      const pos = memSegment.getVecF32(Particle.OFFSETS.POSITION);
      const trail = memSegment.getVecF32Array(SparkParticle.OFFSETS.TRAIL, SparkParticle.MAX_TRAIL_LENGTH);
      const shifted = Util.unshift(trail, pos[0], pos[1]);
      curLen = Math.min(trLen, curLen + 1);
      memSegment.setVecF32Array(SparkParticle.OFFSETS.TRAIL, shifted, SparkParticle.MAX_TRAIL_LENGTH);
      memSegment.setUint8(SparkParticle.OFFSETS.TRAIL_LEN, curLen);
    }
  }

  /**
   * Render the particle
   * @param {Number} time - The current world time in milliseconds
   * @param {Number} deltaTime - The time elapsed since the last frame in milliseconds
   * @param {CanvasRenderingContext2D} surface - The rendering context
   * @param {Spark} header - The particle header
   * @param {Spark} heap - The particle's instantaneous memory
   * @param {Array<number>} pos - The current position of the particle
   * @type {Function}
   */
  drawShape(time, deltaTime, surface, memSegment) {
    super.drawShape(time, deltaTime, surface, memSegment);

    if (this.trailLength > 0) {
      const colorIdx = memSegment.getUint8(BasicParticle.OFFSETS.COLOR);
      const color = this.colors[colorIdx];
      const rolloff = memSegment.getFloat32(SparkParticle.OFFSETS.ROLLOFF);
      const trail = memSegment.getVecF32Array(SparkParticle.OFFSETS.TRAIL, SparkParticle.MAX_TRAIL_LENGTH);
      const trailLen = memSegment.getUint8(SparkParticle.OFFSETS.TRAIL_LEN); 
      const pos = memSegment.getVecF32(Particle.OFFSETS.POSITION);

      this.drawTrail(surface, trail, trailLen, rolloff, color, pos);
    }
  }

  /**
   * Draw the trail of the particle using the color and trail
   * @param {CanvasRenderingContext2D} surface - The rendering context 
   * @param {TypedArray<VecF32>} trail - The trail array
   * @param {number} trailLen - The number of vertices in the trail
   * @param {number} rollFactor - The trail rolloff factor, which controls the opacity of the trail
   * @param {number} particleColor - The color of the particle
   * @param {Float32Array} pos - The current position of the particle
   */
  drawTrail(surface, trail, trailLen, rollFactor, particleColor, pos) {
    surface.lineWidth = this.trailWidth;
    surface.beginPath();
    surface.moveTo(pos[0], pos[1]);
    
    // trail positions are stored as 2 elements in the array (x followed by y)
    let i = 0;
    for (let idx = 0; idx < trailLen * 2; idx += 2) {
      surface.strokeStyle = Util.setAlpha(rollFactor * (this.trailLength - i), particleColor);
      surface.lineTo(trail[idx], trail[idx + 1]);
      surface.stroke();
      i++;
    }
  }
}