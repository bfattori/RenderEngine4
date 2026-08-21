import BasicParticle from './BasicParticle.js';

export default class BurstParticle extends BasicParticle {
    constructor(opts = {}, url = import.meta.url) {
        super({
            colors: ['#ff8', '#ff0', '#fff', '#888', '#f00', '#f90'],
            lifeSpan: [1000, 5000],
            drag: 1.2,
            dragRate: 0.01,
            particleSize: [3, 5],
            sizeDecay: 0.9,
            velocity: [0.82, 1.79]
        }, url);
        this.merge(opts);
        this.name = 'burstParticle';
    }

    static getInstance() {
        return new BurstParticle();
    }
}