import RenderEngine from '../../../../src/engine/renderEngine4.js';
import VectorRenderContext from '../../../../src/engine/rendering/contexts/VectorRenderContext.js';
import CanvasRenderer from '../../../../src/engine/rendering/renderers/CanvasRenderer.js';

import GameObject from '../../../../src/engine/gameobject/GameObject.js';
import Transform2dPart from '../../../../src/engine/parts/transform/Transform2dPart.js';

import ParticleEmitterPart from '../../../../src/engine/parts/render/ParticleEmitterPart.js';

import { Matrix2d } from '../../../../src/engine/core/Matrix.js';
import $Math from '../../../../src/engine/core/Math.js';
import Util from '../../../../src/engine/core/Util.js';

import { pEffect, pEffect2, wEffect1, wEffect2, wEffect3 } from './effects.js';
import { eParticle, eParticle2, eParticle3, eParticle4, wParticle, wParticle2 } from './particles.js';

self.PARTICLE_ENGINE_OPTIONS = {
    maxParticles: 45000
};

self.PARTICLE_THREADING_OPTIONS = {
    workers: 2,
    framesPerSecond: 120
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

// add blue background
document.getElementById("context").classList.add("types-and-effects");

RenderEngine.particleEngine.addParticleTypes(eParticle, eParticle2, eParticle3, eParticle4, wParticle, wParticle2);
RenderEngine.particleEngine.addEffects(pEffect, pEffect2, wEffect1, wEffect2, wEffect3);

// let the threaded particle engine know when
// the effects and particles have been sent
RenderEngine.particleEngine.initialize();

//-----------------------------------
// burst effect 

// explosion object
const explosionObject = new GameObject();
explosionObject
    .addComponentParts(new Transform2dPart("transform"), new ParticleEmitterPart("emitter"));

const eT = explosionObject.getComponentByName("transform");

RenderEngine.world.addObject(explosionObject);

// it's always the same emitter used for every effect
const explosionEmitter = explosionObject.getComponentByName("emitter");

// generate an explosion randomly every 80 to 200 milliseconds
function explode() {
    eT.position = [$Math.randomRange(10, 790, true), $Math.randomRange(5, 300, true)];

    // choose a random effect
    explosionEmitter.effect = Util.selectRandom(pEffect, pEffect2);
    explosionEmitter.reset().enable();
    setTimeout(explode, $Math.randomRange(80, 200, true));
}

//----------------------------------
// fountain effect

// fountain objects
const fountain1 = new GameObject();
fountain1
    .addComponentParts(new Transform2dPart("transform"), new ParticleEmitterPart("emitter"));
const fT1 = fountain1.getComponentByName("transform");
fT1.position = [5, 580];

const fountain2 = new GameObject();
fountain2
    .addComponentParts(new Transform2dPart("transform"), new ParticleEmitterPart("emitter"));
const fT2 = fountain2.getComponentByName("transform");
fT2.position = [795, 580];

const sparkler = new GameObject();
sparkler
    .addComponentParts(new Transform2dPart("transform"), new ParticleEmitterPart("emitter"));
const spkT = sparkler.getComponentByName("transform");
spkT.position = [400, 590];

RenderEngine.world.addObjects(fountain1, fountain2, sparkler);

const emitter1 = fountain1.getComponentByName("emitter");
const emitter2 = fountain2.getComponentByName("emitter");
const emitter3 = sparkler.getComponentByName("emitter");

// configure the emitters to use the fountain effect
emitter1.effect = wEffect1;
emitter2.effect = wEffect2;
emitter3.effect = wEffect3;


// start the particle effects
explode();

RenderEngine.hooks.onBeforeFrame = () => {
    emitter1.reset().enable();
    emitter2.reset().enable();
    emitter3.reset().enable();
};

// Start the render loop   
RenderEngine.start();

