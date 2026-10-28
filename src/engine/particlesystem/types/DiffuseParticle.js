import Particle from './Particle.js';
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
  static sizeOf = 12;
  static byteOffset = 54;
  static OFFSETS = {
    SOFT:   DiffuseParticle.byteOffset + 0,
    FADE:   DiffuseParticle.byteOffset + 4,
    ALPHA:  DiffuseParticle.byteOffset + 8
  };

  #ctx = null;
  #colorAlphas = [];

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
  }
  
  initializeParticleType() {
    super.initializeParticleType();
    const sz = Array.isArray(this.particleSize) ? this.particleSize.sort()[this.particleSize.length - 1] : this.particleSize;
    const off = new OffscreenCanvas(sz, sz);
    this.#ctx = off.getContext('2d');

    // grab the color alphas to init when spawning particles
    for (let i = 0; i < this.colors.length; i++) {
      const channels = Util.extractColorChannels(this.colors[i]);
      this.#colorAlphas[i] = channels[3];
    }

    // generate a set of images representing the largest size, in each color
  }

  get memoryRequirement() {
    return Particle.sizeOf + BasicParticle.sizeOf + DiffuseParticle.sizeOf;
  }
  
  /**
   * Called when a particle is spawned to initialize its settings
   * @param {Array<number>} worldPos - The spawn position
   * @param {number} time - The current world time in milliseconds
   * @param {Spark} memSegment - The particle's instantaneous memory
   */
  spawn(worldPos, time, memSegment) {
    super.spawn(worldPos, time, memSegment);

    memSegment.setFloat32(DiffuseParticle.OFFSETS.SOFT, 1.0 - this.softness);
    memSegment.setFloat32(DiffuseParticle.OFFSETS.FADE, this.fadeRate > 0 ? this.fadeRate : 0.0);

    // initialize the alpha values for each color channel based on the color index and alpha value
    const colorIdx = memSegment.getUint8(BasicParticle.OFFSETS.COLOR);
    memSegment.setFloat32(DiffuseParticle.OFFSETS.ALPHA, this.#colorAlphas[colorIdx] / 255);
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
        
        const fade = memSegment.getFloat32(DiffuseParticle.OFFSETS.FADE);
        if (fade > 0.0) {
          let alpha = memSegment.getFloat32(DiffuseParticle.OFFSETS.ALPHA);
          alpha -= fade;
          memSegment.setFloat32(DiffuseParticle.OFFSETS.ALPHA, Math.max(0.0, alpha));

          if (alpha <= 0) {
            this.cleanUp(memSegment);
          }
        }
    }

  /**
   * Render the particle - diffuse disc
   * @param {Number} time - The current world time in milliseconds
   * @param {Number} deltaTime - The time elapsed since the last frame in milliseconds
   * @param {CanvasRenderingContext2D} surface - The rendering context
   * @param {Spark} memSegment - The memory object containing the particle's instantaneous properties
   */
  drawShape(time, deltaTime, surface, memSegment) {
    const size = memSegment.getFloat32(BasicParticle.OFFSETS.CUR_SIZE);
    const color = this.colors[memSegment.getUint8(BasicParticle.OFFSETS.COLOR)];
    const alpha = memSegment.getFloat32(DiffuseParticle.OFFSETS.ALPHA);
    const soft = memSegment.getFloat32(DiffuseParticle.OFFSETS.SOFT);
    const pos = memSegment.getVecF32(Particle.OFFSETS.POSITION);

    surface.beginPath();
    surface.arc(pos[0], pos[1], size, 0, $Math.TWO_PI);
    surface.fillStyle = this.#gradient(pos, size, color, alpha, soft);;
    surface.fill();
  }

  /**
   * Create a runtime gradient for the particle's diffuse property
   * @param {Object} $memory - The particle's memory 
   * @param {*} pos - The position of the particle
   * @returns 
   */
  #gradient(pos, size, color, alpha, soft) {
    const gradient = this.#ctx.createRadialGradient(pos[0], pos[1], 0, pos[0], pos[1], size);
    let alphaColor = Util.setAlpha(alpha, color)

    // start us off
    gradient.addColorStop(0, alphaColor);

    if (soft < 1.0) {
      gradient.addColorStop(soft, alphaColor);
    }

    const alphaZero = Util.setAlpha(0, alphaColor);
    gradient.addColorStop(1, alphaZero);
    return gradient;
  }
}