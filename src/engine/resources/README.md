# Resources
The **RenderEngine4** loads externally-defined resources at run-time to provide imagery, sprites, sounds, and other assets to the game engine. There are several resource types available.

## `Resource`
This is the base class for all resource types. It provides a loading mechanism that understands the relativity of file locations, and has methods for loading and unloading resources.

## `ImageResource`
Loads an image from the given Url. `ImageResource` is used internally by `SpriteSheet` and `TileSheet`.

## `SpriteSheet`
A sprite sheet defines the bitmap image containing the sprites, the bitmap size, and the sprites contained within the sheet.

```json
{
   "spriteSheet": true,
   "version": 1,
   "bitmap": {
      "image": "./images/particles/smoke.png",
      "width": 200, 
      "height": 50
   },
   "assumeOpaque": true,
   "sprites": {
      "smoke1": [0,0,50,50],
      "smoke2": [50,0,50,50],
      "smoke3": [100,0,50,50],
      "smoke4": [150,0,50,50]
   }
}
```

## `Sprite`
A sprite is a bitmap, or set of bitmaps, extracted from a `SpriteSheet`'s bitmap that are either static or animated. Sprites have states to control the appearance of the `Sprite` when rendered. The animation frame is either render-dependent (synchronized to the render loop), or render-independent (manual frame control), depending on the needs. Several animation types are supported (`loop`, `bounce`, and `once`). With different modifiers to affect frame generation (`ease-in`, `ease-out`, `ease-in-out`, and `linear`).

## `TileSheet`
Tile sheets, like a sprite sheet, defines tiles. However, tiles are static and do not have animations. Animated tiles are sprites.

```json
{
  "tileSheet": true,
  "version": 1,
  "bitmap": {
    "image": "./images/tiles/floortiles.png",
    "width": 448, 
    "height": 32
  },
  "assumeOpaque": true,
  "tiles": {
    "wires": [0,0,32,32],
    "glassblock": [32,0,32,32],
    "glassLeft": [64,0,32,32],
    "glassMid": [96,0,32,32],
    "glassRight": [128,0,32,32]
  }
}
```

## `Tile`
A static bitmap image with pre-defined dimensions that _do not change over time._ There is one frame: the single image extracted from the `TileSheet`'s bitmap.

## `TileMap`
Tile maps are collections of tiles and sprites that infer the way in which the contents are rendered. Some tile maps contain procedural elements (like the `isometric` tile map) while others use a rigid layout (like the `platformer` tile map). There are a few supported types of tile map.

## `Sound`
A sound is an asset used with the sound systems available in the **RenderEngine4**.