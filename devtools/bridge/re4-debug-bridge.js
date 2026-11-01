/*
 * RenderEngine4 Inspector — engine-side bridge (MVP-0).
 * ============================================================================
 * Include this in the game page AFTER protocol/messages.js and BEFORE (or
 * independently of) engine startup:
 *
 *   <script src="devtools/protocol/messages.js"></script>
 *   <script src="devtools/bridge/re4-debug-bridge.js"></script>
 *
 * It installs a single global, `window.__RE4_DEBUG__`, which is the ONLY
 * surface the DevTools panel can talk to. The panel never touches anything
 * else on your page, so the bridge keeps the debug surface small, stable,
 * and safe to ship (guard it in your build pipeline if you like).
 *
 * Bridge API
 * ----------
 *   bridge.on(type, handler)      Subscribe to a command type.
 *                                 handler(payload, envelope) => void
 *   bridge.off(type, handler)     Remove a subscription.
 *   bridge.emit(type, payload)    Push an event to the panel outbox.
 *   bridge.receive(envelope)      Called by the panel (via eval). Do not
 *                                 call this yourself.
 *   bridge.drain()                Called by the panel (via eval). Returns
 *                                 and clears the event outbox.
 *   bridge.enabled                true/false master switch (default: true).
 *
 * Minimal wiring for the run-control commands (see examples/demo-engine.html
 * for a complete, runnable example):
 *
 *   const bridge = globalThis.__RE4_DEBUG__;
 *   const M = globalThis.RE4_MESSAGES;
 *
 *   bridge.on(M.CMD.START, () => engine.start());
 *   bridge.on(M.CMD.STOP,  () => engine.stop());
 *   bridge.on(M.CMD.STEP,  () => engine.stepFrame());
 *
 *   // Inside your game loop (throttled to ~10-30 Hz is plenty):
 *   bridge.emit(M.EVT.STATUS, { state: 'running', frame, fps, stats: {...} });
 */
(function (global) {
  'use strict';

  const M = global.RE4_MESSAGES || Object.freeze({
    PROTOCOL_VERSION: 1,
    BRIDGE_GLOBAL: '__RE4_DEBUG__',
  });

  if (global[M.BRIDGE_GLOBAL]) return; // bridge already installed

  /** Bounded outbox so a closed DevTools panel can never grow memory. */
  const MAX_OUTBOX = 256;
  const outbox = [];

  /** type -> Set<handler> */
  const handlers = new Map();

  let enabled = true;

  function emit(type, payload) {
    if (!enabled || typeof type !== 'string') return;
    outbox.push({
      v: M.PROTOCOL_VERSION,
      type,
      payload: payload === undefined ? null : payload,
      ts: Date.now(),
    });
    if (outbox.length > MAX_OUTBOX) {
      outbox.splice(0, outbox.length - MAX_OUTBOX); // drop oldest
    }
  }

  function safeEmit(type, payload) {
    try {
      emit(type, payload);
    } catch (err) {
      // A broken subscriber must never take the engine down.
      // eslint-disable-next-line no-console
      console.error('[RE4 bridge] emit failed:', err);
    }
  }

  const bridge = {
    /** Bridge version (handy for panel compatibility checks later). */
    version: '0.1.0',

    /** Master switch. When false, receive() no-ops and emit() is dropped. */
    enabled: {
      get: () => enabled,
      set: (value) => {
        enabled = Boolean(value);
      },
    },

    /**
     * Subscribe to a command type (see RE4_MESSAGES.CMD).
     * @returns {() => void} unsubscribe function.
     */
    on(type, handler) {
      if (typeof type !== 'string' || typeof handler !== 'function') {
        throw new TypeError('bridge.on(type, handler)');
      }
      let set = handlers.get(type);
      if (!set) {
        set = new Set();
        handlers.set(type, set);
      }
      set.add(handler);
      return () => bridge.off(type, handler);
    },

    /** Remove a handler previously added with bridge.on. */
    off(type, handler) {
      const set = handlers.get(type);
      if (set) set.delete(handler);
    },

    /**
     * Push an event to the panel (see RE4_MESSAGES.EVT).
     * Events are buffered in the outbox until the panel drains them.
     */
    emit: safeEmit,

    /**
     * Entry point used by the DevTools panel to deliver a command envelope.
     * @param {{v:number,id:string,type:string,payload:any,ts:number}} cmd
     * @returns {{ok:boolean,id?:string,handled?:boolean,error?:string}} ack
     */
    receive(cmd) {
      if (!enabled) return { ok: false, error: 'bridge-disabled' };
      if (!cmd || typeof cmd !== 'object' || typeof cmd.type !== 'string') {
        return { ok: false, error: 'bad-command' };
      }

      const set = handlers.get(cmd.type);
      const handled = Boolean(set && set.size > 0);

      if (handled) {
        // Iterate a copy so handlers can safely (un)subscribe mid-dispatch.
        for (const handler of [...set]) {
          try {
            handler(cmd.payload, cmd);
          } catch (err) {
            safeEmit('re4/evt/log', {
              level: 'error',
              message: `handler for ${cmd.type} threw: ${err && err.message ? err.message : String(err)}`,
            });
          }
        }
      } else {
        safeEmit('re4/evt/log', {
          level: 'warn',
          message: `no handler registered for ${cmd.type}`,
        });
      }

      return { ok: true, id: cmd.id, handled };
    },

    /**
     * Entry point used by the DevTools panel to collect pending events.
     * @returns {Array<{v:number,type:string,payload:any,ts:number}>}
     */
    drain() {
      return outbox.splice(0);
    },
  };

  global[M.BRIDGE_GLOBAL] = bridge;
})(typeof globalThis !== 'undefined' ? globalThis : window);
