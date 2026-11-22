


DemoHelper.showInfo(`
  <p>
  The table below covers the <b>RenderEngine4</b> API. The 
  <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/rendering/assemblers/languages/IL.js')">Intermediate Language</a>
  is consumed by both the
  <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/rendering/assemblers/Assembler.js', {className: 'Assembler'})">Assembler</a>
  (<a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/rendering/assemblers/CanvasAssembler.js', {className: 'CanvasAssembler', scroll: 295})">CanvasAssembler</a>)
  which turns the IL into direct calls to the renderer's surface, and the
  <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/rendering/renderers/Renderer.js', {className: 'Renderer'})">Renderer</a>
  (<a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/rendering/renderers/CanvasRenderer.js', {className: 'CanvasRenderer', scroll: 4260})">CanvasRenderer</a>) which
  has the immediate-mode interpreter.
  <table>
    <thead>
      <tr>
        <th class="api-col-1">API method</th>
        <th class="api-col-2">Description</th>
      </tr>
    </thead>
  </table>
  <div class="scroll-y api-methods">
  <table>
      <tbody>
          <tr>
              <td class="header" colspan="2">Transformation Modifiers</td>
          </tr>
          <tr>
              <td class="state"><code>translate(x, y)</code></td>
              <td>Move the current transform by <code>x</code> and <code>Y</code>.</td>
          </tr>
          <tr>
              <td class="state"><code>rotate(angle)</code></td>
              <td>Rotate the current transform by <code>angle</code> degrees.</td>
              </td>
          </tr>
          <tr>
              <td class="state"><code>scale(x[, y])</code></td>
              <td>Scale the current transform by <code>x</code> and optionally <code>y</code>.
              Providing only <code>x</code> will perform a uniform scale along x and y.</td>
          </tr>
          <tr>
              <td class="state"><code>uniformScale(scalar)</code></td>
              <td>Uniformly scales the current transform along x and y evenly.</td>
          </tr>
          <tr>
              <td class="state"><code>skew(sX[, xY])</code></td>
              <td>Skew the current transform along <code>sX</code> and optionally along
              <code>sY</code>. If only <code>sX</code> is provided, skewing will only
              occur along the x-axis.</td>
          </tr>
          <tr>
              <td class="state"><code>transform(matrix)</code></td>
              <td>Modify the current transform by multiplying it by the provided <code>matrix</code>.</td>
          </tr>
          <tr>
              <td class="state"><code>absTransform(matrix)</code></td>
              <td>Sets the current transform to <code>matrix</code>.</td>
          </tr>
          <tr>
              <td class="state"><code>push()</code></td>
              <td>Saves the current rendering state.</td>
          </tr>
          <tr>
              <td class="state"><code>pushTransform(matrix)</code></td>
              <td>Saves the current rendering state, then pushes a new
              transform onto the transformation stack.</td>
          </tr>
          <tr>
              <td class="state"><code>pop()</code></td>
              <td>Restores current rendering state to the state that was last
              saved with <code>api.push()</code>.</td>
          </tr>
          <tr>
              <td class="state"><code>popTransform()</code></td>
              <td>Pops the transform off the stack that was pushed with
              <code>api.pushTransform()</code> and restores to the last
              saved state. Returns the transform popped off the stack.</td>
          </tr>
          <tr>
              <td class="state"><code>peekTransform()</code></td>
              <td>Returns the transform at the top of the stack without altering
              the transform stack.</td>
          </tr>
          <tr>
              <td class="state"><code>resetTransforms()</code></td>
              <td>Clears the transform stack, resetting it to the identity matrix.</td>
          </tr>
          <tr>
              <td class="state"><code>moveTo(x, y)</code></td>
              <td>Position the next drawing operation at <code>x</code> and <code>y</code>.</td>
          </tr>
          <tr>
              <td class="header" colspan="2">Render State Modifiers</td>
          </tr>
          <tr>
              <td class="state"><code>color([r[, g, b[, a]]])</code></td>
              <td>Sets the stroke color to either a hex string (#rrggbb[aa]) or to the values
                  in <code>r</code> (red), <code>g</code> (green), <code>b</code> (blue), and 
                  optionally <code>a</code> (alpha). Red, green, and blue are values between 0 and
                  255, with alpha being from 0.0 to 1.0. If <i>no values are provided</i> the current
                  stroke color is replaced by the previous color. Setting the color pushes it
                  onto the state stack.
          </tr>
          <tr>
              <td class="state"><code>getColor()</code></td>
              <td>Returns the current state stroke color without altering the stack.</td>
          </tr>
          <tr>
              <td class="state"><code>setColor(r[, g, b[, a]])</code></td>
              <td>Overwrites the current state stroke color without altering the stack.</td>
          </tr>
          <tr>
              <td class="state"><code>resetColor()</code></td>
              <td>Empties the state stack and resets the color to the default.</td>
          </tr>
          <tr>
              <td class="state"><code>fillColor([r[, g, b[, a]]])</code></td>
              <td>Sets the fill color to either a hex string (#rrggbb[aa]) or to the values
                  in <code>r</code> (red), <code>g</code> (green), <code>b</code> (blue), and 
                  optionally <code>a</code> (alpha). Red, green, and blue are values between 0 and
                  255, with alpha being from 0.0 to 1.0. If <i>no values are provided</i> the current
                  fill color is replaced by the previous color. Setting the color pushes it
                  onto the state stack.
          </tr>
          <tr>
              <td class="state"><code>getFillColor()</code></td>
              <td>Returns the current state fill color without altering the stack.</td>
          </tr>
          <tr>
              <td class="state"><code>setFillColor(r[, g, b[, a]])</code></td>
              <td>Overwrites the current state fill color without altering the stack.</td>
          </tr>
          <tr>
              <td class="state"><code>resetFillColor()</code></td>
              <td>Empties the state stack and resets the fill color to the default.</td>
          </tr>
          <tr>
              <td class="state"><code>width([w])</code></td>
              <td>Sets the stroke width. If <i>no value is provided</i> the current 
              width is replaced by the previous value. Setting the width pushes it 
              onto the state stack.</td>
          </tr>
          <tr>
              <td class="state"><code>getWidth()</code></td>
              <td>Returns the current state stroke width without altering the stack.</td>
          </tr>
          <tr>
              <td class="state"><code>setWidth(w)</code></td>
              <td>Overwrites the current state stroke width without altering the stack.</td>
          </tr>
          <tr>
              <td class="state"><code>resetWidth()</code></td>
              <td>Empties the state stack and resets the stroke width to the default.</td>
          </tr>
          <tr>
              <td class="state"><code>font([fontName])</code></td>
              <td>Sets the font name for rasterized text to an available font name in the system. 
                  If <i>no font name is provided</i> the current font is replaced by the previous
                  font. Setting the font name pushes it onto the state stack.</td>
          </tr>
          <tr>
              <td class="state"><code>getFont()</code></td>
              <td>Returns the current state font name without altering the stack.</td>
          </tr>
          <tr>
              <td class="state"><code>setFont(fontName)</code></td>
              <td>Overwrites the current state font name without altering the stack.</td>
          </tr>
          <tr>
              <td class="state"><code>resetFont()</code></td>
              <td>Empties the state stack and resets the font name to the default.</td>
          </tr>
          <tr>
              <td class="state"><code>fontSize([size])</code></td>
              <td>Sets the font size for text rendering. If <i>no size is provided</i> the 
              current size is replaced by the previous size. Setting the size pushes it onto 
              the state stack.</td>
          </tr>
          <tr>
              <td class="state"><code>getFontSize()</code></td>
              <td>Returns the current state font size without altering the stack.</td>
          </tr>
          <tr>
              <td class="state"><code>setFontSize(s)</code></td>
              <td>Overwrites the current state font size without altering the stack.</td>
          </tr>
          <tr>
              <td class="state"><code>resetFontSize()</code></td>
              <td>Empties the state stack and resets the font size to the default.</td>
          </tr>
          <tr>
              <td class="header" colspan="2">Cursor Manipulation</td>
          </tr>
          <tr>
              <td class="state"><code>carriageReturn()</code></td>
              <td>Causes the text cursor to move to the next <code>lineHeight</code> down
              and the <code>margin.left</code> defined in the context state.</td>
          </tr>
          <tr>
              <td class="state"><code>cursor(x, y)</code></td>
              <td>Moves the text cursor to <code>x</code>, <code>y</code> screen space
              regardless of margins.</td>
          </tr>
          <tr>
              <td class="state"><code>cursorDelta(x, y)</code></td>
              <td>Moves the text cursor <code>x</code> and <code>y</code> from its
              current screen space coordinates, regardless of margins.</td>
          </tr>
          <tr>
              <td class="state"><code>cursorX(x)</code></td>
              <td>Moves the text cursor to <code>x</code> regardless of margins.</td>
          </tr>
          <tr>
              <td class="state"><code>cursorY(y)</code></td>
              <td>Moves the text cursor to <code>y</code> regardless of margins.</td>
          </tr>
          <tr>
              <td class="state"><code>setCursorMargins(left, right)</code></td>
              <td>Set the left and right margins of text rendering to properly render
              multi-line text.</td>
          </tr>
          <tr>
              <td class="state"><code>getCursor()</code></td>
              <td>Returns an object <code>{x, y}</code> containing the X and
              Y screen space coordinates of the cursor.</td>
          </tr>
          <tr>
              <td class="header" colspan="2">Vector Drawing Operations</td>
          </tr>
          <tr>
              <td class="state"><code>point(x, y[, round])</code></td>
              <td>Draws a point at <code>x, y</code>, in the current stroke color, 
              optionally drawn as a disc (true) rather than a rectangle (false).</td>
          </tr>
          <tr>
              <td class="state"><code>line(x, y, eX, eY)</code></td>
              <td>Draws a line from <code>x, y</code> to <code>eX, eY</code> in
              the current stroke color.</td>
          </tr>
          <tr>
              <td class="state"><code>lineRel(x, y)</code></td>
              <td>Draws a line from the current end of the last drawing operation to
              <code>x, y</code> in the current stroke color.</td>
          </tr>
          <tr>
              <td class="state"><code>lineSegment(filled, x, y, ... coords)</code></td>
              <td>Draws a line segment starting at <code>x, y</code> along the path described
              in <code>coords</code> (an array of 2-element arrays [x, y], [x, y], ...]) in the current stroke color.
              If <code>filled</code> is true, the segment will be closed and filled with the
              current fill color.</td>
          </tr>
          <tr>
              <td class="state"><code>curve(filled, x, y, ... coords)</code></td>
              <td>Creates curved line segment starting at <code>x, y</code> along the path described
              in the <code>quadratic</code> or <code>bezier</code> coordinates using the current
              stroke color. If <code>filled</code> is true, the curve will be closed and filled with the 
              current fill color. Use the methods below to simplify coordinate creation.</td>
          </tr>
          <tr>
              <td class="state"><code>quadratic(controlX, controlY, endX, endY)</code></td>
              <td>Creates a quadratic curve segment that can be used with <code>api.curve()</code>.</td>
          </tr>
          <tr>
              <td class="state"><code>bezier(controlX1, controlY1, controlX2, controlY2, endX, endY)</code></td>
              <td>Creates a bezier curve segment that can be used with <code>api.curve()</code>.</td>
          </tr>
          <tr>
              <td class="state"><code>arc(cx, cy, rX, rY, startAngle, endAngle[, filled])</code></td>
              <td>Draws an ellipsoid arc centered at <code>cx, cy</code> with radius <code>rX, rY</code>
              from the starting to ending angle (in radians) using the current stroke color. If 
              <code>filled</code> is true, the arc will be filled with the current fill color.</td>
          </tr>
          <tr>
              <td class="state"><code>ellipse(cx, cy, rX, rY[, filled])</code></td>
              <td>Draws a closed ellipse centered at <code>cx, cy</code> with radius <code>rX, rY</code>
              using the current stroke color. If <code>filled</code> is true, the ellipse will be filled 
              with the current fill color.</td>
          </tr>
          <tr>
              <td class="state"><code>circle(cx, cy, radius[, filled])</code></td>
              <td>Draws a closed circle centered at <code>cx, cy</code> with radius <code>radius</code>
              using the current stroke color. If <code>filled</code> is true, the circe will be filled 
              with the current fill color.</td>
          </tr>
          <tr>
              <td class="state"><code>rectangle(x1, y1, x2, y2[, filled])</code></td>
              <td>Draws a rectangle described by the top-left at <code>x1, y1</code> to
              the bottom-right <code>x2, y2</code> using the current stroke color. If 
              <code>filled</code> is true, the rectangle will be filled with the current fill color.</td>
          </tr>
          <tr>
              <td class="state"><code>square(x, y, side[, filled])</code></td>
              <td>Draws a square at <code>x, y</code> with equilateral side length using the 
              current stroke color. If <code>filled</code> is true, the rectangle will be 
              filled with the current fill color.</td>
          </tr>
          <tr>
              <td class="state"><code>polygon(filled, ... vertices)</code></td>
              <td>Draws a polygon described by the vertexes in <code>vertices</code>,
              an array of 2-element arrays ([x, y], [x, y], ...) in the current
              stroke color. If <code>filled</code> is true the polygon will be closed
              and filled with the current fill color.</td>
          </tr>
          <tr>
              <td class="state"><code>regularPolygon(cx, cy, sides[, filled])</code></td>
              <td>Draws a regular polygon centered at <code>cx, cy</code> with <code>sides</code>
              sides in the current stroke color. If <code>filled</code> is true the polygon 
              will be filled with the current fill color.</td>
          </tr>
          <tr>
              <td class="header" colspan="2">Complex Drawing Operations</td>
          </tr>
          <tr>
              <td class="state"><code>shape(opaqueId)</code></td>
              <td>Renders the shape with the Id <code>opaqueId</code> at the current
              transform. Shapes are vector objects with a fixed set of rendering instructions
              that can represent a complex shape without needing to pass the rendering
              instructions.</td>
          </tr>
          <tr>
              <td class="state"><code>sprite(opaqueId, x, y)</code></td>
              <td>Renders the sprite with the Id <code>opaqueId</code> at the coordinates
              <code>x, y</code>. Sprites are provided by <code>SpriteSheets</code> and
              may be animated with multiple states per sprite.</td>
          </tr>
          <tr>
              <td class="state"><code>tile(opaqueId, x, y)</code></td>
              <td>Renders the tile with the Id <code>opaqueId</code> at the coordinates
              <code>x, y</code>. Tiles are provided by <code>TileSheets</code> and
              are not animated - only one image per tile.</td>
          </tr>
          <tr>
              <td class="state"><code>tileMap(opaqueId, x, y)</code></td>
              <td>Renders the tilemap with the Id <code>opaqueId</code> at the coordinates
              <code>x, y</code>. <code>TileMap</code> is a container that describes a
              way of laying out tiles and sprites. Tile maps can be simple orthogonal
              presentation or isometric for pseudo-3d.</td>
          </tr>
          <tr>
              <td class="header" colspan="2">Text Rendering</td>
          </tr>
          <tr>
              <td class="state"><code>async vecText(text, options[, textMeasure])</code></td>
              <td>Renders vector text starting at the current transform, in the current stroke 
              color, unless formatting is included. <code>options</code> allows for configuring 
              the default state. If an array is provided to <code>textSize</code>, it will be 
              filled with the pixel dimensions of the text rendered.</td>
          </tr>
          <tr>
              <td class="state"><code>async text(text[, style])</code></td>
              <td>Renders native text starting at the current transform, in the current stroke 
              color, unless formatting is included. <code>style</code> provides for applying
              default formatting.</td>
          </tr>
          <tr>
              <td class="header" colspan="2">Low-level Calls</td>
          </tr>
          <tr>
              <td class="state"><code>systemText("text")</code></td>
              <td>Prints a system text output at the current render transform. System text is
                  primarily used for outputting debug information. Use the <code>.text()</code>
                  and <code>.vecText()</code> methods for text output.
              </td>
          </tr>
          <tr>
              <td class="state"><code>getRenderTransform()</code></td>
              <td>Retrieves the current transform from the renderer's surface.
              </td>
          </tr>
          <tr>
              <td class="state">getter <code>state</code></td>
              <td>Returns the current context state object.</td>
          </tr>
      </tbody>
  </table>`);