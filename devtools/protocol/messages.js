/*
 * RenderEngine4 Inspector — shared message catalog.
 * ============================================================================
 * Single source of truth for every message type that crosses the
 * panel <-> engine boundary. See README §"Message protocol" for the full
 * specification (envelope shape, direction, semantics).
 *
 * Dual-format by design:
 *   - The game page and the engine-side bridge load this file as a CLASSIC
 *     <script> (no build step), which exposes `globalThis.RE4_MESSAGES`.
 *   - The DevTools panel imports it for side effects and then reads the same
 *     global.
 * Keep it dependency-free — it is the one file both sides must agree on.
 */
(function (global) {
  'use strict';

  if (global.RE4_MESSAGES) return; // already loaded (HMR / double include)

  /** Bump whenever the envelope shape or an existing type's payload changes. */
  const PROTOCOL_VERSION = 1;

  /** Name of the global the bridge installs on the game's `window`. */
  const BRIDGE_GLOBAL = '__RE4_DEBUG__';

  /**
   * Commands — panel → engine.
   * Delivered via `bridge.receive(envelope)`. A handler registered for the
   * command type is invoked as `handler(payload, envelope)`.
   */
  const CMD = Object.freeze({
    /** Start the engine (game loop). Idempotent. */
    START: 're4/cmd/start',
    /** Stop the engine and release the frame loop. Idempotent. */
    STOP: 're4/cmd/stop',
    /** Advance exactly one frame while not running, then hold. */
    STEP: 're4/cmd/step',
    /** Pause the engine */
    PAUSE: 're4/cmd/pause',
    /** Shutdown the engine and release all resources. Idempotent. */
    SHUTDOWN: 're4/cmd/shutdown',
    /** Toggle a named boolean feature: payload = { path, value? } */
    TOGGLE: 're4/cmd/toggle',
    /** Set a named runtime parameter: payload = { path, value } */
    SET_PARAM: 're4/cmd/set-param',
    /** Request a state snapshot; engine answers with EVT.RESPONSE. */
    QUERY: 're4/cmd/query',
  });

  /**
   * Events — engine → panel.
   * Pushed via `bridge.emit(type, payload)` and drained by the panel's
   * transport poll.
   */
  const EVT = Object.freeze({
    /** Periodic runtime status: { state, frame, fps?, stats? } */
    STATUS: 're4/evt/status',
    /** Request/response pair: payload = { id, ...response } (see README). */
    RESPONSE: 're4/evt/response',
    /** Free-form log line: { level: 'info'|'warn'|'error', message } */
    LOG: 're4/evt/log',
    /** World subsystem snapshot (camera, objects, collision, rendering refs). */
    WORLD: 're4/evt/world',
    /** Game object list / detail data for the Game Objects tab. */
    GAME_OBJECTS: 're4/evt/game-objects',
    /** Event Engine data (subscriptions, local contexts, dispatch). */
    EVENT_ENGINE: 're4/evt/event-engine',
    /** Particle system data (mode, manager, orchestrator, workers). */
    PARTICLES: 're4/evt/particles',
    /** Rendering subsystem data (render contexts, renderers). */
    RENDERING: 're4/evt/rendering',
    /** Spark Memory Manager data (pools, allocation stats). */
    MEMORY: 're4/evt/memory',
  });

  global.RE4_MESSAGES = Object.freeze({
    PROTOCOL_VERSION,
    BRIDGE_GLOBAL,
    CMD,
    EVT,
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
