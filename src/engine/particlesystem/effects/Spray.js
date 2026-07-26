import ParticleEffect from './ParticleEffect.js';
import Particle from '../Particle.js';
import Util from '../../core/Util.js';

export default class Spray extends ParticleEffect {
    #spread = 10;
    #spreadVariance = 0;
    #angle = 0;
    #angleVariance = 0;

    constructor(origin) {
        super(origin);
        this.particle(SprayParticle);
    }

    /**
     * The width of the spray of particles effect.
     * @param spread
     * @returns {*}
     */
    set spread(spread) {
        this.#spread = spread;
    }

    set spreadVariance(variance) {
        this.#spreadVariance = variance;
    }

    set angle(angle) {
        this.#angle = angle;
    }

    set angleVariance(variance) {
        this.#angleVariance = variance;
    }

    /**
     * A method to give an effect the ability to modify a particle's options for each particle generated.
     * @param particleOptions {Object}
     * @param [time] {Number} The current world time
     * @param [deltaTime] {Number} The number of milliseconds since the last rendered frame was generated
     */
    modifyParticle(particle, time, deltaTime) {
        super(particle, time, deltaTime);
        const sprayWidth = this.#spread + Util.randomRange(0, this.spreadVariance, true);
        const halfAngle = Math.floor(sprayWidth / 2);
        particleOptions.angle = this.angle + Util.randomRange(-this.angleVariance, this.angleVariance * 2, true) +
            Util.randomRange(-halfAngle, halfAngle * 2, true);
    }
}

class SprayParticle extends Particle {
}

export {
    SprayParticle
}