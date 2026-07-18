import RenderEngine from '../../src/engine/renderEngine4.js';
import VectorRenderContext from '../../src/engine/rendering/contexts/VectorRenderContext.js';
import CanvasRenderer from '../../src/engine/rendering/renderers/CanvasRenderer.js';

import GameObject from '../../src/engine/gameobject/GameObject.js';
import Transform2dPart from '../../src/engine/parts/transform/Transform2dPart.js';
import VectorRendererPart from '../../src/engine/parts/render/VectorRendererPart.js';

// create a double-buffered canvas renderer
RenderEngine.init({
    flags: {
        debugMode: false
    },
    world: {
        renderContext: new VectorRenderContext(
            CanvasRenderer.build(
                document.getElementById("context"), 
                false
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
const gameObject = new GameObject();
const txform = new Transform2dPart();
const renderer = new VectorRendererPart();

// add the parts to the game object
gameObject.addComponentParts(txform, renderer);

// add the object to the world
// before making any modifications to it
RenderEngine.world.addObject(gameObject);

// vector renderer draws out the word "Colorful"
renderer.API
    .fontSize(20)
    .text("{#00f}C{#f00}{+3}o{#080}{+2}l{#ee0}{+0.5}o{#808}{-0.5}r{#088}{-1}f{#800}{-1}u{orange}{-1}l");
renderer.compile();

// set position, rotation, and scale
txform.position = [400, 300];
txform.rotation = 0;
txform.scale = [1,1];


setInterval(() => {
    txform.rotation += 0.1;
}, 100);

// Start the render loop   
RenderEngine.start();

