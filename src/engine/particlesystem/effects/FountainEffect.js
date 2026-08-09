import Constants from '../../Constants.js';
import $Math from '../../core/Math.js';
import SprayParticle from '../types/BasicParticle.js';
import ParticleEffect from './ParticleEffect.js';

export default class FountainEffect extends ParticleEffect {
    #angle = 0;
    #spread = 30;

    /**
     * 
     * @param {Array<string>} types - Particle types to use 
     * @param {number} angle - The fountain angle (default: 0 - straight up)
     * @param {number} spread - The spread-angle in degrees (default: 30) 
     */
    constructor(types, angle = 0, spread = 30) {
        super(types);
        this.#angle = angle;
        this.#spread = spread;
    }

    static getInstance(types, angle, spread) {
        return new FountainEffect(types, angle, spread);
    }

    getTransferrable(name) {
        const t = super.getTransferrable(name);
        t.type = 'FountainEffect';
        for (const prop of ['angle', 'spread']) {
            t.props[prop] = this[prop];
        }
        return t;
    }

    set angle(angle) {
        this.#angle = angle;
    }

    get angle() {
        return this.#angle;
    }

    set spread(degrees) {
        this.#spread = degrees;
    }

    get spread() {
        return this.#spread;
    }

    /**
     * Modify a spawned particle, calculating the spawn angle from
     * the velocity scalar value.
     * 
     * @param {Object} particle - Particle instantiation config
     * @param {Object} options - The particle configuration options 
     */
    spawnParticle(particle, options) {
        particle.vel = $Math.vecMulScalar(
            $Math.getDirectionVector([0,0], $Math.randomRange(this.angle - this.spread, this.angle + this.spread, true)), 
            $Math.getRangeValue(options.velocity)
        );
        return particle;
    }
}
