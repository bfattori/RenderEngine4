import BasicParticle from './BasicParticle.js';

/**
 * `PhysicalParticle` is the base class for particles that interact with the game through `ParticleColliders` and `ParticleRepulsors`, providing visual response
 * to objects in the game world. The particle inherits from `BasicParticle` for most configuration, but adds `restitution` and `friction` which are evaluated
 * during the `affect()` method, unique to `PhysicalParticles`. Use physical particle effects with caution as they will impose additional overhead during
 * particle calculation.
 * 
 * @param {Object} opts - Configuration options for the particle
 * @param {String} url - The module's Url
 */
export default class PhysicalParticle extends BasicParticle {
    constructor(opts = {}, url = import.meta.url) {
        super({
            /**
             * Restitution (bounciness) is the coefficient of restitution, which is a measure of how much an object bounces back after colliding with another object.
             * A higher value means that the object will bounce back more strongly. The default value is 0.0, which means that the object will not bounce back at all.
             * Restitution is applied when a particle encounters a `ParticleCollider` to determine a particles reflect or stick.
             * @type {number}
             */
            restitution: 0.0,

            /**
             * Friction is the force that opposes motion between two objects in contact. It is a measure of how much resistance an object has to moving through a medium.
             * A higher value means that the object will have more friction and be harder to move through a medium. The default value is 0.0, which means that the object 
             * will not have any friction. Friction is applied when a particle encounters a `ParticleRepulsor` to determine how much the replusor field impacts the
             * particle.
             * @type {number}
             */
            friction: 0.0,

            /**
             * If set to `true`, the particle's life is set to 0, rendering it effectivle dead, so the particle can be cleaned up.
             * @type {boolean}
             */
            deadOnImpact: false
        }, url);
        this.merge(opts);
    }


    static getInstance() {
        return new PhysicalParticle();
    }

    /**
     * Called when a particle is spawned to initialize its settings
     * @param {number} time - The current world time in milliseconds
     * @param {Object} config - The particle's configuration
     * @returns {Object} An object containing `life` and `vel`, the lifeSpan and initial veloctiy of the particle
     */
    spawn(pEngine, time, config) {
        const particle = super.spawn(pEngine, time, config);
        particle.$$affected = true;
        particle.restitution = this.restitution;
        particle.friction = this.friction;
        particle.kill = this.deadOnImpact;
        return particle;
    }
}