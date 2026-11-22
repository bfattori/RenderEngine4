import RenderEngine from '../../../../src/engine/renderEngine4.js';
import RenderContext from '../../../../src/engine/rendering/context/RenderContext.js';
import CanvasRenderer from '../../../../src/engine/rendering/renderers/CanvasRenderer.js';

import demoInfo from './demoInfo.js';

// create a double-buffered canvas renderer
await RenderEngine.init(import.meta.url, {
    flags: {
        debugMode: false
    },
    world: {
        renderContext: new RenderContext(
            CanvasRenderer.build(
                document.getElementById("context"), 
                {
                    doubleBuffered: false
                }
            ),
            { 
                enableCulling: false, 
                text: {
                    forceUpperCase: false
                }
            }
        ),
        dimensions: {width: 800, height: 600},
        viewport: {left: 0, top: 0, width: 800, height: 600}
    },
    hooks: {
        onInit: () => { console.log("onInit: Hello world!"); },
        onBeforeFrame: () => { console.log("onBeforeFrame: Rendering frame!"); },
        onFrame: () => { console.log("onFrame: Frame rendered!") }
    }
});

const context = RE4.world.renderContext;

// chainable API for drawing shapes and text
const api = context.getAPI();
const q = api.quadratic;

// draw some shapes
api
    .color("#0000ff").width(5)
    .line(100, 100, 300, 300)
    .fillColor("#8800cc")
    .circle(100, 100, 50, true)
    .color("#ff9100").width(10)
    .circle(100, 100, 50, false).resetWidth();
    
// the string "Inline" formatted 
// with colors and font size changes
api
    .pushTransform()
    .translate(50, 330)
    .width(2);
await api.vecText("{15}{#00f}**I{#f00}n**{green}{+12}l{orange}~i~{gold}{-2}n{mediumvioletred}e");
api
    .resetFontSize()
    .popTransform();

// the string "Format" formatted 
// font size changes
api
    .pushTransform()
    .translate(100, 400)
    .width(5);

await api.vecText("{50}{#808}**F{-5}o{-5}r{-5}m{-5}a{-5}t**");
api
    .resetFontSize()
    .popTransform();

// basic vector text rendering    
api    
    .pushTransform()
    .translate(80, 20);

await api.vecText("Simple text,\tplain formatting.", 
        {color: "black", lineWidth: 1});

api.popTransform();

// italics, colorful
api
    .pushTransform()
    .translate(210, 90);

await api.vecText("{20}_{#00f}C{#f00}o{#080}l{#ee0}o{#808}r{#088}f{#800}u{orange}l_{!f}");

api
    .resetFontSize()
    .popTransform()

api
    .pushTransform()
    .color("royalblue")
    .translate(270, 180);

await api.vecText("**{30}_Absolute_\n{10}    Sizing**");
api.popTransform();

api.popTransform()

api
    .pushTransform()
    .translate(20, 500)
    .color("black");

await api.vecText("ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz");
    api.popTransform();

api.pushTransform()
    .translate(20, 545)
    .color("blue");

await api.vecText(`!@#$%^&*()\\_-=+[];:'",<.>/?`);
    api.popTransform();

// testing curves
api    
    .color("blue")
    .width(2)
    .curve(false, [60, 180], 
        q(90, 160, 100, 50), 
        q(140, 100, 200, 44));

// Run out one frame to render it   
RE4.update(0, 0);
RE4.renderWorld();
