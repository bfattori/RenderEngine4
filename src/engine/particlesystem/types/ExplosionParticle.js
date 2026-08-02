import Particle from '../Particle.js';
import $Math from '../../core/Math.js';

export default class ExplosionParticle extends Particle {
    constructor() {
        super({
            colors: ['#ff8', '#ff0', '#fff', '#888', '#f00', '#f90'],
            lifeSpan: [3000, 5000],
            drag: 0.2
        })
    }

    static getInstance() {
        return new ExplosionParticle();
    }
}