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
    },
    particleEngine: {
        affectorDensity: 2,
        affectorCellSize: 10
    }
});

const tiles = new TileSheet('smoke', '../../../assets/smoke_sprites.json');
await tiles.loading();

const sParticle = new SmokeParticle({
    tileSheet: tiles
});
sParticle.name = 'withTiles';

const sEffect = new SmokeEffect({
  count: 2,
  particleTypes: [sParticle],
  angle: 0
});
sEffect.name = 'withTiles';

const sParticle2 = new SmokeParticle();
sParticle2.name = 'points';

const sEffect2 = new SmokeEffect({
  count: 2,
  particleTypes: [sParticle2],
  angle: 0
});
sEffect2.name = 'points';

// particle repulsor affectors
const repulsor = new ParticleAffector({
    radius: 100,
    pos: [160, 400],
    restitution: 0.1
});

const repulsor2 = new ParticleAffector({
     radius: 200,
     pos: [500, 80],
     restitution: 0.1
});

const repulsor3 = new ParticleAffector({
     radius: 80,
     pos: [400, 300],
     restitution: 0.4
});


RenderEngine.particleEngine.addAffectors(repulsor, repulsor2, repulsor3);
RenderEngine.particleEngine.addParticleTypes(sParticle, sParticle2);
RenderEngine.particleEngine.addEffects(sEffect, sEffect2);

// initialize the particle engine 
RenderEngine.particleEngine.initialize();

// smoker using bitmaps (tiles)
const smoker = new GameObject();
smoker
    .addComponentParts(new Transform2dPart("transform"), new ParticleEmitterPart("emitter"))
    .worldTransform = Matrix2d.identity().update({
        position: [200, 600],
        rotation: 0,
        scale: [1, 1]
    });

// add the smoker to the world
RenderEngine.world.addObject(smoker);

// assign the smoke effect to the emitter
const smokeEmitter = smoker.getComponentByName("emitter")
smokeEmitter.effect = sEffect;

// smoker using diffuse particles
const smoker2 = new GameObject();
smoker2
    .addComponentParts(new Transform2dPart("transform"), new ParticleEmitterPart("emitter"))
    .worldTransform = Matrix2d.identity().update({
        position: [600, 600],
        rotation: 0,
        scale: [1, 1]
    });

// add the smoker to the world
RenderEngine.world.addObject(smoker2);

// assign the smoke effect to the emitter
const smokeEmitter2 = smoker2.getComponentByName("emitter")
smokeEmitter2.effect = sEffect2;

smokeEmitter.enable();
smokeEmitter2.enable();

// Start the render loop   
RenderEngine.start();

