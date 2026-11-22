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

export default {};