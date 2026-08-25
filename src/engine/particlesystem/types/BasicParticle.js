import TransferrableConfig from '../../core/TransferrableConfig.js';
import $Math from '../../core/Math.js';
import { Matrix2d } from '../../core/Matrix.js';

export default class BasicParticle extends TransferrableConfig {
    #name = 'basicParticle';

    /**
     * Create a `BasicParticle` with options for colors, sizes, velocity range,
     * drag, and other properties. Particles are the atomic unit represented in the `ParticleSystem`
     * and have position, velocity, and run-time options. The run-time options allow a particle to
     * change over time, such as changing size, introducing turbulence, or fading in and out.
     *  
     * @param {Object} opts - Configuration options for the particle
     * @param {String} url - Module URL
     */
    constructor(opts = {}, url = import.meta.url) {
        super({
            /**
             * Colors of the particle
             * @type {String}
             */
            colors: ['#fff'],
            /**
             * Tiles (bitmaps) used in place of a simple colored shape.
             * @type {}
             */
             tileSheet: null,
            /**
             * Size of the particle
             * @type {Array<number>|number} [...mean], [minimum, maximum], or limit
             */
            particleSize: [0.5, 2.0],
            /**
             * Amount to decay the particle size over its lifetime
             * @type {Array<number>|number} [...mean], [minimum, maximum], or limit
             */
            sizeDecay: 0,
            /**
             * Velocity range - a scalar multiple to apply to the velocity
             * @type {Array<number>|number} [...mean], [minimum, maximum], or limit
             */
            velocity: [0.8, 2.0],
            /**
             * Particle drag
             * @type {Array<number>|number} [...mean], [minimum, maximum], or limit
             */
            drag: 1.4,
            /**
             * Increase in drag at each update
             * @type {Array<number>|number} [...mean], [minimum, maximum], or limit
             */
            dragRate: 1.3,
            /**
             * Lifespan range of the particle in milliseconds
             * @type {Array<number>|number} [...mean], [minimum, maximum], or limit
             */
            lifeSpan: [90, 3000],
            /**
             * Variance to add to the lifespan to make
             * particles feel unique
             * @type {Array<number>|number} [...mean], [minimum, maximum], or limit
             */
            lifeVariance: 80,
            /**
             * Gravity effect on the particle (can act in any dimension)
             * @type {Array<number>} - vector of gravitational influence
             */
            gravity: [0.0, 0.0]
        }, url);
        this.merge(opts);
        this.name = 'basicParticle'
    }

    static getInstance() {
        return new BasicParticle();
    }

    /**
     * Override the name of the particle type. If you reuse a particle type, you need
     * to differentiate them by name or the particle engine will use the first instance
     * provided.
     * @param {String} name - The particle name
     */
    set name(name) {
        this.$name = name;
    }

    /**
     * Get the name of this particle type.
     * @returns {String} The name of the particle type
     */
    get name() {
        return this.$name;
    }

