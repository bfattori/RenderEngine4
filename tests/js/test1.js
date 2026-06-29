import RenderEngine from '../../src/engine/renderEngine4.js';
import VectorRenderContext from '../../src/engine/rendering/contexts/VectorRenderContext.js';
import CanvasRenderer from '../../src/engine/rendering/renderers/CanvasRenderer.js';

// create a double-buffered canvas renderer
RenderEngine.init({
    world: {
        renderContext: new VectorRenderContext(
            CanvasRenderer.build(
                document.getElementById("context"), 
                true
            )
        ),
        dimensions: [800, 600],
        viewport: [0, 0, 800, 600]
    },
    hooks: {
        onInit: () => { RenderEngine.console.log("onInit: Hello world!"); },
        onBeforeFrame: () => { RenderEngine.console.log("onBeforeFrame: Rendering frame!"); },
        onFrame: () => { RenderEngine.console.log("onFrame: Frame rendered!") }
    }
});

// draw a simple shape
const context = RE4.world.renderContext;
context.render
    .color("#0000ff")
    .width(5)
    .line(100, 100, 300, 300)
    .fillColor("#8800cc")
    .circle(100, 100, 50, true)
    .color("#ff9100")
    .width(10)
    .circle(100, 100, 50, false)
    // the string "Hello World!" formatted with colors
    .width(3)
    .cursor(50, 350)
    .text("%#00f **H%#f00 ** e%green %[4]l%orange l%#2e867f %[]o")
    .cursor(50, 455)
    .text(" %[6]%#808 **~World!~**");

// Run out one frame to render it   
RE4.update(0, 0);
RE4.renderWorld();

