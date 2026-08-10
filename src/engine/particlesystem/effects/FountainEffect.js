import Constants from '../../Constants.js';
import $Math from '../../core/Math.js';
import SprayParticle from '../types/BasicParticle.js';
import ParticleEffect from './ParticleEffect.js';

export default class FountainEffect extends ParticleEffect {
    /**
     * 
     * @param {Array<string>} types - Particle types to use 
     * @param {number} angle - The fountain angle (default: 0 - straight up)
     * @param {number} spread - The spread-angle in degrees (default: 30) 
     */
    constructor(opts = {}, url = import.meta.url) {
        super({
            angle: 0, 
            spread: 30
        }, url);
        this.merge(opts);
        this.$name = 'fountainEffect';
    }

    /**
     * Modify a spawned particle, calculating the spawn angle from
     * the velocity scalar value.
     * 
     * @param {Object} particle - Particle instantiation config
     * @param {Object} options - The particle configuration options
     * @returns {Object} Particle spawn data
     */
    initParticle(particle, options) {
        const lowAngle = this.angle - this.spread, 
            highAngle = this.angle + this.spread;
        
        particle.vel = $Math.vecMulScalar(
            $Math.getDirectionVector([0,0], $Math.randomRange(lowAngle, highAngle, true)), 
            $Math.getRangeValue(options.velocity)
        );
        return particle;
    }
}
