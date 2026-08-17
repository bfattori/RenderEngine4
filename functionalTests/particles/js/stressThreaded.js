import RenderEngine from '../../../src/engine/renderEngine4.js';
import VectorRenderContext from '../../../src/engine/rendering/contexts/VectorRenderContext.js';
import CanvasRenderer from '../../../src/engine/rendering/renderers/CanvasRenderer.js';

import GameObject from '../../../src/engine/gameobject/GameObject.js';
import Transform2dPart from '../../../src/engine/parts/transform/Transform2dPart.js';
import ParticleEmitterPart from '../../../src/engine/parts/render/ParticleEmitterPart.js';
import BurstParticle from '../../../src/engine/particlesystem/types/BurstParticle.js';
import BurstEffect from '../../../src/engine/particlesystem/effects/BurstEffect.js';
import VectorRendererPart from '../../../src/engine/parts/render/VectorRendererPart.js';

import { Matrix2d } from '../../../src/engine/core/Matrix.js';
import $Math from '../../../src/engine/core/Math.js';

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
        maxParticles: 80000,
        circularBuffer: true
    },
    threading: {
        particleEngine: {
            enabled: true,
            workers: 4
        }
    }
});

// set up the particles and effects we'll use

const exParticle = new BurstParticle();
const pEffect = new BurstEffect({
    count: 2000,
    particleTypes: [exParticle]
});

RenderEngine.particleEngine.addParticleType(exParticle);
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
        position: [$Math.randomRange(10, 790, true), $Math.randomRange(10, 590, true)]
    });
    emitter.emit();
    setTimeout(explode, $Math.randomRange(80, 100, true));
}

// game object and component parts
// - set world position, rotation, and scale
const gameObject2 = new GameObject();
gameObject2
    .addComponentParts(new Transform2dPart("transform"), new VectorRendererPart("renderer"))
    .worldTransform = Matrix2d.identity().update({
        position: [400, 300],
        rotation: 0,
        scale: [1, 1]
    });

// add the object to the world - before making any modifications to it
RenderEngine.world.addObject(gameObject2);

// vector renderer draws out the word "Colorful"
// capture the text sizing to set the origin
let textBox = [0,0];
const renderer = gameObject2.getComponentByName("renderer");
renderer.API
    .fontSize(20)
    .text("{#00f}C{#f00}{+3}o{#080}{+2}l{#ee0}{+0.5}o{#808}{-0.5}r{#088}{-1}f{#800}{-1}u{orange}{-1}l", {}, textBox);
renderer.compile();

// set the origin at the center of the text
//gameObject.origin = [textBox[0] / 2, textBox[1] / 2];

// fires before each update of the object
gameObject2.onBeforeUpdate = (time, deltaTime) => {
    gameObject2.worldTransform.rotateSelf(1);
};

explode();

// Start the render loop   
RenderEngine.start();

