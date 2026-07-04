# RenderEngine4

RenderEngine4 is a lightweight 2D game engine implemented in plain JavaScript. It focuses on a component-based architecture, simple render loops, and modular subsystems for world management, event handling, collision, rendering, and audio.

**This is a work in progress and not yet fully functional**

## Project Status

- Source modules are located under `src/engine/`.
- There is no `package.json` or npm script configuration in this repository.
- There is no top-level runtime entrypoint such as `src/index.js`.
- The project is currently a library/codebase rather than a packaged application.

## Repository Structure

- `spec/` � Specification files defining engine architecture, features, and class contracts
- `src/engine/` � Core implementation
  - `Engine.js` � Main engine loop and orchestration class
  - `EventEngine.js` � Event handling subsystem
  - `GameWorld.js` � World object container and update loop
  - `rendercontexts/` � Render context contract and implementations
    - `RenderContext.js` � Base render context interface/contract
    - `vector/VectorRenderContext.js` � Vector rendering implementation
    - `raster/` � Placeholder folder for raster rendering support
  - `renderengine/RenderEngine.js` � Rendering orchestration module
  - `sound/` � Audio playback systems and components
  - `collisions/` � Collision model base and algorithms
  - `components/` � Game component classes and implementations
  - `gameobject/` � `GameObject` base class and helpers
  - `particlesystem/` � Particle system support modules

## Getting Started

This repository is currently a source-only project. To start working with it:

1. Add a `package.json` with `type: "module"` if you want to run the code in Node.js.
2. Create a runtime entrypoint such as `src/index.js` that imports and initializes the engine.
3. Optionally add build and test scripts for your workflow.

## Usage Notes

- The engine uses ES module syntax with `export default` in core files.
- The render context architecture supports plane-based rendering and vector rendering via `VectorRenderContext`.
- Collision models are implemented under `src/engine/collisions/models/`.

## Contributing

Contributions are welcome. The project currently has no automated build or test harness, so changes should be validated by reading source files and adding a runtime entrypoint for manual execution.

## License

Apache 2.0 License

