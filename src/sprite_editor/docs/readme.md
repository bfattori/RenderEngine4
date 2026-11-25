# Sprite Editor
To assist with the development of games, it is useful to have some tools to improve the experience. To that effect, I would like to create a Sprite Editor for the RenderEngine4. This editor should have a simple interface for editing pixel-based art. It should run in the browser, use the Canvas API for rendering pixel data, and HTML for the interface.

## Sprite Sheet
A sprite sheet defines a collection of sprites, all occupying different areas of the same bitmap image. This is an example of a sprite sheet:

```json
{
   "spriteSheet": true,
   "version": 1,
   "bitmap": {
      "image": "./images/tiles/smbtiles.png",
      "width": 320, 
      "height": 320
   },
   "sprites": {
      "mario": {
         "stand": [0, 0, 32, 32],
         "walk": [32, 0, 32, 32, 3, 10, "loop"],
         "jump": [0, 32, 32, 32],
         "skid": [32, 32, 32, 32],
         "die": [128, 32, 32, 32]
      },
      "super": {
         "stand": [0, 64, 32, 64],
         "walk": [32, 64, 32, 64, 3, 6, "loop"],
         "jump": [0, 128, 32, 64],
         "skid": [32, 128, 32, 64],
         "duck": [128, 128, 32, 64]
      },
      "goomba": [256, 96, 32, 32, 2, 2, "loop"],
      "green_koopa": [0, 192, 32, 64, 2, 2, "loop"],
      "red_koopa": [96, 192, 32, 64, 2, 2, "loop"],
      "green_shell": [64, 192, 32, 32],
      "red_shell": [64, 224, 32, 32],
      "coin": [128, 0, 32, 32, 4, 10, "loop"],
      "q_block": [160, 33, 32, 32, 3, 10, "bounce"],
      "brick": [160, 96, 32, 32],
      "mushroom": [160, 64, 32, 32],
      "princess": [128, 64, 32, 64]
   }
}
```
Sprite sheets are identified by "spriteSheet", followed by a version number.

### "bitmap" Section
The source "bitmap" defines the location of the image file and its width and height.

### "sprites" Section
"sprites" contains each of the sprite definitions for each named sprite. A sprite definition as an array indicates a single state sprite. A definition as an object indicates multiple states, where each state is a different representation of the same sprite.

#### Sprite States 
Each state can be defined by either:
1. An array consisting of the coordinates and dimensions of the sprite: [x, y, width, height]
2. An array consisting of the coordinates and dimensions, but including 3 additional parameters: frameCount, speed, and animation type. Frame count is the number of frames in the animation. Speed is the number of frames per second at which the animation switches to the next frame. Animation type is one of "loop", "bounce", or "once".



A sprite is a graphical object displayed in video games. Sprites are bitmap images Sprites consist of one or more states, each of which may be a single bitmap image, or a series of images to be presented as an animated sequence.



## Interface
The interface should be clean with the following layout:

### Left-hand toolbar
A set of tools down the left-hand side, displayed as simple buttons with text on it. The tools the editor should support are:
1. A color picker to select the current drawing color.
2. A selection tool to select an area of pixels for copying and pasting.
3. A brush tool to apply pixels of the current color to the grid.
4. An eraser tool to clear pixels in the grid.
5. A clear tool to clear all pixels in the grid.
6. A fill tool to fill a selected area with the current color.

### The drawing area
The central area has two views as tabs:
1. A grid of pixels used to edit the current frame. The grid can be visually toggled on or off, but pixels are always placed aligned to the grid. The grid should be resizable to accommodate different sizes of sprites. The view should be scalable to allow zooming into the grid. A left-click of the mouse places pixels of the current color in the grid, or removes them based on the tool.
2. A view of the bitmap containing all of the sprites and frames. The bitmap can be zoomed in and out using the mouse wheel. Clicking on a sprite in the bitmap selects it for editing, loads the first frame into the editor

2. An area for property configuration on the right-hand side (properties depend on the tool)
3. An area where the user can draw or edit pixels. The area is a resizable grid defined by the user. Common sizes are 8, 16, 32, 64, and 128 pixels, where the dimensions may be the same or different for each axis. E.g. 8x8, 16x32, 64x64.
4. An animation scrubber at the bottom with buttons to add the current drawing as a frame, a way to remove an existing frames, a way to select a frame to edit, and a way to playback the animation. Playback should be based on a user-defined speed (frames-per-second). There should be an option to configure the playback of the animation as a loop, bounce (play to end, reverse, play to beginning, reverse, repeat), or one time playback.
5. A way to save and load sprites from "sprite definition files" (example provided below).

