import SprayParticle from './SprayParticle.js';
import $Math from '../../core/Math.js';

export default class SparkParticle extends SprayParticle { 
    constructor(spread, spreadVariance, angle, angleVariance, delay, delayVariance) {
        super(spread, spreadVariance, angle, angleVariance);
        this.opts = {delay: delay, delayVariance: delayVariance, ...this.opts};
    }

    static getInstance(spread, spreadVariance, angle, angleVariance, delay, delayVariance) {
        return new SparkParticle(spread, spreadVariance, angle, angleVariance, delay, delayVariance);
    }

    spawn($memory, time, type, config) {
        if (time > config.lastTime) {
            super($memory, time, type, config);
            $memory.lastTime = time + config.delay + $Math.randomRange(0, config.delayVariance, true);
        }
    }
}