    /**
     * Called when a particle is spawned to initialize its settings
     * @param {number} time - The current world time in milliseconds
     * @param {Object} config - The particle's configuration
     * @returns {Object} An object containing `life` and `vel`, the lifeSpan and initial veloctiy of the particle
     */
    spawn(pEngine, time, config) {
        const $memory = {};
        $memory.$pType = this.$name;    // the particle type
        $memory.color = config.colors && config.colors.length !== 0 ? config.colors[$Math.randomRange(0, config.colors.length - 1, true)] : '#000';
        $memory.size = $Math.getRangeValue(config.particleSize);
        $memory.startSize = $memory.size;
        $memory.drag = $Math.getRangeValue(config.drag);
        $memory.dragRate = $Math.getRangeValue(config.dragRate);
        $memory.gravity = config.gravity;
        $memory.sizeDecay = config.sizeDecay;
        $memory.fade = this.fade;
        $memory.alpha = 1.0;

        const life = $Math.getRangeValue(config.lifeSpan);
        $memory.ttl = (life - $Math.getRangeValue(config.lifeVariance));

        if (this.tileSheet !== null) {
            // select a random tile
            const tileNum = $Math.randomRange(0, this.tileSheet.count, true);
            $memory.tile = this.tileSheet.getTileAt(tileNum).opaqueId;
            $memory.mtx = Matrix2d.identity();    // start at 1,1
            $memory.mtx.setTo({
                position: [0, 0],
                scale: [1, 1],
                rotation: 0
            });
            $memory.scale = 1.0;
            $memory.growth = this.growth;
        } else
            $memory.point = true;

        return {
            memory: $memory,
            life: life,
            vel: $Math.getRangeValue(config.velocity)
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
    update(pEngine, time, deltaTime, $memory, pos, vel, life) {
        // standard update:
        //   add velocity to position then add gravity to velocity
        const drag = $memory.drag !== 0 ? (1 / $memory.drag) : 1;
        const v = $Math.vecMulScalar(vel, drag);
        vel[0] = v[0] + this.gravity[0];
        vel[1] = v[1] + this.gravity[1];
        pos[0] += vel[0];
        pos[1] += vel[1];

        // increase drag over time
        $memory.drag += $memory.dragRate;

        // grow tile-based particles in size
        // if (!$memory.point)
        //     $memory.scale += $memory.growth;

        // shrink over the lifespan
        if ($memory.sizeDecay > 0.0) {
            $memory.size = ((life / $memory.ttl) * $memory.startSize) / $memory.sizeDecay;
        }

        // if ($memory.fade > 0) {
        //     $memory.alpha -= $memory.fade;
        //     $memory.alpha = Math.max(0.0, $memory.alpha);
        //     $memory.color = Util.setAlpha($memory.alpha, $memory.color);
        // }
    }

    /**
     * Render the particle
     * @param {ParticleEngine} pEngine - The particle engine
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
        switch (target) {
            case 'canvas':
                if ($memory.point) {
                    this.drawShape(pEngine, time, deltaTime, surface, $memory, pos);
                } else {
                    this.drawTile(pEngine, time, deltaTime, surface, $memory, pos);
                }
                break;
            case 'webgl':
                break;
        }
    }

    /**
     * Render the particle
     * @param {ParticleEngine} pEngine - The particle engine
     * @param {Number} time - The current world time in milliseconds
     * @param {Number} deltaTime - The time elapsed since the last frame in milliseconds
     * @param {CanvasRenderingContext2D} surface - The rendering context
     * @param {Object} $memory - The memory object containing the particle's instantaneous properties
     * @param {Array<number>} pos - The current position of the particle
     * @type {Function}
     */
    drawShape(pEngine, time, deltaTime, surface, $memory, pos) {
        const sz = Math.ceil($memory.size / 2);
        surface.fillStyle = $memory.color;
        surface.fillRect(pos[0] - sz, pos[1] - sz, $memory.size, $memory.size);    
    }

    /**
     * Render the particle
     * @param {ParticleEngine} pEngine - The particle engine
     * @param {Number} time - The current world time in milliseconds
     * @param {Number} deltaTime - The time elapsed since the last frame in milliseconds
     * @param {CanvasRenderingContext2D} surface - The rendering context
     * @param {Object} $memory - The memory object containing the particle's instantaneous properties
     * @param {Array<number>} pos - The current position of the particle
     * @type {Function}
     */
    drawTile(pEngine, time, deltaTime, surface, $memory, pos) {
        // $memory.mtx.setTo({
        //     scale: [$memory.scale, $memory.scale]
        // });
        // surface.transform.apply(surface, $memory.mtx.asCanvas());
        const tile = pEngine.assembler.getCompiledSprite($memory.tile);
        const frame = tile.frameRect;
        surface.drawImage(tile.sourceImage, frame[0], frame[1], frame[2], frame [3], pos[0], pos[1], frame[2], frame[3]);
        //surface.restore();
    }

    
    /**
     * Called to clean up the particle, such as for freeing resources
     * @param {Object} $memory - The memory object containing the particle's instantaneous properties
     * @type {Function}
     */
    cleanUp($memory) {
        $memory.color = null;
    }            
}