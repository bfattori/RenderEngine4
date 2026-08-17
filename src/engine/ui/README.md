# User Interface Controls
The user interface package contains the text renderers, debug tools, and some user interface classes.

## Debug
Debug objects include:
- `CanvasPIP` - A picture-in-picture style view for a canvas. Used by the particle engine when threaded.
- `DebugObjects` - A set of renderable objects like origin, bounding box, etc.
  - `Origin` - A red line up and blue line to the right representing the origin of a shape.
  - `BoundingBox` - A bounding box around a shape, displaying width and height in pixels.
  - `SeparationLine` - A line representing the separation between two shapes, showing the distance in pixels.
  - `ContactOverlap` - A polygon showing the overlap of two shapes based on collision type.

- `FPSCounter` - An FPS counter that display FPS, with update, render, and CPU loads. Extends `LoadCounter`.
- `LoadCounter` - A generic load counter that can be configured to display a variety of information.

## Text
The text parsers are used for rendering text to the screen, while supporting a markup lanaguage allowing for custom formatting of the text produced.
- `RasterTextParser` - The raster text parser applies styles to text produced by the `Canvas` natively.
- `VectorTextParser` - The included vector text renderer can be used to render text with a simple vector character set.
- `vector_character_set` - The simple vector character set including most of the ASCII character set.


## User Interface Controls
- `Slider` - A horizontal or vertical slider with a configurable range, labels, min and max values, tick marks, and stepsize for indexed sliders.
