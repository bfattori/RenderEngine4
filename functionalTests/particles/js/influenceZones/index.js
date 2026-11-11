import RenderEngine from '../../../../src/engine/renderEngine4.js';
import RenderContext from '../../../../src/engine/rendering/context/RenderContext.js';
import CanvasRenderer from '../../../../src/engine/rendering/renderers/CanvasRenderer.js';

import TileSheet from '../../../../src/engine/resources/loaders/TileSheet.js';

import GameObject from '../../../../src/engine/gameobject/GameObject.js';
import Transform2dPart from '../../../../src/engine/parts/transform/Transform2dPart.js';
import ParticleEmitterPart from '../../../../src/engine/parts/render/ParticleEmitterPart.js';
import SmokeParticle from '../../../../src/engine/particlesystem/types/SmokeParticle.js';
import SmokeEffect from '../../../../src/engine/particlesystem/effects/SmokeEffect.js';

import ParticleInfluencer from '../../../../src/engine/particlesystem/ParticleInfluencer.js';

// create a double-buffered canvas renderer
await RenderEngine.init(import.meta.url, {
    flags: {
        debugMode: true,
        showFps: true,
        debugOpts: {
            objectOrigins: false,
            showParticleWorkersPiP: true,
            showParticleEngineLoad: true,
            showParticleAffectors: true
        }
    },
    world: {
        renderContext: new RenderContext(
            CanvasRenderer.build(
                document.getElementById("context"), 
                {
                    doubleBuffered: true,
                    useCompiler: true
                }
            ),
            { 
                enableCulling: false
             }
        ),
        dimensions: {width: 800, height: 600},
        viewport: {left: 0, top: 0, width: 800, height: 600}
    }
});

const tiles = new TileSheet('smoke', '../../../assets/smoke_sprites.json');
await tiles.loading();

const sParticle = new SmokeParticle({
    tileSheet: tiles
});
sParticle.name = 'withTiles';

const sEffect = new SmokeEffect({
  count: 1,
  particleTypes: [sParticle],
  angle: 0
});
sEffect.name = 'withTiles';

const sParticle2 = new SmokeParticle({
  velocity: 0.8,
  sizeDecay: 0.01,
  proportionalSize: false,
  gravity: [0.0, -0.004]
});
sParticle2.name = 'points';

const sEffect2 = new SmokeEffect({
  count: 1,
  particleTypes: [sParticle2],
  angle: 0
});
sEffect2.name = 'points';

// particle repulsor affectors
const repulsor = new ParticleInfluencer({
    radius: 100,
    pos: [200, 300],
    restitution: 0.1
});

const repulsor2 = new ParticleInfluencer({
    radius: 200,
    pos: [500, 80],
    restitution: 0.1
});

const repulsor3 = new ParticleInfluencer({
     radius: 80,
     pos: [380, 270],
     restitution: 0.8
});


RenderEngine.particleEngine.addInfluencers(repulsor, repulsor2, repulsor3);
RenderEngine.particleEngine.addParticleTypes(sParticle, sParticle2);
RenderEngine.particleEngine.addEffects(sEffect, sEffect2);

// initialize the particle engine 
await RenderEngine.particleEngine.initialize();

// smoker using bitmaps (tiles)
const smoker = new GameObject();
smoker
    .addComponentParts(
        new Transform2dPart("transform"), 
        new ParticleEmitterPart("emitter"));

const sT1 = smoker.getComponentByName("transform");
smoker.PARTS.transform.position = [190, 600];

// add the smoker to the world
RenderEngine.world.addObject(smoker);

// assign the smoke effect to the emitter
const smokeEmitter = smoker.PARTS.emitter;
smokeEmitter.effect = sEffect;

// smoker using diffuse particles
const smoker2 = new GameObject();
smoker2
    .addComponentParts(
        new Transform2dPart("transform"), 
        new ParticleEmitterPart("emitter"));

smoker2.PARTS.transform.position = [530, 600];

// add the smoker to the world
RenderEngine.world.addObject(smoker2);

// assign the smoke effect to the emitter
const smokeEmitter2 = smoker2.PARTS.emitter;
smokeEmitter2.effect = sEffect2;

smokeEmitter.enable();
smokeEmitter2.enable();

RenderEngine.hooks.onUpdate = (time, deltaTime) => {
    repulsor3.pos = [Math.floor(380 + (400 * Math.sin(time * 0.001))), 270];
}


// Start the render loop   
RenderEngine.start();

