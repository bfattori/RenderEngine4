/**
 * Connection — presence state machine + message routing on top of Transport.
 * ============================================================================
 * Responsibilities:
 *   - Presence: 'offline' | 'online' (bridge detected on the page or not).
 *   - Event bus:  connection.on(RE4_MESSAGES.EVT.STATUS, (payload, evt) => {})
 *   - Request/response:
 *       const reply = await connection.send(RE4_MESSAGES.CMD.QUERY, {...});
 *     The send resolves with the matching `EVT.RESPONSE` payload (engine
 *     echoes the envelope `id`), rejects on timeout/bridge error, or
 *     resolves `{ handled: false }` when the engine has no handler.
 */
import '../protocol/messages.js';

export class Connection {
  /** @param {Transport} transport */
  constructor(transport) {
    this.transport = transport;
    this.state = 'offline'; // 'offline' | 'online'

    this._seq = 0;
    /** id -> { timer, resolve } */
    this._pending = new Map();
    /** event type -> Set<fn> */
    this._eventListeners = new Map();
    this._stateListeners = new Set();
  }

  /** True when the bridge was detected on the inspected page. */
  get online() {
    return this.state === 'online';
  }

  /** Subscribe to presence transitions. Returns an unsubscribe fn. */
  onPresenceChange(fn) {
    this._stateListeners.add(fn);
    return () => this._stateListeners.delete(fn);
  }

  /** Subscribe to an engine event type. Returns an unsubscribe fn. */
  on(type, fn) {
    if (typeof type !== 'string' || typeof fn !== 'function') {
      throw new TypeError('connection.on(type, fn)');
    }
    let set = this._eventListeners.get(type);
    if (!set) {
      set = new Set();
      this._eventListeners.set(type, set);
    }
    set.add(fn);
    return () => set.delete(fn);
  }

  /** Start the transport poll loop. */
  start() {
    this.transport.startPolling(
      (events) => this.#dispatchEvents(events),
      (online) => this.#setPresence(online)
    );
  }

  /** Stop the transport poll loop. */
  stop() {
    this.transport.stopPolling();
  }

  /**
   * Send a command to the engine.
   * @param {string} type      one of RE4_MESSAGES.CMD.*
   * @param {any} [payload]
   * @param {{timeoutMs?: number, wait?: boolean}} [options]
   *   wait — when true (use with CMD.QUERY), resolves with the matching
   *          EVT.RESPONSE payload instead of the delivery ack.
   * @returns {Promise<any>}  the delivery ack, `{ handled: false }` when the
   *                          engine registered no handler, or (wait=true) the
   *                          RESPONSE payload.
   */
  send(type, payload = null, { timeoutMs = 3000, wait = false } = {}) {
    const id = `c${++this._seq}`;
    const envelope = {
      v: RE4_MESSAGES.PROTOCOL_VERSION,
      id,
      type,
      payload,
      ts: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pending.delete(id);
        reject(new Error(`timed out waiting for response to ${type}`));
      }, timeoutMs);

      this._pending.set(id, {
        timer,
        resolve: (value) => {
          clearTimeout(timer);
          this._pending.delete(id);
          resolve(value);
        },
        reject: (err) => {
          clearTimeout(timer);
          this._pending.delete(id);
          reject(err);
        },
      });

      this.transport
        .send(envelope)
        .then((ack) => {
          const entry = this._pending.get(id);
          if (!entry) return; // already settled
          if (!ack || ack.ok === false) {
            entry.reject(new Error((ack && ack.error) || 'bridge rejected command'));
          } else if (ack.handled === false) {
            // Engine is online but has no handler for this command type.
            // Resolve (not reject) so callers can degrade gracefully.
            entry.resolve({ handled: false });
          } else if (!wait) {
            // Fire-and-forget: delivery was acknowledged, done.
            entry.resolve(ack);
          }
          // Otherwise (wait=true): keep waiting for EVT.RESPONSE.
        })
        .catch((err) => {
          const entry = this._pending.get(id);
          if (entry) entry.reject(err);
        });
    });
  }

  #dispatchEvents(events) {
    for (const evt of events) {
      if (!evt || typeof evt.type !== 'string') continue;

      if (evt.type === RE4_MESSAGES.EVT.RESPONSE) {
        const id = evt.payload && evt.payload.id;
        const entry = id !== undefined && this._pending.get(id);
        if (entry) entry.resolve(evt.payload);
        continue; // responses never fan out to listeners
      }

      const set = this._eventListeners.get(evt.type);
      if (set) {
        for (const fn of [...set]) {
          try {
            fn(evt.payload, evt);
          } catch (err) {
            // A broken panel listener must never break the event loop.
            // eslint-disable-next-line no-console
            console.error(`[RE4 Inspector] listener for ${evt.type} threw:`, err);
          }
        }
      }
    }
  }

  #setPresence(online) {
    const next = online ? 'online' : 'offline';
    if (next === this.state) return;
    this.state = next;
    for (const fn of this._stateListeners) {
      try {
        fn(next);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[RE4 Inspector] presence listener threw:', err);
      }
    }
  }
}
