import BurstParticle from '../../../../src/engine/particlesystem/types/BurstParticle.js';
import WaterParticle from '../../../../src/engine/particlesystem/types/WaterParticle.js';
import SmokeParticle from '../../../../src/engine/particlesystem/types/SmokeParticle.js';

// configure particles
const eParticle = new BurstParticle();
const eParticle2 = new BurstParticle({
    colors: ['#390039','#b800b8','#fd52fd','#ffd0ff']
});
eParticle2.name = 'purples';

const eParticle3 = new BurstParticle({
    colors: ['#0000ff','#6432f8','#678cff','#afd4ff'],
    drag: 2.0,
    dragRate: 0.1,
    lifeSpan: [2000, 6000],
    velocity: [0.3, 0.9]
});
eParticle3.name = 'blues';

const eParticle4 = new BurstParticle({
    colors: ['#ae1313','#ff0000','#ff5a5a','#ffc3c3'],
    lifeSpan: [3000, 5000]
});
eParticle4.name = 'reds';

const wParticle = new WaterParticle({
    gravity: [0.0, 0.012],
    lifeSpan: [4000, 6000],
    velocity: [0.4, 0.45]
});

const sParticle = new SmokeParticle();

export {
  eParticle,
  eParticle2,
  eParticle3,
  eParticle4,
  wParticle,
  sParticle
};