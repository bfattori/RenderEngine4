import BasicParticle from './BasicParticle.js';
import $Math from '../../core/Math.js';

export default class SprayParticle extends BasicParticle {
    constructor(overrides = {}, url = import.meta.url) {
        super({
            colors: ['#ff0', '#fff', '#f90'],
            spread: 10,
            variance: 5,
            angle: 0,
            angleVariance: 5
        }, url);
        this.merge(overrides);
        this.name = 'sprayParticle';
    }

    static getInstance() {
        return new SprayParticle();
    }

    spawn(pEngine, $memory, time, type, config) {
        const p = super.spawn(pEngine, $memory, time, type, config);
        const sprayWidth = config.spread + $Math.randomRange(0, config.spreadVariance, true);
        const halfAngle = Math.floor(sprayWidth / 2);
        p.vel = $Math.vecMulScalar(
            $Math.getDirectionVector([0, 0], $Math.randomRange(-halfAngle, halfAngle, true)), 
            $Math.randomRange(0, config.velocity)
        );
        return p;
    }
}