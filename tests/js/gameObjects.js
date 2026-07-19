import RenderEngine from '../../src/engine/renderEngine4.js';
import VectorRenderContext from '../../src/engine/rendering/contexts/VectorRenderContext.js';
import CanvasRenderer from '../../src/engine/rendering/renderers/CanvasRenderer.js';

import GameObject from '../../src/engine/gameobject/GameObject.js';
import Transform2dPart from '../../src/engine/parts/transform/Transform2dPart.js';
import VectorRendererPart from '../../src/engine/parts/render/VectorRendererPart.js';

import { Matrix2d } from '../../src/engine/core/Matrix.js';

// create a double-buffered canvas renderer
RenderEngine.init({
    flags: {
        debugMode: false
    },
    world: {
        renderContext: new VectorRenderContext(
            CanvasRenderer.build(
                document.getElementById("context"), 
                true
            ),
            { enableCulling: false }
        ),
        dimensions: [800, 600],
        viewport: [0, 0, 800, 600]
    },
    hooks: {
        onInit: () => { console.log("onInit: Hello world!"); }
    }
});

// game object and component parts
// - set world position, rotation, and scale
const gameObject = new GameObject();
gameObject
    .addComponentParts(new Transform2dPart("transform"), new VectorRendererPart("renderer"))
    .worldTransform = Matrix2d.identity().update({
        position: [400, 300],
        rotation: 0,
        scale: [1, 1]
    });

// add the object to the world - before making any modifications to it
RenderEngine.world.addObject(gameObject);

// vector renderer draws out the word "Colorful"
// capture the text sizing to set the origin
let textBox = [0,0];
const renderer = gameObject.getComponentByName("renderer");
renderer.API
    .fontSize(20)
    .text("{#00f}C{#f00}{+3}o{#080}{+2}l{#ee0}{+0.5}o{#808}{-0.5}r{#088}{-1}f{#800}{-1}u{orange}{-1}l", {}, textBox);
renderer.compile();

// set the origin at the center of the text
gameObject.getComponentByName("transform").origin = [textBox[0] / 2, textBox[1] / 2];

setInterval(() => {
    // update the object's rotation every 10ms
    gameObject.worldTransform.rotateSelf(0.5);
}, 10);

// Start the render loop   
RenderEngine.start();

