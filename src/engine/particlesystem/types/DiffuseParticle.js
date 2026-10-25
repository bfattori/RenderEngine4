import BasicParticle from './BasicParticle.js';
import $Math from '../../core/Math.js';
import Util from '../../core/Util.js';
import { MemShape } from '../../core/Spark.js';

/**
 * @class DiffuseParticle
 * @classdesc The DiffuseParticle class is a specialized particle type that extends the BasicParticle class. It defines specific properties 
 * for particles that have a diffuse appearance, including softness, which controls the blurring effect of the particle. The class provides 
 * methods to initialize the particle, render its shape with a radial gradient, and update its state over time.
 * @extends BasicParticle
 */
export default class DiffuseParticle extends BasicParticle {
  #ctx = null;
  #particleShape = null;

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

   get shape() {
    if (!this.#particleShape) {
      const shape = new MemShape();
      shape.inherit(super.shape);
      shape.set('softness',   'Float32');
      shape.set('fade',       'Float32');
      shape.set('alpha',      'Float32');
      this.#particleShape = shape;
      this.#particleShape.build();
    }
    return this.#particleShape;
  }

  /**
   * Called when a particle is spawned to initialize its settings
   * @param {number} time - The current world time in milliseconds
   * @param {BasicParticle} config - The particle's configuration
   * @param {Spark} header - The particle header
   * @param {Spark} heap - The particle's instantaneous memory
  * @returns {number} The particle's lifespan
   */
  spawn(time, config, header, heap) {
    const lifeSpan = super.spawn(time, config, header, heap);

    // assign the heap segment BEFORE any operations
    this.shape.segment = heap;

    this.shape.softness = this.softness;               
    this.shape.fade = $Math.getRangeValue(this.fadeRate);
    this.shape.alpha = 1.0;                                 

    return lifeSpan;
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
  drawShape(time, deltaTime, surface, header, heap, pos) {
    this.shape.segment = heap;

    const gradient = this.#gradient(heap, pos);
    surface.beginPath();
    surface.arc(pos[0], pos[1], this.shape.particleSize, 0, $Math.TWO_PI);
    surface.fillStyle = gradient;
    surface.fill();
  }

  /**
   * Create a runtime gradient for the particle's diffuse property
   * @param {Object} $memory - The particle's memory 
   * @param {*} pos - The position of the particle
   * @returns 
   */
  #gradient(heap, pos) {
    this.shape.segment = heap;

    const color = this.colors[this.shape.particleColor];
    const alpha = this.shape.alpha;
    const gradient = this.#ctx.createRadialGradient(pos[0], pos[1], 0, pos[0], pos[1], this.shape.particleSize);
    const alphaColor = Util.setAlpha(alpha, color)

    const fade = this.shape.fade;
    if (fade > 0) {
       this.shape.alpha = Math.max(0.0, alpha - fade);
    }

    // start us off
    gradient.addColorStop(0, alphaColor);
    const soft = this.shape.softness;

    if (soft < 1.0) {
        const halfAlpha = Util.setAlpha(0.5, color);
        gradient.addColorStop(soft, halfAlpha);
    }

    const alphaZero = Util.setAlpha(0, color);
    gradient.addColorStop(1, alphaZero);
    return gradient;
  }
}