import ParticleEffect from '../ParticleEffect.js';
import Config from '../../core/Config.js';

class FireworksConfig extends Config {
    constructor() {
        super({
            colorSets: {
                reds: ['#ae1313','#ff0000','#ff5a5a','#ffc3c3'],
                oranges: ['#c87128','#ff8800','#f6b071','#fdedd8'],
                yellows: ['#ffff00','#fdfd19','#ffff80','#ffffd4' ],
                greens: ['#12c812','#00ff00','#7aea1e','#d9fdd9'],
                blues: ['#0000ff','#6432f8','#678cff','#afd4ff'],
                purples: ['#390039','#b800b8','#fd52fd','#ffd0ff']
            },
            smoke: ['#35352c','#686851','#878785','#919191'],
            styles: {
                peony: {
                    lifeSpan: [3000, 5000],
                    drag: 0.2,
                    gravity: 0.0,
                    quantity: 200,
                    particleSize: 2.8
                },
                chrysanthemum: {
                    lifeSpan: [3000, 5000],
                    drag: 0.2,
                    gravity: 0.0,
                    trails: 0.9,
                    quantity: 500,
                    trailLife: 1000,
                    particleSize: 2.1                  
                },
                comet: {
                    bursts: [4, 8],
                    lifeSpan: [5000, 10000],
                    drag: 0.4,
                    gravity: 0.1,
                    trails: 0.3,
                    quantity: 6,
                    delay: 0,
                    trailLife: 1000,
                    particleSize: 3
                },
                palm: {
                    bursts: [2, 4],
                    lifeSpan: [2000, 6000],
                    drag: 0.6,
                    gravity: 0.4,
                    trails: 0.8,
                    quantity: 300,
                    delay: 250,
                    trailLife: 1500,
                    particleSize: 1.78
                },
                brocade: {
                    bursts: [1, 3],
                    lifeSpan: [2000, 5000],
                    drag: 0.1,
                    gravity: 0.48,
                    trails: 0.88,
                    quantity: 180,
                    delay: 80,
                    trailLife: 3000,
                    particleSize: 1.5
                },
                willow: {
                    lifeSpan: [5000, 10000],
                    drag: 0.08,
                    gravity: 0.98,
                    quantity: 1000,
                    trails: 0.999,
                    trailLife: 9000,
                    particleSize: 1
                },
                pistil: {
                    bursts: 2,
                    delay: 1000,
                    drag: 0.2,
                    gravity: 0.01,
                    quantity: 100,
                    trails: 0.8,
                    trailLife: 500,
                    particleSize: 1
                },
                tourbillion: {    
                },
                fish: {
                },
                strobe: {
                }
            }
        });
    }
}

export default class FireworksEffect extends ParticleEffect {
    #config = new FireworksConfig();
    #particleCount = 20;
    #particleCountVariance = 0;
    #frequency = 0;
    #frequencyVariance = 0;
    #lastTime = 0;
    #types = [];
    #engine = null;

    constructor(types, config = {}) {
        super(types);
        this.#config.merge(config);
    }

    static getInstance(types, config) {
        return new FireworksEffect(types, config);
    }

    /**
     * Run the particle effect, generating particles at the frequency, quantity, and variances specified
     * @param {number} time - The current world time in milliseconds
     * @param {number} deltaTime - The time since the last frame in milliseconds
     * @param {Array<number>} worldPos - [x, y] the world position where to emit particles
     */
    run(worldPos, time, deltaTime) {
        const freq = this.#frequency + $Math.randomRange(-this.#frequencyVariance, this.#frequencyVariance, true);
        if (time - this.#lastTime > freq) {
            this.generateParticles(worldPos, time, this.#types);
            this.#lastTime = time;
        }
    }

    /**
     * Generate particles for the effect.
     * @param worldPos {Array<number>} The world position where the particles are emitted from
     * @param time {Number} The current world time
     * @param deltaTime {Number} The time between the last world frame and current time
     */
    generateParticles(worldPos, time, types) {
        const count = this.#particleCount + $Math.randomRange(-this.#particleCountVariance, this.#particleCountVariance, true);
        for (let i = 0; i < count; i++) {
            const typeIdx = $Math.randomRange(0, types.length - 1, true);
            const type = types.at(typeIdx);
            this.#engine.spawnParticle(worldPos, time, type);
        }
    }


}