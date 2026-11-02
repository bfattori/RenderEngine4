import RenderEngine from '../../../../src/engine/renderEngine4.js';
import VectorRenderContext from '../../../../src/engine/rendering/contexts/VectorRenderContext.js';
import CanvasRenderer from '../../../../src/engine/rendering/renderers/CanvasRenderer.js';

import GameObject from '../../../../src/engine/gameobject/GameObject.js';
import Transform2dPart from '../../../../src/engine/parts/transform/Transform2dPart.js';

import ParticleEmitterPart from '../../../../src/engine/parts/render/ParticleEmitterPart.js';

import $Math from '../../../../src/engine/core/Math.js';
import Util from '../../../../src/engine/core/Util.js';

import { pEffect, pEffect2, wEffect1, wEffect2, sparkEffect } from './effects.js';
import { eParticle, eParticle2, eParticle3, eParticle4, wParticle, sparkParticle, trailParticle, chaff } from './particles.js';

self.PARTICLE_ENGINE_OPTIONS = {
    maxParticles: 30000
};

self.PARTICLE_THREADING_OPTIONS = {
    workers: 4,
    framesPerSecond: 80
};

// create a double-buffered canvas renderer
await RenderEngine.init(import.meta.url, {
    flags: {
        debugMode: true,
        showFps: true,
        debugOpts: {
            objectOrigins: false,
            showParticleWorkersPiP: true,
            showParticleEngineLoad: true
        },
        threading: {
            particles: true
        }
    },
    world: {
        renderContext: new VectorRenderContext(
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

// set background to blue
document.getElementById("context").classList.add("types-and-effects");

//----------------------------------
// configure the particle engine

// add the particle types and effects
RenderEngine.particleEngine.addParticleTypes(eParticle, eParticle2, eParticle3, eParticle4, wParticle, sparkParticle, trailParticle, chaff);
RenderEngine.particleEngine.addEffects(pEffect, pEffect2, wEffect1, wEffect2, sparkEffect);

// initialize the particle engine
await RenderEngine.particleEngine.initialize();

//-----------------------------------
// burst effect 

const explosionObject = new GameObject();
explosionObject
    .addComponentParts(
        new Transform2dPart("transform"), 
        new ParticleEmitterPart("emitter"));

//----------------------------------
// fountain effects

const fountain1 = new GameObject();
fountain1
    .addComponentParts(
        new Transform2dPart("transform"), 
        new ParticleEmitterPart("emitter"));

const fountain2 = new GameObject();
fountain2
    .addComponentParts(
        new Transform2dPart("transform"), 
        new ParticleEmitterPart("emitter"));

//---------------------------------
// spark effects

const sparkObject = new GameObject();
sparkObject
    .addComponentParts(
        new Transform2dPart("transform"), 
        new ParticleEmitterPart("emitter"));

//----------------------------------       
// add the objects to the render engine world
RenderEngine.world.addObjects(explosionObject, fountain1, fountain2, sparkObject);

// set the positions of the various static objects in the world
fountain1.PARTS.transform.position = [5, 580];
fountain2.PARTS.transform.position = [795, 580];
sparkObject.PARTS.transform.position = [0, 25];

// configure fountain emitters and enable them to continuously emit particles
const emitter1 = fountain1.PARTS.emitter;
const emitter2 = fountain2.PARTS.emitter;

emitter1.effect = wEffect1;
emitter2.effect = wEffect2;

emitter1.enable();
emitter2.enable();

// configure spark emitters and enable them to continuously emit particles
const sparkEmitter = sparkObject.PARTS.emitter;
sparkEmitter.effect = sparkEffect;
sparkEmitter.enable();

// generate an explosion randomly every 80 to 200 milliseconds
function explode() {
    explosionObject.PARTS.transform.position = [$Math.randomRangeInt(10, 790), $Math.randomRangeInt(5, 300)];

    // choose a random effect
    explosionObject.PARTS.emitter.effect = Util.selectRandomOf(pEffect, pEffect2);
    explosionObject.PARTS.emitter.once();
    setTimeout(explode, $Math.randomRangeInt(80, 200));
}

// // start the first explosion
explode();

// Start the render loop   
RenderEngine.start();

