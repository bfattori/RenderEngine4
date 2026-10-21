import PhysicalParticle from './PhysicalParticle.js';
import $Math from '../../core/Math.js';
import Util from '../../core/Util.js';
import { MemShape } from '../../core/Spark.js';

/**
 * @class SmokeParticle
 * @classdesc The SmokeParticle class is a specialized particle type that extends the PhysicalParticle class. It defines specific properties 
 * for particles that simulate smoke, including color options, lifespan, drag, size, velocity, growth, gravity, and curl. The class provides 
 * methods to initialize the particle, update its state over time, and apply curling effects to simulate the behavior of smoke in a realistic manner.
 * @extends PhysicalParticle
 */
export default class SmokeParticle extends PhysicalParticle {
    #particleShape = null;

    constructor(overrides = {}, url = import.meta.url) {
        super({
            colors: ['#35352c','#686851','#878785','#919191','#4e2424','#5c4b38','#793e3e'],
            lifeSpan: [10000, 12000],
            drag: 0,
            dragRate: 0,
            particleSize: [10, 16],
            velocity: 0.008,
            growth: 0.1,
            gravity: [0.0, -0.004],
            softness: 0.15,

            /**
             * The amount of curl applied to each particle throughout its life
             * @type {number|Array<number>}
             */
            curl: [0.01, 0.08],

            /**
             * The intensity of the curl over 1 second. Lower values result in less curling.
             * @type {number|Array<number>}
             */
            curlIntensity: 0.013,
            
            /**
             * The range of curl variance applied to the particle
             * @type {number|Array<number>}
             */
            curlVariance: 0.53,
        }, url);
        this.merge(overrides);
        this.name = 'smokeParticle';
    }

    static getInstance() {
        return new SmokeParticle();
    }

   get shape() {
    if (!this.#particleShape) {
        const shape = new MemShape();
        shape.inherit(super.shape);
        shape.set('curl',       'Float32');
        shape.set('curlVar',    'Float32');
        this.#particleShape = shape;
        this.#particleShape.build();
    }
    return this.#particleShape;
  }

    /**
     * Called when a particle is spawned to initialize its settings
     * @param {number} time - The current world time in milliseconds
     * @param {Object} config - The particle's configuration
     * @returns {Object} An object containing `life` and `vel`, the lifeSpan and initial veloctiy of the particle
     */
    spawn(time, config, heap) {
        super.spawn(time, config, heap);

        // assign the heap segment BEFORE any operations
        this.shape.segment = heap;

        this.shape.curl = $Math.getRangeValue(this.curl);                              // 16-bit float
        this.shape.curlVar = Util.selectRandomOf(-this.curlVariance, this.curlVariance);    // 16-bit float
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
    update(time, deltaTime, heap, pos, vel, life) {
        super.update(time, deltaTime, heap, pos, vel, life);

        // assign the segment BEFORE any operations
        this.shape.segment = heap;

        // apply curl
        const factor = time / (this.curlIntensity * 1000);
        vel[0] += (this.shape.curl * Math.cos(factor) * this.shape.curlVar);
        vel[1] += this.shape.curl * Math.sin(factor);
    }
}