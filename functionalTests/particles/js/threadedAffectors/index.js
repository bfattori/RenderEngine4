import RenderEngine from '../../../../src/engine/renderEngine4.js';
import RasterRenderContext from '../../../../src/engine/rendering/contexts/RasterRenderContext.js';
import CanvasRenderer from '../../../../src/engine/rendering/renderers/CanvasRenderer.js';

import TileSheet from '../../../../src/engine/resources/loaders/TileSheet.js';

import GameObject from '../../../../src/engine/gameobject/GameObject.js';
import Transform2dPart from '../../../../src/engine/parts/transform/Transform2dPart.js';
import ParticleEmitterPart from '../../../../src/engine/parts/render/ParticleEmitterPart.js';
import SmokeParticle from '../../../../src/engine/particlesystem/types/SmokeParticle.js';
import SmokeEffect from '../../../../src/engine/particlesystem/effects/SmokeEffect.js';

import ParticleAffector from '../../../../src/engine/particlesystem/physics/ParticleAffector.js';

import { Matrix2d } from '../../../../src/engine/core/Matrix.js';

self.PARTICLE_ENGINE_OPTIONS = {
    maxParticles: 100000
};

self.PARTICLE_THREADING_OPTIONS = {
    workers: 2,
    framesPerSecond: 240
};

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
        },
        threading: {
            particles: true
        }
    },
    world: {
        renderContext: new RasterRenderContext(
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
    lifeSpan: [20000, 30000],
    tileSheet: tiles
});
sParticle.name = 'withTiles';

const sEffect = new SmokeEffect({
  count: 2,
  particleTypes: [sParticle],
  angle: 0
});
sEffect.name = 'withTiles';

const sParticle2 = new SmokeParticle({
    lifeSpan: [20000, 30000]
});
sParticle2.name = 'points';

const sEffect2 = new SmokeEffect({
  count: 2,
  particleTypes: [sParticle2],
  angle: 0,
  spread: 30
});
sEffect2.name = 'points';

// particle repulsor affectors
const repulsor = new ParticleAffector({
    radius: 100,
    pos: [200, 300],
    restitution: 0.1
});

const repulsor2 = new ParticleAffector({
    radius: 200,
    pos: [500, 80],
    restitution: 0.1
});

const repulsor3 = new ParticleAffector({
     radius: 80,
     pos: [380, 200],
     restitution: 0.3
});
repulsor3.name = "r3";


RenderEngine.particleEngine.addAffectors(repulsor, repulsor2, repulsor3);
RenderEngine.particleEngine.addParticleTypes(sParticle, sParticle2);
RenderEngine.particleEngine.addEffects(sEffect, sEffect2);

// initialize the particle engine 
RenderEngine.particleEngine.initialize();

// smoker using bitmaps (tiles)
const smoker = new GameObject();
smoker
    .addComponentParts(new Transform2dPart("transform"), new ParticleEmitterPart("emitter"));

const sT1 = smoker.getComponentByName("transform");
sT1.position = [190, 600];

// add the smoker to the world
RenderEngine.world.addObject(smoker);

// assign the smoke effect to the emitter
const smokeEmitter = smoker.getComponentByName("emitter")
smokeEmitter.effect = sEffect;

// smoker using diffuse particles
const smoker2 = new GameObject();
smoker2
    .addComponentParts(new Transform2dPart("transform"), new ParticleEmitterPart("emitter"));

const sT2 = smoker2.getComponentByName("transform");
sT2.position = [530, 600];

// add the smoker to the world
RenderEngine.world.addObject(smoker2);

// assign the smoke effect to the emitter
const smokeEmitter2 = smoker2.getComponentByName("emitter")
smokeEmitter2.effect = sEffect2;

smokeEmitter.enable();
smokeEmitter2.enable();

RenderEngine.hooks.onUpdate = (time, deltaTime) => {
    repulsor3.pos = [Math.floor(380 + (400 * Math.sin(time * 0.001))), 270];
}


// Start the render loop   
RenderEngine.start();

