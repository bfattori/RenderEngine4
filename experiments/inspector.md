# RenderEngine4 Chrome DevTools Extensio
I need help developing a Chrome DevTools extension to use for debugging the game engine I am writing. I will describe what it needs to be from which you will build the scaffolding that I can then add functionality to.

## Description
I want a DevTools extension that connects to a game running in the browser itself. This is all local to the browser so there is no need to include WebSocket communications at this time. The extension is intended to allow real-time debugging of the engine. It needs to be able to stop and start the engine, step frame by frame, and provide for the inspection the major parts of the engine itself.

### Major parts of the RenderEngine4 game engine
1. **Engine** - The core of the engine. Provides the game loop and startup/shutdown function primarily.
2. **World** - The container for all objects the engine manages. It contains references to the the world Camera, the Game Objects in the world, the world Collision Model, the Render Context, and the Renderer.
3. **Game Objects** - Each game object is a composition of parts, with each part being atomic functionality of the Game Object. The parts derive from base parts: Transform, Render, Input, Collision, and Sound. Game Objects contain a private event context for the parts to use for internal communication separate of the game's Event Engine.
4. **Event Engine** - The primary game engine communication system. Pub/sub style. The Event Engine is a factory for the local event context of Game Objects.
5. **Particle System** - The particle system is an entirely different engine running in one of two ways: bound to the Engine's update/render loop, or using a Particle Manager abstraction, Orchestrator, and Particle Worker threads for performance.
6. **Rendering Subsystem** - Render Contexts and Renderers provide the two parts of the rendering subsystem within the engine.
7. **Spark Memory Manager** - The game uses an internal memory manager, primarily for the particle system, to minimize garbage collection and enhance overall performance.

## Instructions
It isn't necessary to completely understand the engine to design the scaffolding for a Chrome DevTools extension. What I provided above should help to inform what I am trying to do and possible ideas when it comes to the development of the extension. What _is important_ is to build the scaffolding for the extension so that, later on, I will be able to add the functionality that displays useful information the game developer can work with. 

**Note:** _This first iteration (MVP-0) of the Chrome DevTools extension should **only** provide:_

1. The scaffolding for a Chrome DevTools extension, including all of the necessary files, and a README with notes and information about its functionality, your architectural decisions, and examples where appropriate.
2. A communication layer between the game engine and the extension to allow for _near_ real-time updates between the two ends. It should be simple to develop with and use a well-defined protocol.
3. The primary layout should have two areas divided vertically with the top area being for engine runtime information, and the bottom area being a set of tabbed pages with a tab for each of the Major Parts outlined above.
4. Each tab should have a left sidebar, divided vertically into "items relative to the tab." For example, the **World** tab's sidebar would have items for each of the references it contains. The area to the right of the sidebar will be the "content area" where relevant information about the item is displayed. Selecting an item in the sidebar should display the related "content area".
5. Each "content area" will be a place wherein exists things like checkboxes for toggling functionality on and off, input boxes to change runtime parameters, sliders, and other types of controls that allow for user interaction with the engine.

## Wrap up
Name the extension "RenderEngine4 Inspector". Only create the scaffolding that necessary to implement the instructions above. _Do not_ implement functionality in the "content areas" at this time.

Generate the content into the folder "C:\dev\RenderEngine4\devtools". Do not commit it to the repository so I can inspect what you have created.