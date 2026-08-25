import PhysicalParticle from './PhysicalParticle.js';
import $Math from '../../core/Math.js';
import Util from '../../core/Util.js';

export default class SmokeParticle extends PhysicalParticle {
    constructor(opts = {}, url = import.meta.url) {
        super({
            colors: ['#35352c','#686851','#878785','#919191','#4e2424','#5c4b38','#793e3e'],
            lifeSpan: [10000, 12000],
            drag: 0,
            dragRate: 0,
            particleSize: [10, 16],
            fade: 0.008,
            velocity: 0.008,
            curl: [0.0003, 0.002],
            growth: 0.1,
            softness: 0.15,
            gravity: [0.0, -0.004]
        }, url);
        this.merge(opts);
        this.name = 'smokeParticle';
    }

    static getInstance() {
        return new SmokeParticle();
    }

    /**
     * Called when a particle is spawned to initialize its settings
     * @param {number} time - The current world time in milliseconds
     * @param {Object} config - The particle's configuration
     * @returns {Object} An object containing `life` and `vel`, the lifeSpan and initial veloctiy of the particle
     */
    spawn(pEngine, time, config) {
        const particle = super.spawn(pEngine, time, config);
        particle.memory.curl = $Math.randomRange(this.curl[0], this.curl[1]);
        particle.memory.dir = Util.selectRandom(-0.53, 0.53);
        return particle
    }

    /**
     * Update the particle
     * @param {number} time - Current world time in milliseconds
     * @param {number} deltaTime - Time since last frame was rendered in milliseconds.
     * @param {Object} $memory - The memory object containing the particle's instantaneous properties
     * @param {Array<number>} pos - The particle's current position
     * @param {Array<number>} vel - The particle's velocity vector
     * @param {number} life - Remaining life of the particle
     * @type {Function}
     */
    update(pEngine, time, deltaTime, $memory, pos, vel, life) {
        super.update(pEngine, time, deltaTime, $memory, pos, vel, life);

        // apply curl
        vel[0] += ($memory.curl * Math.cos(($memory.ttl - life) / 500)) * $memory.dir;
        vel[1] += $memory.curl * Math.sin(($memory.ttl - life) / 500);
    }
}