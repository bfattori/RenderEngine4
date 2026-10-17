import PhysicalParticle from './PhysicalParticle.js';
import Util from '../../core/Util.js';
import $Math from '../../core/Math.js';

export default class SparkParticle extends PhysicalParticle {
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

  computeParticleShape() {
    const shape = super.computeParticleShape();
    shape.set('trailLength',    'Uint8');
    shape.set('trail',          'Float16', config.trailLength * 2);
    shape.set('mult',           'Float16');
    return shape;
  }

  /**
   * Called when a particle is spawned to initialize its settings
   * @param {number} time - The current world time in milliseconds
   * @param {Object} config - The particle's configuration
   * @returns {Object} An object containing `memory`, `life`, and `vel`, the instantaneous memory of the particle, lifeSpan, and initial veloctiy of the particle
   */
  spawn(time, config) {
    const p = super.spawn(time, config);
    p.memory.trailLength = config.trailLength;  // 8-bit unsigned integer
    p.memory.trail = [];  // max trail-length * two 16-bit floats
    p.memory.mult = 1;
    return p;
  }

  /**
   * Update the particle
   * @param {number} time - Current world time in milliseconds
   * @param {number} deltaTime - Time since last frame was rendered in milliseconds.
   * @param {Object} $memory - The memory object containing the particle's instantaneous properties
   * @param {Array<number>} pos - The particle's current position
   * @param {Array<number>} vel - The particle's velocity vector
   * @param {number} life - Remaining life of the particle
   * @type {Function}
   */
  update(time, deltaTime, $memory, pos, vel, life) {
    super.update(time, deltaTime, $memory, pos, vel, life);
    
    // calculate the trail if the particle has a trail length greater than 0
    if ($memory.trailLength > 0) {
      $memory.mult = 1 / $memory.trailLength;
      $memory.trail.unshift(pos[1]);
      $memory.trail.unshift(pos[0]);
      if ($memory.trail.length > $memory.trailLength) {
        $memory.trail.length = $memory.trailLength;
      }
    }
  }

  /**
   * Render the particle
   * @param {Number} time - The current world time in milliseconds
   * @param {Number} deltaTime - The time elapsed since the last frame in milliseconds
   * @param {CanvasRenderingContext2D} surface - The rendering context
   * @param {Object} $memory - The memory object containing the particle's instantaneous properties
   * @param {Array<number>} pos - The current position of the particle
   * @type {Function}
   */
  drawShape(time, deltaTime, surface, $memory, pos) {
    super.drawShape(time, deltaTime, surface, $memory, pos);

    if ($memory.trailLength > 0 && $memory.trail.length > 1) {
      this.drawTrail(surface, $memory, pos);
    }
  }

  /**
   * Draw the trail of the particle
   * @param {CanvasRenderingContext2D} surface - The rendering context 
   * @param {Object} $memory - The memory object containing the particle's instantaneous properties
   * @param {Array<number>} pos - The current position of the particle
   */
  drawTrail(surface, $memory, pos) {
    surface.lineWidth = $memory.trailWidth;
    surface.beginPath();
    surface.moveTo(pos[0], pos[1]);
    $memory.trail.map((p, i) => {
      surface.strokeStyle = Util.setAlpha($memory.aFact * ($memory.trailLength - i), $memory.color);
      surface.lineTo(p[0], p[1]);
      surface.stroke();
    });
  }
}