import ParticleEffect from './ParticleEffect.js';
import Particle from '../Particle.js';

export default class Explosion extends ParticleEffect {
    #decayRate = 0;
    #decayVariance = 0;

    constructor(origin) {
        super(origin);
        this.decayRate = Math.random() * 0.09;
        this.particle(ExplosionParticle);
    }

    set decay(decayRate) {
        this.#decayRate = decayRate;
    }
    
    set decayVariance(variance) {
       this.#decayVariance = variance;
    }

    modifyParticle(particle, time, deltaTime) {
        super(particle, time, deltaTime);
        particle.decay = (this.#decayRate * (this.#decayVariance !== 0 ? Math.random() * this.#decayVariance : 1));
    }
}

class ExplosionParticle extends Particle {
    constructor(position, velocity, options = { angle: Math.floor(Math.random() * 360) }) {
        super(position, velocity, options);
    }
}

export {
    ExplosionParticle
};