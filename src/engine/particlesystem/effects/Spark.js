import Spray from './Spray.js';
import Util from '../../core/Util.js';

export default class Spark extends Spray { 
    #delay = 10;
    #delayVariance = 0;
    #lastDelayTime = 0;

    /**
     * The delay between particle emissions.
     *
     * @param delay
     * @param [delayVariance]
     * @returns {*}
     */
    set delay(delay) {
        this.#delay = delay;
    }

    set delayVariance(variance) {
        this.#delayVariance = variance;
    }

    generateParticles(count, life, velocity, time, deltaTime) {
        if (this.#lastDelayTime === 0) {
            this.#lastDelayTime = time + this.#delay + Util.randomRange(0, this.#delayVariance, true);
        }

        if (time > this.#lastDelayTime) {
            super(count, life, velocity, time, deltaTime);
            this.#lastDelayTime = time + this.#delay + Util.randomRange(0, this.#delayVariance, true);
        }
    }
}