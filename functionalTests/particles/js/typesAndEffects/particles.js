import BasicParticle from '../../../../src/engine/particlesystem/types/BasicParticle.js';
import BurstParticle from '../../../../src/engine/particlesystem/types/BurstParticle.js';
import WaterParticle from '../../../../src/engine/particlesystem/types/WaterParticle.js';
import SparkParticle from '../../../../src/engine/particlesystem/types/SparkParticle.js';
import TrailParticle from '../../../../src/engine/particlesystem/types/TrailParticle.js';

// configure particles
const eParticle = new BurstParticle();
const eParticle2 = new BurstParticle({
    colors: ['#cca3cc','#d663d6','#ffeaff','#ffd0ff']
});
eParticle2.name = 'purples';

const eParticle3 = new BurstParticle({
    colors: ['#9cf8f4','#fbffc0','#eff3ff','#d1fffb'],
    particleSize: [1, 1.8],
    dragRate: 0.003,
    lifeSpan: [1000, 4000],
    velocity: [0.3, 0.86],
    gravity: [0.0, 0.07]
});
eParticle3.name = 'blues';

const eParticle4 = new BurstParticle({
    colors: ['#e26b6b','#ff9a9a','#fdd17e','#ffc3c3'],
    lifeSpan: [3000, 5000]
});
eParticle4.name = 'reds';

const wParticle = new WaterParticle({
    colors: ['#fca258','#fcba58','#fcc858','#f9d86b','#fdff7e','#fd4444','#ff9c9c','#ffcdff','#efc9fd','#ffffff','#ffffc3',],
    velocity: [4, 8],
    lifeSpan: [6000, 8000]
});
wParticle.name = 'hotOrangeAndRed';

const sparkParticle = new SparkParticle({
    trailLength: 5
});
sparkParticle.name = 'sparky';

const chaff = new BasicParticle({
    colors: ['#9cf8f4','#fbffc0','#eff3ff','#d1fffb'],
    particleSize: [1, 2],
    dragRate: 0.003,
    lifeSpan: [3000, 5000],
    velocity: [0.0, 0.2],
    gravity: [0.0, 0.07]
});
chaff.name = 'chaff';

const trailParticle = new TrailParticle({
    colors: ['#c6b9ff','#98c8ff','#c07cff','#c7b8ff','#ffff00'],
    particleSize: 5,
    lifeSpan: [1000, 2000],
    softness: -1,
    drag: 1,
    dragRate: 0,
    sizeDecay: 0,
    gravity: [0.0, 0.08],
    velocity: [4, 4.8],
    trailQuantity: 3,
    trailParticle: chaff
});
trailParticle.name = 'trailParticle';

export {
  eParticle,
  eParticle2,
  eParticle3,
  eParticle4,
  wParticle,
  sparkParticle,
  trailParticle,
  chaff
};