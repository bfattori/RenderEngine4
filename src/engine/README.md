# RenderEngine4

## Engine Parts
 - **`/collisionModels`** - The models used by the engine to detect and report on collisions
 - **`/core`** - The engine proper, including the `Engine`, `Config`, `EventEngine`, `GameWorld`, `Console`, and various utilities
 - **`/gameobject`** - The foundation of all in-game objects
 - **`/particlesystem`** - The particle rendering system
 - **`/parts`** - Component parts are the building blocks for `GameObject` and are composed to grant functionality
 - **`/rendering`** - The render pipelines for the engine
 - **`/sound`** - The engine's sound systems, including `BrowserAudioSystem`, `WebAudioSystem`, and `SpatialAudioSystem`
 - **`/ui`** - User interface components, debug interface components, the vector font, and other user interface-related code

## Files
- `Constants.js` - The game engine's constant values
- `Context.js` - A shared context that is used to access debug and engine options at run-time
- `renderEngine4.js` - The engine bootstrapper
- `README.md` - This file
