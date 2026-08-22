import SprayParticle from './SprayParticle.js';
import $Math from '../../core/Math.js';

export default class SparkParticle extends SprayParticle { 
    constructor(opts = {}, url = import.meta.url) {
        super({
            delay: 100,
            delayVariance: 500
        });
        this.merge(opts);
        this.name = 'sparkParticle';
    }

    static getInstance(spread, spreadVariance, angle, angleVariance, delay, delayVariance) {
        return new SparkParticle();
    }

    spawn(pEngine, $memory, time, type, config) {
        if (time > config.lastTime) {
            super(pEngine, $memory, time, type, config);
            $memory.lastTime = time + config.delay + $Math.randomRange(0, config.delayVariance, true);
        }
    }
}