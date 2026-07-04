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

// draw some shapes and text
const context = RE4.world.renderContext;

// chainable API for drawing shapes and text
context.API
    .color("#0000ff").width(5)
    .line(100, 100, 300, 300)
    .fillColor("#8800cc")
    .circle(100, 100, 50, true)
    .color("#ff9100").width(10)
    .circle(100, 100, 50, false)
    
    // the string "Inline Format" formatted 
    // with colors and font size changes
    .cursor(50, 330)
    .width(3)
    .text("{#00f}**I{#f00}n**{green}{+2}l{orange}~i~{#2e867f}{+}ne")
    .cursor(50, 455)
    .text("{+6}{#808}**~F{-1}o{-1}r{-1}m{-1}a{-1}t~**")
    .cursor(100, 15).color("#000").width(1)
    .text("Plain text, no formatting.", 
        {color: "black", fontSize: 1.5, lineWidth: 1});

// Run out one frame to render it   
RE4.update(0, 0);
RE4.renderWorld();

