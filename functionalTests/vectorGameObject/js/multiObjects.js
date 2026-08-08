import RenderEngine from '../../../src/engine/renderEngine4.js';
import VectorRenderContext from '../../../src/engine/rendering/contexts/VectorRenderContext.js';
import CanvasRenderer from '../../../src/engine/rendering/renderers/CanvasRenderer.js';

import GameObject from '../../../src/engine/gameobject/GameObject.js';
import Transform2dPart from '../../../src/engine/parts/transform/Transform2dPart.js';
import VectorRendererPart from '../../../src/engine/parts/render/VectorRendererPart.js';

import { Matrix2d } from '../../../src/engine/core/Matrix.js';
import $Math from '../../../src/engine/core/Math.js';
import Util from '../../../src/engine/core/Util.js';

// number of objects to create
const numObjects = 500;

// create a double-buffered canvas 
// renderer with the compiler enabled
await RenderEngine.init({
    flags: {
        debugMode: false,
        showFps: true
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
                enableCulling: false, 
                text: {
                    forceUpperCase: true
                }
             }
        ),
        dimensions: {width: 800, height: 600},
        viewport: {left: 0, top: 0, width: 800, height: 600}
    }
});

// create game objects
for (let i = 0; i < numObjects; i++) {

    // game object and component parts
    // - set world position, rotation, and scale
    const gameObject = new GameObject(`MultiObject${i}`);
    const scale = $Math.randomRange(0.25, 1.5);
    gameObject
        .addComponentParts(new Transform2dPart("transform"), new VectorRendererPart("renderer"))
        .worldTransform = Matrix2d.identity().setTo({
            position: [$Math.randomRange(10, 790, true), $Math.randomRange(10, 590, true)],
            rotation: 0,
            scale: [scale, scale]
        });

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

    // fires before each update of the object
    const rotate = $Math.randomRange(0, 4) - 2.0;
    gameObject.onBeforeUpdate = (time, deltaTime) => {
        gameObject.worldTransform.rotateSelf(rotate);
    };
}

// Start the render loop   
RenderEngine.start();

