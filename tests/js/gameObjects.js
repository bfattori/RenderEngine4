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
                true
            ),
            {
                enableCulling: false
            }
        ),
        dimensions: [800, 600],
        viewport: [0, 0, 800, 600]
    },
    hooks: {
        onInit: () => { RenderEngine.console.log("onInit: Hello world!"); }
    }
});

// game object
const gameObject = new GameObject();
const txform = new Transform2dPart();
const renderer = new VectorRendererPart();

gameObject.addComponentPart(txform);
gameObject.addComponentPart(renderer);

// chainable API for drawing shapes and text
renderer.API
    .fontSize(4)
    .text("{#00f}C{#f00}o{#080}l{#ee0}o{#808}r{#088}f{#800}u{orange}l");
renderer.compile();

txform.position = [400, 300];
txform.rotation = Math.PI / 4;
txform.scale = [2, 2];

RE4.world.addObject(gameObject);

// Start the render loop   
RE4.start();

