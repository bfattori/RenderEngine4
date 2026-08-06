import Particle from '../Particle.js';
import $Math from '../../core/Math.js';

export default class FireworksParticle extends Particle {
    constructor() {
        super({
            
        });
    }

    static getInstance() {
        return new FireworksParticle();
    }

    /**
     * Called when a particle is spawned to initialize its settings
     * @param {Object} $memory - The memory object to store instantaneous properties
     * @param {number} time - The current world time in milliseconds
     * @param {String} type - The particle type name
     * @param {Object} config - The particle's configuration
     * @returns {Object} An object containing `life` and `vel`, the lifeSpan and initial veloctiy of the particle
     */
    spawn($memory, time, type, config) {
        super.spawn($memory, time, type, config);
        $memory.$pType = type;    // the particle type
        $memory.color = config.colorSets
        $memory.color = config.colors[$Math.randomRange(0, config.colors.length - 1, true)];
        $memory.startSize = config.particleSize;
        $memory.size = config.particleSize;
        $memory.drag = config.drag;
        $memory.dragRate = config.dragRate;
    
        const life = config.lifeSpan[$Math.randomRange(0, config.lifeSpan.length - 1, true)];
        $memory.ttl = life;
        return {
            life: life,
            vel: $Math.vecMulScalar(
                    $Math.getDirectionVector([0, 0], $Math.randomRange(0, 359, true)), 
                    $Math.randomRange(0, config.velocity)
                )
        };
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
        $memory.drag += $memory.dragRate;

        $memory.size = (life / $memory.ttl) * $memory.startSize;
    }

    /**
     * Render the particle
     * @param {Number} time - The current world time in milliseconds
     * @param {Number} deltaTime - The time elapsed since the last frame in milliseconds
     * @param {Object} $memory - The memory object containing the particle's instantaneous properties
     * @param {Array<number>} pos - The current position of the particle
     * @param {Number} life - The remaining lifespan of the particle
     * @param {String} target - The name of the renderer ('canvas', 'webgl', ...)
     * @param {CanvasRenderingContext2D} surface - The rendering context
     * @type {Function}
     */
    render(time, deltaTime, $memory, pos, life, target, surface) {
        const sz = Math.ceil($memory.size / 2);
        switch (target) {
            case 'canvas':
                surface.fillStyle = $memory.color;
                surface.fillRect(pos[0] - sz, pos[1] - sz, $memory.size, $memory.size);    
                break;
            case 'webgl':
                break;
        }
    }
    
    /**
     * Called to clean up the particle, such as for freeing resources
     * @param {Object} $memory - The memory object containing the particle's instantaneous properties
     * @type {Function}
     */
    cleanUp($memory) {
    }    
}