import Constants from '../Constants.js';
import { FixedPointMath as FMath } from '../core/Math.js';
import { ParticleConfig } from '../core/Config.js';

export default class Particle {
  #dead = false;
    #position = null;
    #velocity = null;
    #options = new ParticleConfig();
    #lifeSpan = 0;

    /**
     * 
     * @param {Array<number>} param0 - X and Y position of particle 
     * @param {Array<number>} param1 - X and Y velocity vector 
     * @param {ParticleConfig} options - Particle configuration options
     */
    constructor([x, y], [vX, vY], options = {}) {
        this.#options.merge(options);
        this.position = [x, y];
        this.velocity = [vX, vY];
        this.lifeSpan = this.config.lifeSpan;
    }

    /**
     * Initialize the position of the particle
     * @param {UInt16Array<number>} param0 - [x, y] position of particle spawn 
     */
    set position([x, y]) {
        this.#position[0] = FMath.toFixed(x, Constants.FP_LOW);
        this.#position[1] = FMath.toFixed(y, Constants.FP_LOW);
    }

    /**
     * Initialize the velocity of the particle
     * @param {Array<any>} param0 - [X, Y] velocity of the particle 
     */
    set velocity([vX, vY]) {
        this.#velocity[0] = FMath.toFixed(vX, Constants.FP_LOW);
        this.#velocity[1] = FMath.toFixed(vY, Constants.FP_LOW);
    }

    /**
     * Return the initial position of the particle
     * @return {Uint16Array<number>|Uint32Array<number>} position of the particle 
     */
    get position() {
        return this.#position;
    }

    /**
     * Return ths initial velocity of the particle
     * @return {Uint8Array<number>|Uint16Array<number>|Uint32Array<number>} velocity of the particle 
     */
    get velocity() {
        return this.#velocity;
    }

    /**
     * Return the lifespan of the particle
     * @returns {number} Lifespan in milliseconds
     */
    get lifeSpan() {
        return this.#lifeSpan;
    }

    /**
     * Set the lifespan of the particle
     * @param {number} span - The lifespan in milliseconds
     */
    set lifeSpan(span) {
        this.lifeSpan = span;
    }

    /**
     * Get the particle configuration
     */
    get config() {
        return this.#options;
    }

    /**
     * Update the particle
     * @param {number} time - The current world time 
     * @param {number} deltaTime - The time since the last frame
     */
    render(renderer, [x, y], time, deltaTime) {
        if (this.options.render) {
            this.options.render(renderer, [x, y], time, deltaTime);
        } else {
            renderer.render(`POINT `)    
        }
    }
}

/**
 * Medium precision particles have 16-bit position and velocity vectors.
 */
class ParticleMP extends Particle {
    /**
     * Set the position of the particle
     * @param {UInt16Array<number>} param0 - [x, y] position of particle spawn 
     */
    set position([x, y]) {
        super.position = [
            FMath.toFixed(x, Constants.FP_MEDIUM),
            FMath.toFixed(y, Constants.FP_MEDIUM) 
        ];
    }

    /**
     * Set the velocity of the particle
     * @param {Array<any>} param0 - [X, Y] velocity of the particle 
     */
    set velocity([vX, vY]) {
        super.velocity = [ 
            FMath.toFixed(vX, Constants.FP_MEDIUM),
            FMath.toFixed(vY, Constants.FP_MEDIUM)
        ];
    }
}

/**
 * High precision particles have 32-bit position and velocity vectors
 */
class ParticleHP extends Particle {
    /**
     * Set the position of the particle
     * @param {UInt16Array<number>} param0 - [x, y] position of particle spawn 
     */
    set position([x, y]) {
        super.position = [
            FMath.toFixed(x, Constants.FP_HIGH),
            FMath.toFixed(y, Constants.FP_HIGH) 
        ];
    }

    /**
     * Set the velocity of the particle
     * @param {Array<any>} param0 - [X, Y] velocity of the particle 
     */
    set velocity([vX, vY]) {
        super.velocity = [ 
            FMath.toFixed(vX, Constants.FP_HIGH),
            FMath.toFixed(vY, Constants.FP_HIGH)
        ];
    }
} 

export {
    ParticleMP,
    ParticleHP
};