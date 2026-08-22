import RenderEngine from '../../../../src/engine/renderEngine4.js';
import VectorRenderContext from '../../../../src/engine/rendering/contexts/VectorRenderContext.js';
import CanvasRenderer from '../../../../src/engine/rendering/renderers/CanvasRenderer.js';

import GameObject from '../../../../src/engine/gameobject/GameObject.js';
import Transform2dPart from '../../../../src/engine/parts/transform/Transform2dPart.js';
import ParticleEmitterPart from '../../../../src/engine/parts/render/ParticleEmitterPart.js';
import BurstParticle from '../../../../src/engine/particlesystem/types/BurstParticle.js';
import BurstEffect from '../../../../src/engine/particlesystem/effects/BurstEffect.js';
import VectorRendererPart from '../../../../src/engine/parts/render/VectorRendererPart.js';

import { Matrix2d } from '../../../../src/engine/core/Matrix.js';
import $Math from '../../../../src/engine/core/Math.js';

// create a double-buffered canvas renderer
await RenderEngine.init(import.meta.url, {
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
        maxParticles: 80000
    },
    threading: {
        particleEngine: {
            enabled: true,
            workers: 2,
            framesPerSecond: 40
        }
    }
});

const eParticle2 = new BurstParticle({
    colors: ['#390039','#b800b8','#fd52fd','#ffd0ff'],
    lifeSpan: [4000, 6000],
    drag: 0.2,
    velocity: [0.1, 0.19]
});
eParticle2.name = 'purples';

const eParticle3 = new BurstParticle({
    colors: ['#0000ff','#6432f8','#678cff','#afd4ff'],
    drag: 0.1,
    dragRate: 0.4,
    lifeSpan: [2000, 8000],
    velocity: [0.3, 0.35]
});
eParticle3.name = 'blues';

const eParticle4 = new BurstParticle({
    colors: ['#ae1313','#ff0000','#ff5a5a','#ffc3c3'],
    lifeSpan: [8000, 12000],
    drag: 0.01,
    dragRate: 0.9,
    velocity: [0.4, 0.6]
});
eParticle4.name = 'reds';

RenderEngine.particleEngine.addParticleType(eParticle2, eParticle3, eParticle4);

// set up the particles and effects we'll use
const pEffect = new BurstEffect({
    count: 10000,
    particleTypes: [eParticle2, eParticle3, eParticle4]
});
RenderEngine.particleEngine.addEffect(pEffect);

// game object and component parts
// - set world position, rotation, and scale
const gameObject = new GameObject();
gameObject
    .addComponentParts(new Transform2dPart("transform"), new ParticleEmitterPart("emitter"))
    .worldTransform = Matrix2d.identity().update({
        position: [400, 300],
        rotation: 0,
        scale: [1, 1]
    });

// add the object to the world - before making any modifications to it
RenderEngine.world.addObject(gameObject);

// configure the emitter to use the explosion effect
const emitter = gameObject.getComponentByName("emitter");
emitter.effect = pEffect;

// every few seconds we'll generate an explosion
function explode() {
    gameObject.worldTransform.setTo({
        position: [$Math.randomRange(10, 790, true), $Math.randomRange(5, 590, true)]
    });
    emitter.reset().enable();
    setTimeout(explode, $Math.randomRange(60, 100, true));
}

explode();

// Start the render loop   
RenderEngine.start();

