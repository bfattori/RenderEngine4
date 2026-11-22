import RenderEngine from '../../../../src/engine/renderEngine4.js';
import RenderContext from '../../../../src/engine/rendering/context/RenderContext.js';
import CanvasRenderer from '../../../../src/engine/rendering/renderers/CanvasRenderer.js';

// What's going on here...
DemoHelper.showInfo( 
  `<p>
  Vector drawing is provided by <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/rendering/api/RenderingAPI.js', {className:'RenderingAPI'})">RenderingAPI</a>
  used by the <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/rendering/context/RenderContext.js', {className:'RenderContext'})">RenderContext</a>
  to generate the intermediate language.
  </p><p>
  Take a look at <a class='class-ref' href='#' onclick="DemoHelper.showCode('/functionalTests/renderContexts/js/vectorCanvas/index.js')">the code of this example</a> to
  see how vector drawing is performed. This example is simple and does not start the engine - instead it causes the world to
  update and then renders it.
  </p>
`);

DemoHelper.showExtraInfo(`
<b>Text Formatting Tags</b>
<div class='scroll-y text-tags'>
<table>
    <thead>
        <tr>
        <th>Tag</th>
        <th>Description</th>
        <th>Example</th>
    </thead>
    <tbody>
        <tr>
            <td class="state"><code>{![[!](zfcw)]}</code></td>
            <td>Pops the formatting state off the stack, or emptys the state's stack. 
            <code>[(!)option]</code> indicates which one of <code>'z'</code> (font size), 
            <code>'f'</code> (fill color), <code>'c'</code> (stroke color), and <code>'w'</code> 
            (stroke width) to pop or reset. A single '!' pops the stack, and a double '!!'
            resets it back to the default state.</td>
            <td><code>{!z}</code> pops the previous font size off the state stack, <code>{!!z}</code>
            resets it to the default.</td>
        </tr>
        <tr>
            <td class="state"><code>{[(+/-)number]}</code></td>
            <td>Change the size of the font. <code>[(+/-)number]</code> takes a relative
            value (ex: +3, -1) or an absolute value to alter the size of the font.</td>
            <td><code>{12}</code> sets the font size to twelve.</td>
        </tr>
        <tr>
            <td class="state"><code>{#[hex/color]}</code></td>
            <td>Sets the stroke color for font rendering. [hex/color] can be either a
            hex color string (ex: "rrggbb" or "rgb") or a web-safe color name (ex: red, blue).</td>
            </td>
            <td><code>{#ec600f}</code> is a reddish orange color.</td>
        </tr>
        <tr>
            <td class="state"><code>_[text]_</code></td>
            <td>Italicize the string in <code>[text]</code>.</td>
            <td><code>_italicized text!_</code></td>
        </tr>
        <tr>
            <td class="state"><code>**[text]**</code></td>
            <td>Bold the string in <code>[text]</code>.</td>
            <td><code>**this is bold**</code></td>
        </tr>
        <tr>
            <td class="state"><code>~[text]~</code></td>
            <td>Underline the string in <code>[text]</code>.</td>
            <td><code>~underlined text~</code></td>
        </tr>
        <tr>
            <td class="state"><code>\\[char]</code></td>
            <td>Escape the character so it can be rendered and not processed as formatting.</td>
            <td><code>This is \\~not underlined\\~</code></td>
        </tr>
        <tr>
            <td class="state"><code>\\n</code><br/><code>\\t</code></td>
            <td>Insert a newline or tab character.</td>
            <td><code>This is across\\ntwo lines</code></td>
        </tr>
    </tbody>
</table>
</div>    
`, { left: 10, top: 10, width: 450, height: 450 });

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
