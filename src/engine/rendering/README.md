# Rendering
The **RenderEngine4** has a flexible rendering pipeline that is adaptable to any rendering surface (Canvas 2d, WebGl, SVG) because it uses an intermediate language to represent the minimal requirements to implement a style of renderer. Rather than building rigid render pipelines, the separation of generation and rendering opens up the possibility for any combination, even supporting hardware not already native to the browser. The engine comes with vector and raster contexts, and canvas and webgl renderers, allowing for pairing the right renderer with the context. This separation of the system that generates the rendered content allows for near endless flexibility.

## **RenderContexts** - The interface to rendering
A `RenderContext` is the abstraction of a rendering style, and provides a high-level API that is exposed to the game. Using `RenderPart` 
component parts aligned with that style, the game emits the intermediate language representing the render state, and the renderer consumes the state to draw it. There are two render contexts provided with the engine: `VectorRenderContext` and `RasterRenderContext`.

The `VectorAPI` and `RasterAPI` provide the two high-level APIs and generate their respective `IL` that the `Renderer` will consume.

## **Intermediate Languages** - `VECTOR_IL` and `RASTER_IL`
The intermediate languages (`IL`) consist of an operator and its operands, similar in style to assembler. One operator with its operands produces a single rendered element in the renderer. The elements may be simple (line, point, rectangle) or complex (`Shape`, `CompiledShape`, or `Sprite`), but the invocation is always the same. Examples:

```javascript
// Draw a box
LINESEG 0
LINE 20 80 60 80
LINEREL 60 100
LINEREL 20 100
LINEREL 20 80
ENDSEG
```

```javascript
// Draw a quadratic curve
PUSH
TRANSFORM 0 0 1 0 0 1 10 50
CURVE 0 60 180
QUAD 90 160 100 50
QUAD 140 100 200 44
ENDCURVE
POP
```


For the vector-stlye, the language emits `points`, `lines`, `arcs`, `circles`, `ovals`, `line-` and `curve-paths`. Text is provided in a simple vector-based font, drawn on a 10x10 grid and intended to look quite retro a la: **Asteroids**, **Battletank**, **Major Havoc**, etc. 

The raster-style language emits `sprites`, `tiles`, `tilemaps`, and text rendering provided by the renderer. It also supports a small set of vector operations, including `points` and `lines`.

## **Renderers** - The method of rendering
A `Renderer` consumes the `IL` produced by the context and interprets it into the actual rendering code for the target renderer. 

The `CanvasRenderer` and `WebGlRenderer` both support _"compilation"_ to speed up repeated operations.

### Intermediate Language Compilation 
When possible, the `IL` is compiled into a function encapsulating the set of rendering calls that will draw a shape to the renderer's surface. This allows the game engine to be optimized for performance and memory usage by reusing compiled shapes, rather than re-emitting the `IL` to draw the shapes over-and-over. Compiling provides a moderate speedup on modern systems, but is more noticeable on older systems and mobile hardware. 

The compilation process is handed to an `Assembler` which translates the `IL` into the surface-direct rendering calls for the renderer.

## **Cameras** - The viewport into the world
Cameras provide a way to visualize the world outside of rendering the entire world. The world can be segmented into different viewports and target renderers using these cameras.

## **Shapes** - The basic building blocks of the game engine
Shapes represent a compiled object that is owned by the renderer. Renderers can be run anywhere, so the repeatability of shapes needs to be kept close to the renderers themselves. Shapes are represented in game by opaque Id's issued by the renderers.

