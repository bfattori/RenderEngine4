import FountainEffect from './FountainEffect.js';
import $Math from '../../core/Math.js';

export default class SparkEffect extends FountainEffect {
    #nextEmission = 0;

    constructor(overrides = {}, url = import.meta.url) {
        super({
          /**
           * The spread, or width, of the fountain effect, in degrees.
           * @type {number}
           */
          spread: 90,
          /**
           * The delay between particle emissions, in milliseconds. This can be a 
           * single number or an array of two numbers to specify a range.
           * @type {number|Array<number>}
           */
          delay: [1000, 2000],
          /**
           * The variance of the delay between particle emissions, in milliseconds. A
           * single number.
           * @type {number}
           */
          delayVariance: 1000
        }, url);
        this.merge(overrides);
        this.$name = 'sparkEffect';
    }

    /**
     * Delay the generation of particles by a random amount within the specified range. 
     * This method is called before each particle emission to ensure that particles are not emitted too quickly.
     * @param {Array<number>} worldPos - [x, y] the world position where to emit particles
     * @param {number} time - The current world time in milliseconds
     * @returns {boolean} `true` if the effect will generate particles, `false` otherwise.
     */
    generate(worldPos, time) {
      if (time > this.#nextEmission) {
        this.#nextEmission = time + $Math.getRangeValue(this.delay) + $Math.randomRangeInt(0, this.delayVariance);
        return true;
      }
      return false;
    }
  }