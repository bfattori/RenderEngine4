import BasicParticle from './BasicParticle.js';
import $Math from '../../core/Math.js';

export default class SprayParticle extends BasicParticle {
    constructor(spread, spreadVariance, angle, angleVariance) {
        super({
            colors: ['#ff0', '#fff', '#f90'],
            spread: spread,
            variance: spreadVariance,
            angle: angle,
            aVar: angleVariance
        });
    }

    static getInstance() {
        return new SprayParticle();
    }

    spawn($memory, time, type, config) {
        const p = super.spawn($memory, time, type, config);
        const sprayWidth = config.spread + $Math.randomRange(0, config.spreadVariance, true);
        const halfAngle = Math.floor(sprayWidth / 2);
        p.vel = $Math.vecMulScalar(
            $Math.getDirectionVector([0, 0], $Math.randomRange(-halfAngle, halfAngle, true)), 
            $Math.randomRange(0, config.velocity)
        );
        return p;
    }
}