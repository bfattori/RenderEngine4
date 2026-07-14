# Agent: RenderEngine4

### Core Engine Analysis Summary:
- **renderEngine4.js**: Acts as the bootstrapper. It initializes the `Engine` class using provided options and exposes the engine instance via `RenderEngine.RE4`. It also handles global scope assignments and provides high-level lifecycle methods (`init`, `start`, `pause`, `stop`, `shutdown`).
- **Context.js**: Provides a singleton `Context` class with a `debug` flag, likely used for global engine state and debugging toggles.
- **Constants.js**: Contains critical engine configurations, including:
    - **Component Priorities**: Defines execution order for different component types (Input, Transform, Collider, Render, Sound).
    - **Default Engine Options**: Sets defaults for world dimensions, FPS, threading, and a comprehensive set of **lifecycle hooks** (e.g., `onBeforeFrame`, `onUpdate`, `onRender`, `onCollision`).
    - **Canvas Defaults**: Standardizes rendering parameters like `globalAlpha`, `lineJoin`, and `font`.
- **Engine Source Code**: Located in `src/engine/*`

The `Engine` class is the central orchestrator of the RenderEngine4 system. Here is a detailed breakdown of its architecture and responsibilities:

### 1. Core Architecture & State
- **Singleton-like Management**: While it's a class, it uses a `primary` object to store the current `ENGINE` instance, allowing for static access to the engine and its core components (`world`, `eventEngine`, `particleEngine`, `renderContext`).
- **Private State**: It uses private class fields (e.g., `#WORLD`, `#ENGINE_OPTIONS`, `#currentTime`) to encapsulate the engine's internal state, ensuring that state changes occur through defined methods.
- **Initialization**: The `init()` static method sets a `waitInit` flag, ensuring that `new Engine()` can only be called after the configuration has been processed.

### 2. Lifecycle Management
The engine manages the entire lifecycle of a game session through several key methods:
- **`init(options)`**: Merges user-provided options with `Constants.DEFAULT_ENGINE_OPTIONS` and initializes all core sub-systems (EventEngine, GameWorld, ParticleEngine, CollisionModel).
- **`start()`**: Initiates the main game loop using `requestAnimationFrame`. It handles high-level timing and triggers the lifecycle hooks.
- **`stop()` / `reset()` / `destroy()`**: Provides clean teardown paths. `destroy()` specifically handles the asynchronous shutdown of sub-systems to ensure resources are freed correctly.

### 3. The Game Loop & Hooks
The loop inside `start()` is the heartbeat of the engine. It follows a strict sequence, executing specific lifecycle hooks at each stage:
1.  **`onBeforeFrame`**: Triggered before any logic starts.
2.  **`onBeforeUpdate`**: Triggered before the world state is updated.
3.  **`update(currentTime, deltaTime)`**: Updates the `GameWorld` and `RenderContext`.
4.  **`onUpdate`**: Triggered after the update logic completes.
5.  **`onPreRender`**: Triggered before the rendering phase.
6.  **`renderWorld(currentTime, deltaTime)`**: Executes the actual scene rendering.
7.  **`onRender`**: Triggered after rendering completes.
8.  **`onFrame`**: Triggered after the entire frame is finished.

### 4. Key Sub-Systems Managed by Engine
- **`GameWorld`**: Manages game objects, spatial logic, and the camera.
- **`EventEngine`**: Handles the pub/sub system for engine-wide events.
- **`ParticleEngine`**: Manages the particle system.
- **`RenderContext`**: Orchestrates the actual rendering of the `GameWorld` objects.
- **`CollisionModel`**: Injected into the world to define how collision detection behaves (defaults to `AABBCollisionModel`).

### 5. Utilities
- **`serialize()`**: A utility for deep-cloning objects into plain objects, useful for saving game states or network synchronization. It supports ignoring specific keys during the process.
