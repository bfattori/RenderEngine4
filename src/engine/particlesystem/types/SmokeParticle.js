import BasicParticle from './BasicParticle.js';
import $Math from '../../core/Math.js';
import Util from '../../core/Util.js';

export default class SmokeParticle extends BasicParticle {
    constructor(opts = {}, url = import.meta.url) {
        super({
            colors: ['#35352c','#686851','#878785','#919191'],
            sprites: [],
            lifeSpan: [60000, 120000],
            drag: 0,
            dragRate: 0,
            particleSize: [2, 12],
            fade: 0.008,
            velocity: [2.0, 3.8],
            curl: [0.01, 0.04],
            blurRadius: 1.0,
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
    spawn(time, config) {
        const particle = super.spawn(time, config);
        particle.memory.curl = $Math.randomRange(this.curl[0], this.curl[1]);
        particle.memory.dir = Util.selectRandom(-1, 1);
        // add alpha channel
        particle.memory.color = Util.setAlpha(1.0, particle.memory.color);
        particle.memory.alpha = 1.0;
        particle.memory.blurRadius = this.blurRadius;
        particle.memory.point = this.sprites.length === 0;
        particle.memory.fade = this.fade;
        if (this.sprites.length > 0) {
            // select a random sprite
            particle.memory.sprite = this.sprites[$Math.randomRange(0, this.sprites.length, true)].opaqueId;

        }

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
    update(time, deltaTime, $memory, pos, vel, life) {
        super.update(time, deltaTime, $memory, pos, vel, life);

        // apply curl
        vel[0] += ($memory.curl * Math.cos(($memory.ttl - life) / 1000)) * $memory.dir;
        vel[1] += $memory.curl * Math.sin(($memory.ttl - life) / 1000);

        if ($memory.fade > 0) {
            $memory.alpha -= $memory.fade;
            $memory.alpha = Math.max(0.0, $memory.alpha);
            $memory.color = Util.setAlpha($memory.alpha, $memory.color);
        }
    }

    /**
     * Override the basic render to generate diffuse points, or sprites
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
        switch (target) {
            case 'canvas':
                if ($memory.point) {
                    // const gradient = surface.createRadialGradient(0, 0, 1, 0, 0, $memory.size);
                    // gradient.addColorStop(0, $memory.color);
                    // if ($memory.blurRadius < 1.0) {
                    //     gradient.addColorStop($memory.blurRadius, $memory.color);
                    // }
                    // gradient.addColorStop(1, Util.setAlpha(0.0, $memory.color));
                    const fill = surface.fillStyle;
                    surface.beginPath();
                    surface.fillStyle = $memory.color;
                    surface.arc(pos[0], pos[1], $memory.size, 0, $Math.TWO_PI); 
                    surface.fill();
                    surface.fillStyle = fill;   
                } else {
                    // sprites?
                    
                }
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