import BasicParticle from './BasicParticle.js';
import $Math from '../../core/Math.js';
import Util from '../../core/Util.js';

/**
 * @class DiffuseParticle
 * @classdesc The DiffuseParticle class is a specialized particle type that extends the BasicParticle class. It defines specific properties 
 * for particles that have a diffuse appearance, including softness, which controls the blurring effect of the particle. The class provides 
 * methods to initialize the particle, render its shape with a radial gradient, and update its state over time.
 * @extends BasicParticle
 */
export default class DiffuseParticle extends BasicParticle {
  #ctx = null;

  constructor(overrides = {}, url = import.meta.url) {
    super({
      /**
       * The rate at which the particle fades to nothing. Lower values imply faster fading.
       * @type {number|Array<number>}
       */
      fadeRate: 0,
      
      /**
       * The diffuse blurring of the particle. Higher values imply more blurring.
       * @type {number}
       */
      softness: 1.0
    }, url);
    this.merge(overrides);
    this.#init();
  }
  
  #init() {
    const sz = this.particleSize.sort()[this.particleSize.length - 1];
    const off = new OffscreenCanvas(sz, sz);
    this.#ctx = off.getContext('2d');
  }

  /**
   * Called when a particle is spawned to initialize its settings
   * @param {number} time - The current world time in milliseconds
   * @param {Object} config - The particle's configuration
   * @returns {Object} An object containing `softness`, the diffuse blur of the particle
   */
  spawn(time, config) {
    const p = super.spawn(time, config);  
    p.memory.softness = this.softness;
    p.memory.fade = $Math.getRangeValue(this.fadeRate);
    p.memory.alpha = 1.0;
    p.memory.full = p.memory.color;
    return p;
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
    const gradient = this.#gradient($memory, pos);
    surface.beginPath();
    surface.arc(pos[0], pos[1], $memory.size, 0, $Math.TWO_PI);
    surface.fillStyle = gradient;
    surface.fill();
  }

  /**
   * Create a runtime gradient for the particle's diffuse property
   * @param {Object} $memory - The particle's memory 
   * @param {*} pos - The position of the particle
   * @returns 
   */
  #gradient($memory, pos) {
    const gradient = this.#ctx.createRadialGradient(pos[0], pos[1], 0, pos[0], pos[1], $memory.size);

    $memory.color = Util.setAlpha($memory.alpha, $memory.full)

    if ($memory.fade > 0) {
       $memory.alpha = Math.max(0.0, $memory.alpha - $memory.fade);
    }

    // start us off
    gradient.addColorStop(0, $memory.color);

    if ($memory.softness < 1.0) {
        const halfAlpha = Util.setAlpha(0.5, $memory.color);
        gradient.addColorStop($memory.softness, halfAlpha);
    }

    const alphaZero = Util.setAlpha(0, $memory.full);
    gradient.addColorStop(1, alphaZero);
    return gradient;
  }
}