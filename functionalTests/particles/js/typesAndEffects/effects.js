import BurstEffect from '../../../../src/engine/particlesystem/effects/BurstEffect.js';
import FountainEffect from '../../../../src/engine/particlesystem/effects/FountainEffect.js';
import SparkEffect from '../../../../src/engine/particlesystem/effects/SparkEffect.js';
import SmokeEffect from '../../../../src/engine/particlesystem/effects/SmokeEffect.js';

import { eParticle, eParticle2, eParticle3, eParticle4, wParticle, sparkParticle, trailParticle, smokeParticle } from './particles.js';

// configure particle effects
const pEffect = new BurstEffect({
    count: 1000,
    particleTypes: [eParticle]
});

const pEffect2 = new BurstEffect({
    count: 800,
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
    count: 3,
    emissionFrequency: 500,
    particleTypes: [trailParticle],
    angle: -20,
    spread: 8
});

// we're using the same effect with different configurations
// assigning a name will differentiate them to the particle engine
wEffect1.name = 'fountain1';
wEffect2.name = 'fountain2';

const sparkEffect = new SparkEffect({
    count: 12,
    countVariance: 8,
    frequencyVariance: 550,
    particleTypes: [sparkParticle],
    angle: 140,
    spread: 20,
    delay: [10, 80],
    delayVariance: 0
});
sparkEffect.name = 'sparks1';

const smokeEffect = new SmokeEffect({
  count: 4,
  particleTypes: [smokeParticle],
  angle: 0,
  spread: 30
});
smokeEffect.name = 'smokey';

export {
  pEffect,
  pEffect2,
  wEffect1,
  wEffect2,
  sparkEffect,
  smokeEffect
};
