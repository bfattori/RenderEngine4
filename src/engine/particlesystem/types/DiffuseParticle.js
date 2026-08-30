import BasicParticle from './BasicParticle.js';
import $Math from '../../core/Math.js';
import Util from '../../core/Util.js';

export default class DiffuseParticle extends BasicParticle {
  #ctx = null;

  constructor(overrides = {}, url = import.meta.url) {
    super({
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
  spawn(pEngine, time, config) {
    const p = super.spawn(pEngine, time, config);  
    p.softness = this.softness;
    return p;
  }

  /**
   * Render the particle
   * @param {ParticleEngine} pEngine - The particle engine
   * @param {Number} time - The current world time in milliseconds
   * @param {Number} deltaTime - The time elapsed since the last frame in milliseconds
   * @param {CanvasRenderingContext2D} surface - The rendering context
   * @param {Object} $memory - The memory object containing the particle's instantaneous properties
   * @param {Array<number>} pos - The current position of the particle
   * @type {Function}
   */
  drawShape(pEngine, time, deltaTime, surface, $memory, pos) {
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
    const alphaOne = Util.setAlpha(1.0, $memory.color);
    const alphaZero = Util.setAlpha(0, $memory.color);
    gradient.addColorStop(0, alphaOne);
    if ($memory.softness < 1.0) {
        const halfAlpha = Util.setAlpha(0.5, $memory.color);
        gradient.addColorStop($memory.softness, halfAlpha);
    }
    gradient.addColorStop(1, alphaZero);
    return gradient;
  }
}