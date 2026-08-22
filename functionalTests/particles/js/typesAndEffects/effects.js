import BurstEffect from '../../../../src/engine/particlesystem/effects/BurstEffect.js';
import FountainEffect from '../../../../src/engine/particlesystem/effects/FountainEffect.js';

import { eParticle, eParticle2, eParticle3, eParticle4, wParticle } from './particles.js';

// configure particle effects
const pEffect = new BurstEffect({
    count: 3000,
    particleTypes: [eParticle]
});

const pEffect2 = new BurstEffect({
    count: 1000,
    particleTypes: [eParticle2, eParticle3, eParticle4]
});
pEffect2.name = 'glittery';

const wEffect1 = new FountainEffect({
    count: 10,
    particleTypes: [wParticle],
    angle: 20,
    spread: 8
});

const wEffect2 = new FountainEffect({
    count: 10,
    particleTypes: [wParticle],
    angle: -20,
    spread: 8
});

// we're using the same effect with different configurations
// assigning a name will differentiate them to the particle engine
wEffect1.name = 'fountain1';
wEffect2.name = 'fountain2';

export {
  pEffect,
  pEffect2,
  wEffect1,
  wEffect2
};
