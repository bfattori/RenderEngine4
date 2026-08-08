# ComponentParts 
> The building blocks of `GameObject`

A component part is an atomic unit of functionality that a `GameObject` uses to perform some operation. The component parts are divided into functional areas including input, transform, and rendering for example. These different parts are composed into the `GameObject` to give it its functionality. Rather than designing a monolithic object that contains all the functionality, `GameObjects` are intended to be light-weight containers that glue components together.

## Collision
The `CollisionPart` creates an interface from a `GameObject` to the collision model provided by the `GameWorld`. Several collision models can be used, with different collision parts to match.

## Input
`InputComponent` is the interface to the human playing the game. Input components include `KeyboardInput` and `MouseInput` that re-route event data into your `GameObject` for handling.

## Render
The `RenderPart` components interface your `GameObject` with the rendering pipelines. There are different component parts such as sprites, vector shapes, particle emitters, and more.

## Sound
When your `GameObject` needs to do something that isn't visual, `SoundPart` components interface your `GameObject` to the engine's sound system. There are basic to complex systems available for rendering complex sound effects.

## Transform
Unless a `GameObject` is static in the world (totally possible) you probably want to move it around. A basic `Transform2dPart` manipulates the coordinate system of the `GameObject` in relation to the object itself, or to the world. The more involved `Mover2dPart` has simple physics-like properties that generate movement over time.
