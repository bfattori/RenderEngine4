import BasicParticle from './BasicParticle.js';
import $Math from '../../core/Math.js';

export default class WaterParticle extends BasicParticle {
    constructor() {
        super({
            colors: ['rgb(4, 0, 255)', 'rgb(185, 180, 255)', '#4d4fdb', '#160e5f', 'rgb(118, 172, 216)', 'rgb(24, 208, 214)'],
            lifeSpan: [1000, 2000],
            drag: 1.4,
            dragRate: 0,
            particleSize: [5, 8],
            velocity: [0.3, 0.39],
            gravity: 0.01
        })
    }

    static getInstance() {
        return new WaterParticle();
    }

/**
     * Called when a particle is spawned to initialize its settings
     * @param {Object} $memory - The memory object to store instantaneous properties
     * @param {number} time - The current world time in milliseconds
     * @param {String} type - The particle type name
     * @param {Object} config - The particle's configuration
     * @returns {Object} An object containing `life` and `vel`, the lifeSpan and initial veloctiy of the particle
     */
    spawn(type, time, config) {
        const spawned = super.spawn(type, time, config);
        spawned.memory.gravity = $Math.getRangeValue(config.gravity);
        return spawned;
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
    update(time, deltaTime, $memory, pos, vel, life) {
        // standard update (add velocity to position)
        pos[0] += (vel[0] * (1 / $memory.drag));
        pos[1] += (vel[1] * (1 / $memory.drag));
        vel[1] += $memory.gravity;
        $memory.drag += $memory.dragRate;
        $memory.size = (life / $memory.ttl) * $memory.startSize;
    }
}