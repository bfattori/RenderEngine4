import { ParticleConfig } from '../core/Config.js';

export default class Particle {
  #dead = false;
    #position = null;
    #velocity = null;
    #options = new ParticleConfig();

    /**
     * 
     * @param {Array<number>} param0 - X and Y position of particle 
     * @param {Array<number>} param1 - X and Y velocity vector 
     * @param {ParticleConfig} options - Particle configuration options
     */
    constructor([x, y], [vX, vY], options = {}) {
        this.#options.merge(options);
        this.initPos([x, y]);
        this.initVel([vX, vY]);
        this.dead = false;
    }

    /**
     * Initialize the position of the particle
     * @param {UInt16Array<number>} param0 - [x, y] position of particle spawn 
     */
    initPos([x, y]) {
        this.#position = new Int16Array(2);
        this.#position[0] = x;
        this.#position[1] = y;
    }

    /**
     * Initialize the velocity of the particle
     * @param {Array<any>} param0 - [X, Y] velocity of the particle 
     */
    initVel([vX, vY]) {}

    set position([x, y]) {
        this.#position[0] = x;
        this.#position[1] = y;
    }

    /**
     * Return the initial position of the particle
     * @return {Uint16Array<number>|Uint32Array<number>} position of the particle 
     */
    get position() {
        return this.#position;
    }

    /**
     * Set the velocity of the particle
     * @param {Array<number>} vel - The particle velocity vector
     */
    set velocity(vel) {
        this.#velocity[0] = vel[0];
        this.#velocity[1] = vel[1];
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
        return this.#options.lifeSpan;
    }

    /**
     * Set the lifespan of the particle
     * @param {number} span - The lifespan in milliseconds
     */
    set lifeSpan(span) {
        this.#options.lifeSpan = span;
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
    update(time, deltaTime) {}
}

/**
 * Low precision particles have a 16-bit position and 8-bit velocity vectors
 */
class ParticleLP extends Particle {
    /**
     * Initialize the velocity vector
     * @param {number[]} vel - The velocity vector 
     */
    initVel([vX, vY]) {
        this.velocity = new Int8Array(2);
        this.velocity[0] = vX;
        this.velocity[1] = vY;
    }
}

/**
 * Medium precision particles have 16-bit position and velocity vectors.
 */
class ParticleMP extends Particle {

    /**
     * Initialize the velocity vector
     * @param {number[]} vel - The velocity vector 
     */
    initVel([vX, vY]) {
        this.velocity = new Int16Array(2);
        this.velocity[0] = vX;
        this.velocity[1] = vY;
    }
}

/**
 * High precision particles have 32-bit position and velocity vectors
 */
class ParticleHP extends Particle {
    /**
     * Initialize the position of the particle
     * @param {UInt16Array<number>} param0 - [x, y] position of particle spawn 
     */
    initPos([x, y]) {
        this.position = new Int32Array(2);
        this.position[0] = x;
        this.position[1] = y;
    }

    /**
     * Initialize the velocity vector
     * @param {number[]} vel - The velocity vector 
     */
    initVel([vX, vY]) {
        this.velocity = new Int32Array(2);
        this.velocity[0] = vX;
        this.velocity[1] = vY;
    }
} 

export {
    ParticleLP,
    ParticleMP,
    ParticleHP
};