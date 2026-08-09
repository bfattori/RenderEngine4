import RenderEngine from '../../../src/engine/renderEngine4.js';
import VectorRenderContext from '../../../src/engine/rendering/contexts/VectorRenderContext.js';
import CanvasRenderer from '../../../src/engine/rendering/renderers/CanvasRenderer.js';

import GameObject from '../../../src/engine/gameobject/GameObject.js';
import Transform2dPart from '../../../src/engine/parts/transform/Transform2dPart.js';
import ParticleEmitterPart from '../../../src/engine/parts/render/ParticleEmitterPart.js';
import ExplosionParticle from '../../../src/engine/particlesystem/types/ExplosionParticle.js';
import ParticleEffect from '../../../src/engine/particlesystem/effects/ParticleEffect.js';
import WaterParticle from '../../../src/engine/particlesystem/types/WaterParticle.js';
import FountainEffect from '../../../src/engine/particlesystem/effects/FountainEffect.js';
import VectorRendererPart from '../../../src/engine/parts/render/VectorRendererPart.js';

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
    }
});

// set up the explosion effect
const pEffect = ParticleEffect.getInstance(['expParticle']);
pEffect.quantity = 180;

// add the explosion perticle and effect to the particle engine
RenderEngine.particleEngine.addParticleType('expParticle', ExplosionParticle.getInstance());
RenderEngine.particleEngine.addEffect('explosion', pEffect);

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
explosionEmitter.effect = 'explosion';

// generate an explosion randomly
function explode() {
    explosionObject.worldTransform.setTo({
        position: [$Math.randomRange(10, 790, true), $Math.randomRange(5, 300, true)]
    });
    explosionEmitter.emit();
    setTimeout(explode, $Math.randomRange(100, 1000, true));
}

// Fountains
const wEffect1 = FountainEffect.getInstance(['waterParticle']);
wEffect1.quantity = 5;
wEffect1.angle = 0;
wEffect1.spread = 5;

const wEffect2 = FountainEffect.getInstance(['waterParticle']);
wEffect2.quantity = 5;
wEffect2.angle = -60;
wEffect2.spread = 5;

// add fountain particles and effects
RenderEngine.particleEngine.addParticleType('waterParticle', WaterParticle.getInstance());
RenderEngine.particleEngine.addEffect('fountainOne', wEffect1);
RenderEngine.particleEngine.addEffect('fountainTwo', wEffect2);

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
fountain1.getComponentByName("emitter").effect = 'fountainOne';
fountain2.getComponentByName("emitter").effect = 'fountainTwo';

// start the explosions and fountains
explode();

RenderEngine.hooks.onBeforeFrame = () => {
    fountain1.getComponentByName("emitter").emit();
    fountain2.getComponentByName("emitter").emit();
};

// Start the render loop   
RenderEngine.start();

