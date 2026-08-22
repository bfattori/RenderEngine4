import BasicParticle from './BasicParticle.js';

export default class WaterParticle extends BasicParticle {
    constructor(opts = {}, url = import.meta.url) {
        super({
            colors: ['rgb(4, 0, 255)', 'rgb(185, 180, 255)', '#4d4fdb', '#160e5f', 'rgb(118, 172, 216)', 'rgb(24, 208, 214)'],
            lifeSpan: [1000, 2000],
            drag: 0.8,
            dragRate: 0,
            particleSize: [5, 8],
            velocity: [0.4, 0.405],
            gravity: [0.0, 0.01],
            sizeDecay: 0.8,
        }, url);
        this.merge(opts);
        this.name = 'waterParticle';
    }

    static getInstance() {
        return new BurstParticle();
    }
}