import PhysicalParticle from './PhysicalParticle.js';
import Util from '../../core/Util.js';
import { MemShape } from '../../core/Spark.js';

export default class SparkParticle extends PhysicalParticle {
  #particleShape = null;
  static MAX_TRAIL_LENGTH = 10;

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

  get shape() {
    if (!this.#particleShape) {
      const shape = new MemShape();
      shape.inherit(super.shape);
      shape.set('trFactor', 'Float32');
      shape.set('trTail',   'UInt8');
      shape.set('trail',    'VecF32', this.trailLength);
      this.#particleShape = shape;
      this.#particleShape.build();
    }
    return this.#particleShape;
  }

  /**
   * Called when a particle is spawned to initialize its settings
   * @param {number} time - The current world time in milliseconds
   * @param {Object} config - The particle's configuration
   * @param {Spark} header - The particle header
   * @param {Spark} heap - The particle's instantaneous memory
   * @returns {number} The lifespan of the particle
   */
  spawn(time, config, header, heap) {
    super.spawn(time, config, header, heap);

    // assign the heap segment BEFORE any operations
    this.shape.segment = heap;

    if (config.trailLength !== 0) {
      this.shape.trail.fill(0.0);
      this.shape.trFactor = 1 / config.trailLength;
      this.shape.trTail = 0;
    }
  }

  /**
   * Update the particle
   * @param {number} time - Current world time in milliseconds
   * @param {number} deltaTime - Time since last frame was rendered in milliseconds.
   * @param {Spark} header - The particle header
   * @param {Spark} heap - The particle's instantaneous memory
   * @param {Array<number>} pos - The particle's current position
   * @param {Array<number>} vel - The particle's velocity vector
   * @param {number} life - Remaining life of the particle
   * @type {Function}
   */
  update(time, deltaTime, header, heap, pos, vel, life) {
    super.update(time, deltaTime, header, heap, pos, vel, life);

    // assign the segment BEFORE any operations
    this.shape.segment = heap;

    // calculate the trail if the particle has a trail length greater than 0
    const trLen = this.trailLength;
    if (trLen > 0) {
      this.shape.trail = Util.unshift(this.shape.trail, pos[0], pos[1]);
      this.shape.trTail += 1;
      this.shape.trTail = Math.min(trLen, this.shape.trTail);
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
  drawShape(time, deltaTime, surface, header, heap, pos) {
    super.drawShape(time, deltaTime, surface, header, heap, pos);

    if (this.trailLength > 0) {
      // assign the segment BEFORE any operations
      this.shape.segment = heap;

      const color = this.colors[this.shape.particleColor];
      this.drawTrail(surface, this.shape.trail, this.shape.trTail, this.shape.trFactor, color, pos);
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