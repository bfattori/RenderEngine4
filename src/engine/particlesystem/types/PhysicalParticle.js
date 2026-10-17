import DiffuseParticle from './DiffuseParticle.js';

/**
 * @class PhysicalParticle
 * @classdesc `PhysicalParticle` is the base class for particles that interact with the game through `ParticleAffectors`, providing visual response
 * to objects in the game world. The particle inherits from `BasicParticle` for most configuration, but adds `restitution` and `friction` which are evaluated
 * during the `affect()` method, unique to `PhysicalParticles`. Use physical particle effects with caution as they will impose additional overhead during
 * particle calculation.
 * 
 * @param {Object} overrides - Configuration options for the particle
 * @param {String} url - The module's Url
 */
export default class PhysicalParticle extends DiffuseParticle {
    constructor(overrides = {}, url = import.meta.url) {
        super({}, url);
        this.merge(overrides);
        this.name = 'physicalParticle';
    }


    static getInstance() {
        return new PhysicalParticle();
    }
}