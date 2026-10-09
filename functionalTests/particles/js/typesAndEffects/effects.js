import BurstEffect from '../../../../src/engine/particlesystem/effects/BurstEffect.js';
import FountainEffect from '../../../../src/engine/particlesystem/effects/FountainEffect.js';
import SparkEffect from '../../../../src/engine/particlesystem/effects/SparkEffect.js';

import { eParticle, eParticle2, eParticle3, eParticle4, wParticle, wParticle2, sparkParticle } from './particles.js';

// configure particle effects
const pEffect = new BurstEffect({
    count: 3000,
    particleTypes: [eParticle]
});

const pEffect2 = new BurstEffect({
    count: 1800,
    particleTypes: [eParticle2, eParticle3, eParticle4]
});
pEffect2.name = 'glittery';

const wEffect1 = new FountainEffect({
    count: 4,
    particleTypes: [wParticle],
    angle: 20,
    spread: 8
});

const wEffect2 = new FountainEffect({
    count: 4,
    particleTypes: [wParticle],
    angle: -20,
    spread: 8
});

const wEffect3 = new FountainEffect({
    count: 1,
    particleTypes: [wParticle2],
    angle: 0,
    spread: 45
});


// we're using the same effect with different configurations
// assigning a name will differentiate them to the particle engine
wEffect1.name = 'fountain1';
wEffect2.name = 'fountain2';
wEffect3.name = 'sparkler';


const sparkEffect = new SparkEffect({
    count: 5,
    countVariance: 20,
    frequencyVariance: 150,
    particleTypes: [sparkParticle],
    angle: 110
});
sparkEffect.name = 'sparks1';

const sparkEffect2 = new SparkEffect({
    count: 5,
    countVariance: 20,
    frequencyVariance: 150,
    particleTypes: [sparkParticle],
    angle: -110
});
sparkEffect2.name = 'sparks2';

export {
  pEffect,
  pEffect2,
  wEffect1,
  wEffect2,
  wEffect3,
  sparkEffect,
  sparkEffect2
};
