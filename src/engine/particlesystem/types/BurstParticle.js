import BasicParticle from './BasicParticle.js';

export default class BurstParticle extends BasicParticle {
    constructor(opts = {}, url = import.meta.url) {
        super({
            colors: ['#ff8', '#ff0', '#fff', '#888', '#f00', '#f90'],
            lifeSpan: [1000, 1500],
            drag: [0.8, 1.1],
            dragRate: 0,
            particleSize: [3, 5],
            sizeDecay: 0.9,
            velocity: [1.3, 2.8]
        }, url);
        this.merge(opts);
        this.name = 'burstParticle';
    }

    static getInstance() {
        return new BurstParticle();
    }
}