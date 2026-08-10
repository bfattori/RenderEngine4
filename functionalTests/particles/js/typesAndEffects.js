import RenderEngine from '../../../src/engine/renderEngine4.js';
import VectorRenderContext from '../../../src/engine/rendering/contexts/VectorRenderContext.js';
import CanvasRenderer from '../../../src/engine/rendering/renderers/CanvasRenderer.js';

import GameObject from '../../../src/engine/gameobject/GameObject.js';
import Transform2dPart from '../../../src/engine/parts/transform/Transform2dPart.js';
import VectorRendererPart from '../../../src/engine/parts/render/VectorRendererPart.js';

import ParticleEmitterPart from '../../../src/engine/parts/render/ParticleEmitterPart.js';
import BurstEffect from '../../../src/engine/particlesystem/effects/BurstEffect.js';
import FountainEffect from '../../../src/engine/particlesystem/effects/FountainEffect.js';
import BurstParticle from '../../../src/engine/particlesystem/types/BurstParticle.js';
import WaterParticle from '../../../src/engine/particlesystem/types/WaterParticle.js';

import { Matrix2d } from '../../../src/engine/core/Matrix.js';
import $Math from '../../../src/engine/core/Math.js';

// create a double-buffered canvas renderer
await RenderEngine.init({
    flags: {
        debugMode: true,
        showFps: true,
        debugOpts: {
            objectOrigins: false,
            showParticleWorkersPiP: true,
            showParticleEngineLoad: true
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
    },
    particleEngine: {
        maxParticles: 200000,
        circularBuffer: true
    },
    threading: {
        particleEngine: {
            enabled: true,
            workers: 2
        }
    }
});

// set up the explosion effect
const eParticle = new BurstParticle();
const wParticle = new WaterParticle({
    gravity: [0.0, 0.005],
    lifeSpan: [2000, 4000]
});

const pEffect = new BurstEffect({
    count: 180,
    particleTypes: [eParticle]
});

const wEffect1 = new FountainEffect({
    count: 5,
    particleTypes: [wParticle],
    angle: 20,
    spread: 5
});

const wEffect2 = new FountainEffect({
    count: 5,
    particleTypes: [wParticle],
    angle: -20,
    spread: 5
});

// we're using the same effect with different configurations
// assigning a name will differentiate them to the particle engine
wEffect1.$name = 'fountain1';
wEffect2.$name = 'fountain2';

// add the explosion perticle and effect to the particle engine
RenderEngine.particleEngine.addParticleTypes(eParticle, wParticle);
RenderEngine.particleEngine.addEffects(pEffect, wEffect1, wEffect2);

// Object used to position the explosions
// - set world position, rotation, and scale
const explosionObject = new GameObject();
explosionObject
    .addComponentParts(new Transform2dPart("transform"), new ParticleEmitterPart("emitter"))
    .worldTransform = Matrix2d.identity().update({
        position: [400, 300],
        rotation: 0,
        scale: [1, 1]
    });

// add the object to the world - before making any modifications to it
RenderEngine.world.addObject(explosionObject);

// configure the emitter to use the explosion effect
const explosionEmitter = explosionObject.getComponentByName("emitter");
explosionEmitter.effect = pEffect;

// generate an explosion randomly
function explode() {
    explosionObject.worldTransform.setTo({
        position: [$Math.randomRange(10, 790, true), $Math.randomRange(5, 300, true)]
    });
    explosionEmitter.emit();
    setTimeout(explode, $Math.randomRange(100, 1000, true));
}

// Fountains -------------------------------

// game object and component parts used for the fountains
// - set world position, rotation, and scale
const fountain1 = new GameObject();
fountain1
    .addComponentParts(new Transform2dPart("transform"), new ParticleEmitterPart("emitter"))
    .worldTransform = Matrix2d.identity().update({
        position: [5, 500],
        rotation: 0,
        scale: [1, 1]
    });

const fountain2 = new GameObject();
fountain2
    .addComponentParts(new Transform2dPart("transform"), new ParticleEmitterPart("emitter"))
    .worldTransform = Matrix2d.identity().update({
        position: [795, 500],
        rotation: 0,
        scale: [1, 1]
    });

// add the object to the world - before making any modifications to it
RenderEngine.world.addObject(fountain1);
RenderEngine.world.addObject(fountain2);

// configure the emitter to use the explosion effect
fountain1.getComponentByName("emitter").effect = wEffect1;
fountain2.getComponentByName("emitter").effect = wEffect2;

// start the explosions and fountains
explode();

RenderEngine.hooks.onBeforeFrame = () => {
    fountain1.getComponentByName("emitter").emit();
    fountain2.getComponentByName("emitter").emit();
};

// Start the render loop   
RenderEngine.start();

