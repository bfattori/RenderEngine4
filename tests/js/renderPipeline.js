import RenderEngine from '../../src/engine/renderEngine4.js';
import VectorRenderContext from '../../src/engine/rendering/contexts/VectorRenderContext.js';
import CanvasRenderer from '../../src/engine/rendering/renderers/CanvasRenderer.js';

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
            )
        ),
        dimensions: [800, 600],
        viewport: [0, 0, 800, 600]
    },
    hooks: {
        onInit: () => { console.log("onInit: Hello world!"); },
        onBeforeFrame: () => { console.log("onBeforeFrame: Rendering frame!"); },
        onFrame: () => { console.log("onFrame: Frame rendered!") }
    }
});

// draw some shapes and text
const context = RE4.world.renderContext;

// chainable API for drawing shapes and text
const api = context.getAPI();
const q = api.quadratic;
api
    .color("#0000ff").width(5)
    .line(100, 100, 300, 300)
    .fillColor("#8800cc")
    .circle(100, 100, 50, true)
    .color("#ff9100").width(10)
    .circle(100, 100, 50, false)
    
    // the string "Inline Format" formatted 
    // with colors and font size changes
api
    .pushTransform()
    .translate(50, 330)
    .width(1)
    .text("{15}{#00f}**I{#f00}n**{green}{+12}l{orange}~i~{gold}{-2}n{mediumvioletred}e")
    .popTransform();

api
    .pushTransform()
    .translate(100, 400)
    .text("{60}{#808}**~F{-1}o{-1}r{-1}m{-1}a{-1}t~**")
    .popTransform();

api    
    .pushTransform()
    .translate(80, 15)
    .text("Plain text, no formatting.", 
        {color: "black", lineWidth: 1})
    .popTransform();

api
    .pushTransform()
    .translate(210, 90)
    .fontSize(30)
    .text("_{#00f}C{#f00}o{#080}l{#ee0}o{#808}r{#088}f{#800}u{orange}l_")
    .color("royalblue")
    .translate(-60, 40)
    .text("**{10}Absolute\n{5}Sizing**")
    .popTransform();

api    
    .color("blue")
    .width(2)
    .curve(false, [60, 180], 
        q(90, 160, 100, 50), 
        q(140, 100, 200, 44));

// Run out one frame to render it   
RE4.update(0, 0);
RE4.renderWorld();

