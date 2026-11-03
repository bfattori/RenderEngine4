# Rendering
The **RenderEngine4** has a flexible rendering pipeline that is adaptable to any rendering surface (Canvas 2d, WebGl, SVG) because it uses an intermediate language to represent the minimal requirements to implement a style of renderer. Rather than building rigid render pipelines, the separation of generation and rendering opens up the possibility for any combination, even supporting hardware not already native to the browser. The engine comes with canvas and webgl renderers, allowing for pairing the right renderer with the context. This separation of the system that generates the rendered content allows for near endless flexibility.

## **High-Level Rendering API**
To provide a consistent interface to games, a high-level API is provided to `RenderPart` by `RenderContext`. This renderer-agnostic API allows a developer to write game code without needing to know the specifics of `Canvas` or `WebGL` to make use of their features. It is still possible to access the `Renderer` directly and manipulate it directly, but the high-level API removes the need to do so.

An example of direct-calling the API in the `RenderContext`:
```javascript
// get the API for drawing shapes and text
const context = RE4.world.renderContext;
const api = context.getAPI();

// chainable for multiple calls
api
    .color("#0000ff").width(5)            // stroke color: blue, line width 5 pixels
    .line(100, 100, 300, 300)             // line from 100,100 to 300,300
    .fillColor("#8800cc")                 // fill color: purple
    .circle(100, 100, 50, true)           // filled circle w/radius 50 at 100,100
    .color("#ff9100").width(10)           // stroke color: orange, line width 10 pixels
    .circle(100, 100, 50, false)          // stroked circle w/radius 50 at 100,100
    .resetWidth();                        // reset line width to default

// Run out one frame to render it   
RE4.update(0, 0);
RE4.renderWorld();    
```
The example above shows a direct call to the engine to render out a single frame. In a game context, this is  handled internally by `RenderPart` components and the game engine during the update/render loop. Starting the engine begins the loop until the engine is stopped, paused, or shut down.

### Engine control methods:
```javascript
// Start the render loop   
RenderEngine.start();

// Pause the render loop - restart with ".start()"
RenderEngine.stop();

// Step a single frame - engine must be paused
RenderEngine.step();

// Shutdown the engine, freeing everything
RenderEngine.shutdown();
```

## **Intermediate Language**
The high-level API is generated into an "intermediate language" by the `RenderContext` to generate a syntax that creates the visual output. It resembles Assembly language with an operator (command) and its operands (arguments). Each command produces a single rendered element in the renderer. The elements may be simple (line, point, rectangle) or complex (line segment, polygon, curve, `CompiledShape`, `Sprite`, `Tile`, or `TileMap`), but the invocation is always the same. Examples:

**A simple box**
```javascript
// Draw a box
LINESEG 0
LINE 20 80 60 80
LINEREL 60 100
LINEREL 20 100
LINEREL 20 80
ENDSEG
```

**A quadratic curve**
```javascript
// Draw a quadratic curve
CURVE 0 60 180
QUAD 90 160 100 50
QUAD 140 100 200 44
ENDCURVE
```

**A compiled shape**
```javascript
// Draw a compiled shape
PUSH
TRANSFORM 0 0 1 0 0 1 10 50
SHAPE 36
POP
```

## **RenderContext** - Rendering abstraction
A `RenderContext` is the abstraction for rendering and provides the high-level API that is exposed to the game. Using `RenderPart` components, or direct calls to the context's API, the game emits the `IL` representing each render action. The renderer consumes the actions and renders them to its display surface. The render context generates both vector-style (line) and raster (sprite) intermediate language.

## **Renderers** - Concrete rendering implementation
A `Renderer` consumes the `IL` produced by the context and interprets it into the actual rendering code for the target renderer. 

The `CanvasRenderer` and `WebGlRenderer` both support _"compilation"_ to speed up repeated operations.

> ### Intermediate Language Compilation 
> When possible, the `IL` is compiled to a JavaScript function encapsulating the set of rendering calls that will draw the shape to a renderer's surface. This allows the game engine to optimize for performance and memory usage by reusing compiled shapes, rather than re-emitting the `IL` to draw the shape over-and-over. Compiling provides a moderate speedup on modern systems, but is more noticeable on older systems and mobile hardware. 
>
> The compilation process is handed to an `Assembler` which translates the `IL` into the surface-native rendering calls used by the renderer.

## **Cameras**
Cameras provide a way to visualize the world outside of rendering the entire world. The world can be segmented into different viewports and target different renderers using those cameras.

## **Shapes**
Shapes represent a compiled object that is owned by the renderer. Renderers can be run anywhere, so the repeatability of shapes needs to be kept close to the renderers themselves. Shapes are represented in game by opaque Id's issued by the renderers.

