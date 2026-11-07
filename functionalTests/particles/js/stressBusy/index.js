import RenderEngine from '../../../../src/engine/renderEngine4.js';
import RenderContext from '../../../../src/engine/rendering/context/RenderContext.js';
import CanvasRenderer from '../../../../src/engine/rendering/renderers/CanvasRenderer.js';

import GameObject from '../../../../src/engine/gameobject/GameObject.js';
import Transform2dPart from '../../../../src/engine/parts/transform/Transform2dPart.js';
import ParticleEmitterPart from '../../../../src/engine/parts/render/ParticleEmitterPart.js';
import BasicParticle from '../../../../src/engine/particlesystem/types/BasicParticle.js';
import BurstEffect from '../../../../src/engine/particlesystem/effects/BurstEffect.js';
import CompiledRenderPart from '../../../../src/engine/parts/render/CompiledRenderPart.js';

import burstConfig from '../../../assets/particleConfig/burst.json' with { type: 'json' };

import $Math from '../../../../src/engine/core/lang/Math.js';
import Util from '../../../../src/engine/core/Util.js';

// number of objects to create
const numObjects = 500;

self.PARTICLE_ENGINE_OPTIONS = {
    maxParticles: 80000
};


// create a double-buffered canvas renderer
await RenderEngine.init(import.meta.url, {
    flags: {
        debugMode: true,
        showFps: true,
        debugOpts: {
            objectOrigins: false,
            showParticleEngineLoad: true
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

// set up the particles and effects we'll use
const exParticle = new BasicParticle(burstConfig);
const pEffect = new BurstEffect({
    count: 2000,
    particleTypes: [exParticle]
});

RenderEngine.particleEngine.addParticleType(exParticle);
RenderEngine.particleEngine.addEffect(pEffect);
await RenderEngine.particleEngine.initialize();

// game object and component parts
// - set world position, rotation, and scale
const gameObject = new GameObject();
gameObject
    .addComponentParts(new Transform2dPart("transform"), new ParticleEmitterPart("emitter"));
const t = gameObject.getComponentByName("transform");

// add the object to the world - before making any modifications to it
RenderEngine.world.addObject(gameObject);

// configure the emitter to use the explosion effect
const emitter = gameObject.getComponentByName("emitter");
emitter.effect = pEffect;

// every few seconds we'll generate an explosion
function explode() {
    t.position = [$Math.randomRange(10, 790, true), $Math.randomRangeInt(10, 590)];
    emitter.reset().enable();
    setTimeout(explode, $Math.randomRangeInt(20, 80));
}

// create game objects
for (let i = 0; i < numObjects; i++) {
    // game object and component parts
    // - set world position, rotation, and scale
    const gameObject = new GameObject(`MultiObject${i}`);
    const scale = $Math.randomRange(0.25, 1.5);
    gameObject
        .addComponentParts(new Transform2dPart("transform"), new CompiledRenderPart("renderer"));

    const t2 = gameObject.getComponentByName("transform");
    t2.position = [$Math.randomRange(10, 790, true), $Math.randomRangeInt(10, 590)];

    // add the object to the world - before making any modifications to it
    RenderEngine.world.addObject(gameObject);

    // vector renderer
    const color = Util.getColor(Math.random(), Math.random(), Math.random());
    const renderer = gameObject.getComponentByName("renderer");
    renderer.API
        .color(color)
        .width($Math.randomRange(1, 4))
        .regularPolygon(0, 0, $Math.randomRange(3, 12, true), false);
    renderer.compile();

    // fires before each update of the object (not ideal in this situation, but meh)
    const rotate = $Math.randomRange(0, 4) - 2.0;
    gameObject.onBeforeUpdate = (time, deltaTime) => {
        t2.rotation += rotate;
    };
}

explode();

// Start the render loop   
RenderEngine.start();

