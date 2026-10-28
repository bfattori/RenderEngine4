import Particle from './Particle.js';
import BasicParticle from './BasicParticle.js';
import PhysicalParticle from './PhysicalParticle.js';
import $Math from '../../core/Math.js';
import Util from '../../core/Util.js';
import DiffuseParticle from './DiffuseParticle.js';

/**
 * @class SmokeParticle
 * @classdesc The SmokeParticle class is a specialized particle type that extends the PhysicalParticle class. It defines specific properties 
 * for particles that simulate smoke, including color options, lifespan, drag, size, velocity, growth, gravity, and curl. The class provides 
 * methods to initialize the particle, update its state over time, and apply curling effects to simulate the behavior of smoke in a realistic manner.
 * @extends PhysicalParticle
 */
export default class SmokeParticle extends PhysicalParticle {
    static sizeOf = 12;
    static byteOffset = 66;

    static OFFSETS = {
        CURL: SmokeParticle.byteOffset + 0,
        CURL_VAR: SmokeParticle.byteOffset + 4
    }

    constructor(overrides = {}, url = import.meta.url) {
        super({
            colors: ['#35352c52','#6868513b','#87878557','#9191912f','#4e242494','#5c4b3869','#793e3e6b'],
            lifeSpan: [10000, 12000],
            drag: 0,
            dragRate: 0,
            particleSize: [10, 16],
            velocity: 0.008,
            gravity: [0.0, -0.004],
            softness: 0.9,

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

    get memoryRequirement() {
        return Particle.sizeOf + BasicParticle.sizeOf + DiffuseParticle.sizeOf + SmokeParticle.sizeOf;
    }

    /**
     * Called when a particle is spawned to initialize its settings
     * @param {Array<number>} worldPos - The spawn position for the particle
     * @param {number} time - The current world time in milliseconds
     * @param {Spark} memSegment - The particle's instantaneous memory
     * @returns {Object} An object containing `life` and `vel`, the lifeSpan and initial veloctiy of the particle
     */
    spawn(worldPos, time, memSegment) {
        super.spawn(worldPos, time, memSegment);

        memSegment.setFloat32(SmokeParticle.OFFSETS.CURL, $Math.getRangeValue(this.curl));
        memSegment.setFloat32(SmokeParticle.OFFSETS.CURL_VAR, Util.selectRandomOf(-this.curlVariance, this.curlVariance));
    }

    /**
     * Update the particle
     * @param {number} time - Current world time in milliseconds
     * @param {number} deltaTime - Time since last frame was rendered in milliseconds.
     * @param {Spark} memSegment - The memory object containing the particle's instantaneous properties
     * @param {number} life - Remaining life of the particle
     * @type {Function}
     */
    update(time, deltaTime, memSegment, life) {
        super.update(time, deltaTime, memSegment, life);

        const vel = memSegment.getVecF32(Particle.OFFSETS.VELOCITY);
        const curl = memSegment.getFloat32(SmokeParticle.OFFSETS.CURL);
        const curlVar = memSegment.getFloat32(SmokeParticle.OFFSETS.CURL_VAR);

        // apply curl
        const factor = time / (this.curlIntensity * 1000);
        vel[0] += (curl * Math.cos(factor) * curlVar);
        vel[1] += curl * Math.sin(factor);

        memSegment.setVecF32(Particle.OFFSETS.VELOCITY, vel);
    }
}