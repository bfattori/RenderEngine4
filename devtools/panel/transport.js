/**
 * Transport — moves message envelopes across the panel <-> page boundary.
 * ============================================================================
 * Mechanism: `chrome.devtools.inspectedWindow.eval`.
 *
 *   panel -> engine : eval a one-liner that calls `bridge.receive(envelope)`
 *   engine -> panel : eval a one-liner that calls `bridge.drain()` and
 *                     returns the pending events as a JSON string
 *
 * Envelopes cross the boundary as JSON *strings* — eval results must be
 * cloneable primitives/objects, and strings are the least surprising choice
 * (no structured-clone surprises, no object-graph identity issues).
 *
 * The engine->panel direction is a 100 ms poll (configurable). With typical
 * payload sizes this is effectively "near real-time" for a debugger; it is
 * also completely safe — the worst case is a slightly stale read. See README
 * §"Why eval + polling?" for the trade-offs and upgrade paths.
 */
import '../protocol/messages.js';

const BRIDGE_GLOBAL = RE4_MESSAGES.BRIDGE_GLOBAL;

/** Expression that delivers `envelope` to the bridge and returns its ack. */
function sendExpression(envelopeJson) {
  return `(function () {
    var b = globalThis.${BRIDGE_GLOBAL};
    if (!b || typeof b.receive !== 'function') return null;
    return JSON.stringify(b.receive(${envelopeJson}));
  })()`;
}

/** Expression that drains and returns the bridge outbox as a JSON string. */
function drainExpression() {
  return `(function () {
    var b = globalThis.${BRIDGE_GLOBAL};
    if (!b || typeof b.drain !== 'function') return null;
    return JSON.stringify(b.drain());
  })()`;
}

export class Transport {
  /**
   * @param {{pollIntervalMs?: number}} options
   */
  constructor({ pollIntervalMs = 100 } = {}) {
    this.pollIntervalMs = pollIntervalMs;
    this._timer = null;
    this._onEvents = null;
    this._onPresence = null;
  }

  /** Evaluate an expression in the inspected page. Resolves with the result. */
  eval(expression) {
    return new Promise((resolve, reject) => {
      try {
        chrome.devtools.inspectedWindow.eval(expression, (result, exception) => {
          if (exception) {
            reject(new Error(exception.message || String(exception)));
          } else {
            resolve(result);
          }
        });
      } catch (err) {
        reject(err); // e.g. DevTools context gone
      }
    });
  }

  /**
   * Deliver a command envelope to the bridge.
   * @returns {Promise<{ok:boolean, id?:string, handled?:boolean, error?:string}|{ok:false,error:'bridge-not-found'}>}
   */
  async send(envelope) {
    const raw = await this.eval(sendExpression(JSON.stringify(envelope)));
    if (raw === null || raw === undefined) {
      return { ok: false, error: 'bridge-not-found' };
    }
    return JSON.parse(raw);
  }

  /**
   * Drain pending engine events.
   * @returns {Promise<Array|null>} array of events, or `null` when no bridge
   *          is present on the page (used for presence detection).
   */
  async drain() {
    const raw = await this.eval(drainExpression());
    return raw === null || raw === undefined ? null : JSON.parse(raw);
  }

  /**
   * Start the engine->panel poll loop.
   * @param {(events: Array<object>) => void} onEvents
   * @param {(online: boolean) => void} onPresence
   */
  startPolling(onEvents, onPresence) {
    this.stopPolling();
    this._onEvents = onEvents;
    this._onPresence = onPresence;

    this._timer = setInterval(async () => {
      try {
        const events = await this.drain();
        if (this._onPresence) this._onPresence(events !== null);
        if (events && events.length > 0 && this._onEvents) {
          this._onEvents(events);
        }
      } catch (err) {
        // Page navigated, tab closed, non-page context (chrome:// etc.)…
        if (this._onPresence) this._onPresence(false);
      }
    }, this.pollIntervalMs);
  }

  /** Stop the poll loop (idempotent). */
  stopPolling() {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}
