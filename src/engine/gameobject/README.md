# GameObject
This is the foundation of all of your in-game objects. There isn't a need to create monolithic objects that support everything, or super-specific objects to run a simple function. Instead, through component part composition, a `GameObject` gains its functionality.

## Composition
There are five (5) different component parts that can be added to a GameObject: `TransformPart`, `RenderPart`, `ColliderPart`, `InputPart`, and `SoundPart`. Each of these components provides a specific function or set of functions. For example, the `Transform` component is responsible for positioning and rotation of an object in world space, while the `RenderPart` component is responsible for drawing the object to the renderer.

You compose parts to establish _only the functionality needed_ to implement the desired behavior. No need to drag around code that is unused or not necessary. This makes it easier to maintain and scale your game as you add more features and complexity.

## Local Event Context
Within each `GameObject` is a local event context. This context is unique to the `GameObject` allowing events to pass information internally from one part to another. This prevents pollution of the engine's `EventEngine` subscribers and publishers. Component parts can subscribe to listen for events published by other parts. This nominally allows an object to react to changes, rather than having to poll for them.
