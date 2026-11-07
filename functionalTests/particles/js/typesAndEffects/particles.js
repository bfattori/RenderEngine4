import BasicParticle from '../../../../src/engine/particlesystem/types/BasicParticle.js';
import SparkParticle from '../../../../src/engine/particlesystem/types/SparkParticle.js';
import TrailParticle from '../../../../src/engine/particlesystem/types/TrailParticle.js';
import SmokeParticle from '../../../../src/engine/particlesystem/types/SmokeParticle.js';

// Load configurations for bursts and water
import burstConfig from '../../../assets/particleConfig/burst.json' with { type: 'json' };
import waterConfig from '../../../assets/particleConfig/water.json' with { type: 'json' };

// configure particles
const eParticle = new BasicParticle(burstConfig);

const burstPurple = {
    ...burstConfig,
    ...{
        colors: ['#cca3cc','#d663d6','#ffeaff','#ffd0ff']
    }
};
const eParticle2 = new BasicParticle(burstPurple);
eParticle2.name = 'purples';

const burstBlue = { 
    ...burstConfig,
    ...{
        colors: ['#9cf8f4','#fbffc0','#eff3ff','#d1fffb'],
        particleSize: [1, 1.8],
        dragRate: 0.003,
        lifeSpan: [1000, 4000],
        velocity: [0.3, 0.86],
        gravity: [0.0, 0.07]
    }
}

const eParticle3 = new BasicParticle(burstBlue);
eParticle3.name = 'blues';


const burstRed = {
    ...burstConfig,
    ...{
        colors: ['#e26b6b','#ff9a9a','#fdd17e','#ffc3c3'],
        lifeSpan: [3000, 5000]
    }
};
const eParticle4 = new BasicParticle(burstRed);
eParticle4.name = 'reds';

const waterColors = {
    ...waterConfig,
    ...{
        velocity: [4, 8],
        lifeSpan: [6000, 8000],
        sizeDecay: 0
    }
};
const wParticle = new BasicParticle(waterColors);
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

const smokeParticle = new SmokeParticle({
    lifeSpan: [8000, 10000]
});

export {
  eParticle,
  eParticle2,
  eParticle3,
  eParticle4,
  wParticle,
  sparkParticle,
  trailParticle,
  smokeParticle,
  chaff
};