import PhysicalParticle from './PhysicalParticle.js';
import $Math from '../../core/Math.js';
import Util from '../../core/Util.js';
import { Matrix2d } from '../../core/Matrix.js';

export default class SmokeParticle extends PhysicalParticle {
    #gradients = new Map();
    
    constructor(opts = {}, url = import.meta.url) {
        super({
            colors: ['#35352c','#686851','#878785','#919191'],
            tileSheet: null,
            lifeSpan: [10000, 12000],
            drag: 0,
            dragRate: 0,
            particleSize: [2, 12],
            fade: 0.008,
            velocity: [0.8, 1.3],
            curl: [0.001,0.002],
            blurRadius: 1.0,
            growth: 0.1
        }, url);
        this.merge(opts);
        this.name = 'smokeParticle';

        this.#createGradients();
    }

    static getInstance() {
        return new SmokeParticle();
    }

    #createGradients() {
        if (this.tileSheet !== null) return;
        
        // for each color provided
        const canvas = new OffscreenCanvas(this.particleSize[1] * 2, this.particleSize[1] * 2);
        const surface = canvas.getContext('2d');
        const center = this.particleSize[1];

        this.colors.forEach((color, idx) => {
            const gradient = surface.createRadialGradient(center, center, 0, center, center, this.particleSize[1] * 2);
            const alphaOne = Util.setAlpha(1.0, color);
            const alphaZero = Util.setAlpha(0, color);
            gradient.addColorStop(0, alphaOne);
            if (this.blurRadius < 1.0) {
                const halfAlpha = Util.setAlpha(0.5, color);
                gradient.addColorStop(this.blurRadius, halfAlpha);
            }
            gradient.addColorStop(1, alphaZero);

            // replace the color with a gradient
            this.colors[idx] = gradient;
        });
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
        particle.memory.dir = Util.selectRandom(-1, 1);
        particle.memory.fade = this.fade;
        particle.memory.alpha = 1.0;

        if (this.tileSheet !== null) {
            // select a random tile
            const rando = $Math.randomRange(0, this.tileSheet.count, true);
            // compile the tile to get an opaqueId
            particle.memory.tile = this.tileSheet.getTileAt(rando).opaqueId;
            particle.memory.mtx = Matrix2d.identity();    // start at 1,1
            particle.memory.mtx.setTo({
                position: [0, 0],
                scale: [1, 1],
                rotation: 0
            });
            particle.memory.scale = 1.0;
            particle.memory.growth = this.growth;
        } else
            particle.memory.point = true;


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
        vel[0] += ($memory.curl * Math.cos(($memory.ttl - life) / 1000)) * $memory.dir;
        vel[1] += $memory.curl * Math.sin(($memory.ttl - life) / 1000);

        // grow tile-based particles in size
        if (!$memory.point)
            $memory.scale += $memory.growth;

        // if ($memory.fade > 0) {
        //     $memory.alpha -= $memory.fade;
        //     $memory.alpha = Math.max(0.0, $memory.alpha);
        //     $memory.color = Util.setAlpha($memory.alpha, $memory.color);
        // }
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
    render(pEngine, time, deltaTime, $memory, pos, life, target, surface) {
        const sz = Math.ceil($memory.size / 2);
        switch (target) {
            case 'canvas':
                if ($memory.point) {
                    const fill = surface.fillStyle;
                    surface.beginPath();
                    surface.arc(pos[0], pos[1], $memory.size, 0, $Math.TWO_PI);
                    surface.fillStyle = $memory.color;
                    surface.fill(); 
                    surface.fillStyle = fill;
                    surface.rect(pos[0] - sz, pos[1] - sz, $memory.size, $memory.size);
                    surface.stroke();
                } else {
                    // tiles?
                    const tile = pEngine.assembler.getCompiledSprite($memory.tile);
                    const frame = tile.frameRect;
                    // $memory.mtx.setTo({
                    //     scale: [$memory.scale, $memory.scale]
                    // });
                    // surface.transform.apply(surface, $memory.mtx.asCanvas());
                    surface.drawImage(tile.sourceImage, frame[0], frame[1], frame[2], frame [3], pos[0], pos[1], frame[2], frame[3]);
                    //surface.restore();
                }
                break;
            case 'webgl':
                break;
        }
    }
}