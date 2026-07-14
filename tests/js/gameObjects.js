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

// vector renderer draws out the word "Colorful"
renderer.API
    .fontSize(4)
    .text("{#00f}C{#f00}o{#080}l{#ee0}o{#808}r{#088}f{#800}u{orange}l");
renderer.compile();

// set position, rotation, and scale
txform.position = [400, 300];
txform.rotation = 0;
txform.scale = [1,1];

// add the object to the world
RenderEngine.world.addObject(gameObject);

// Start the render loop   
RenderEngine.start();

