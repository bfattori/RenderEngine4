import BasicParticle from './BasicParticle.js';

/**
 * @class BurstParticle
 * @classdesc The BurstParticle class is a simple particle type that extends the BasicParticle class. It defines specific properties 
 * for particles that are generated in a burst pattern, including color options, lifespan, drag, size, and velocity. The class provides 
 * methods to initialize the particle and update its state over time.
 */
export default class BurstParticle extends BasicParticle {
    constructor(overrides = {}, url = import.meta.url) {
        super({
            colors: ['#ff8', '#ff0', '#fff', '#888', '#f00', '#f90'],
            lifeSpan: [1000, 1500],
            drag: [0.8, 1.1],
            dragRate: 0,
            particleSize: [3, 5],
            sizeDecay: 0.9,
            velocity: [1.3, 2.8]
        }, url);
        this.merge(overrides);
        this.name = 'burstParticle';
    }

    static getInstance() {
        return new BurstParticle();
    }
}