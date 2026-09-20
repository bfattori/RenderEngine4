import BurstParticle from '../../../../src/engine/particlesystem/types/BurstParticle.js';
import WaterParticle from '../../../../src/engine/particlesystem/types/WaterParticle.js';

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
    lifeSpan: [6000, 8000]
});
wParticle.name = 'hotOrangeAndRed';

const wParticle2 = new WaterParticle({
    colors: ['#fae8d9','#f0cdcd','#ffffff','#ffffc3','#ffff00'],
    particleSize: 2,
    lifeSpan: [500, 1500]
});
wParticle2.name = 'hotYellows';


export {
  eParticle,
  eParticle2,
  eParticle3,
  eParticle4,
  wParticle,
  wParticle2
};