## System & Persona Context
- **Technology Stack**: JavaScript (ESM), HTML5, CSS3, WebGL, Canvas API.
- **Agent Role**: You are an expert software architect and systems engineer specializing in high-performance graphics engines, game loops, and modular component-based architecture. Focus on maintainability, performance optimization, and strict adherence to the engine's hierarchical structure.

## Project Map & Entry Points
- **Core Engine**: `src/engine/` contains the heart of the system (Engine, GameWorld, EventEngine, Matrix).
- **Rendering Pipeline**: `src/engine/rendering/` handles Canvas/WebGL assemblers, cameras, and contexts.
- **Game Objects & Parts**: `src/engine/gameobject/` and `src/engine/parts/` define the entity-component-like structure.
- **Physics & Collision**: `src/engine/collisionModels/` and `src/engine/parts/collision/` manage spatial logic.
- **Systems**: `src/engine/sound/`, `src/engine/particlesystem/`, and `src/engine/ui/` manage auxiliary systems.
- **Entry Points**: 
    - `src/index.html`: Main application entry.
    - `src/engine/renderEngine4.js`: Global bootstrapper and API surface.
- **Tests**: Located in `tests/js/` and `tests/` (HTML test pages).

## Verification Commands
- **Type Checking/Linting**: No explicit `package.json` scripts found; assume standard JS linting if configured.
- **Running Tests**: 
    - Open `tests/testGameObjects.html` or `tests/testRenderPipeline.html` in a browser to verify logic.
    - Execute JS tests in `tests/js/` via browser console or integrated test runners.

## Local Norms & Coding Style
- **Modular Architecture**: Use the `parts/` directory to compose complex behaviors; avoid monolithic classes.
- **Context Awareness**: Always access engine state through the `RenderContext` or `GameWorld` rather than global variables.
- **Immutability**: Use `structuredClone` for options to prevent side effects (as seen in `renderEngine4.js`).
- **Private Fields**: Prefer `#privateFields` for internal engine state to maintain encapsulation.

```javascript
// Good Style: Using structuredClone for options
get startupOptions() {
    return structuredClone(engineOptions);
}
```

## Guardrails & Boundaries
**Do Not Touch:** `src/engine/core/` (unless modifying core engine logic), `src/engine/rendering/assemblers/` (low-level math/rendering), and `LICENSE.md`.

**Security:** Never hardcode credentials or secrets.

**Permissions:** Do not modify `.github/` workflows or configuration files without explicit instruction.

## Self-Correction & Learning Loop
If you discover this map is stale, update it. If the user gives a specific correction about repository workflows, immediately append it to the 'Local Norms' section so future AI sessions inherit it.