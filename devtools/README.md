# RenderEngine4 Inspector

A **Chrome DevTools extension** (Manifest V3, custom panel) for real-time,
in-browser debugging of the **RenderEngine4** game engine. It is deliberately
browser-local: the extension panel and the game page share the same machine
and the same DevTools session, so no network layer (WebSockets etc.) is
needed.

> **Status: MVP-0 (scaffolding).** This iteration provides the extension
> skeleton, the panel layout (runtime area + tabbed subsystem views), and a
> complete, well-defined **communication layer** between the engine and the
> panel. The *content areas* of the tabs are intentional placeholders —
> building them out is the next milestone.

---

## What's in this box (MVP-0)

1. **A loadable Chrome DevTools extension** — all required files, no build
   step, no dependencies, no network.
2. **A communication layer** with a small, versioned, well-documented
   protocol:
   - `bridge/re4-debug-bridge.js` — the engine-side SDK (one `<script>` tag).
   - `protocol/messages.js` — the single shared catalog of message types.
   - `panel/transport.js` / `panel/connection.js` — the panel side of the
     link (delivery, polling, presence, request/response).
3. **The primary layout** — two areas divided vertically:
   - **Top:** engine runtime information (run-control toolbar: Start / Stop /
     Step, live status strip fed by engine events, raw event feed for
     protocol verification).
   - **Bottom:** a tabbed page with one tab per major engine part —
     **Engine, World, Game Objects, Event Engine, Particle System,
     Rendering, Spark Memory** — each with a **left sidebar** of items
     relative to that part and a **content area** on the right.
4. **A control factory library** (`ui/controls.js`) so content areas can be
   built from uniform widgets: toggles, sliders, number/text/select inputs,
   buttons, stat cells, and key/value lists.
5. **A test harness** (`examples/demo-engine.html`) — a minimal fake engine
   that uses the *same* bridge + protocol files, so you can exercise the
   panel end-to-end before the real engine is wired up.

Not included (by design): any content-area functionality. Each tab
definition documents its planned controls as `TODO` comments.

---

## Repository layout

```
devtools/
├── manifest.json               MV3 manifest; declares the devtools page
├── devtools.html               DevTools entry (isolated context)
├── devtools.js                 Registers the "RenderEngine4" panel
├── panel.html                  Panel DOM shell (header, runtime area, tabs)
├── panel.css                   Panel theme (DevTools-dark)
├── icons/                      16 / 32 / 128 px icons
├── protocol/
│   └── messages.js             Shared message catalog (single source of truth)
├── bridge/
│   └── re4-debug-bridge.js     Engine-side SDK → window.__RE4_DEBUG__
├── panel/
│   ├── main.js                 Panel bootstrap: wires everything together
│   ├── transport.js            panel ↔ page boundary (eval + poll)
│   ├── connection.js           presence, event bus, request/response
│   └── tabs/
│       ├── tab.js              Tab base class (sidebar + content area)
│       ├── engine.js           Engine tab definition
│       ├── world.js            World tab definition (5 references)
│       ├── game-objects.js     Game Objects tab definition
│       ├── event-engine.js     Event Engine tab definition
│       ├── particle-system.js  Particle System tab definition
│       ├── rendering.js        Rendering Subsystem tab definition
│       └── memory.js           Spark Memory Manager tab definition
├── ui/
│   └── controls.js             Control factories for content areas
└── examples/
    └── demo-engine.html        Fake engine + bridge for panel testing
```

---

## Quick start

1. **Load the extension (unpacked):**
   - Chrome → `chrome://extensions`
   - Enable **Developer mode** (top right)
   - **Load unpacked** → select this `devtools/` folder
2. **Open the test harness:** load `examples/demo-engine.html` in a normal
   tab (file:// or any local server works).
3. **Open DevTools** (F12) on that tab and click the **RenderEngine4** panel
   in the panel strip (the `>>` overflow menu if your strip is crowded).
4. You should see the **online** badge, a working **Start / Stop / Step**
   toolbar, and the **Engine Runtime** strip updating (state, frame, FPS,
   world-object count, pool count, uptime) as the demo engine runs.
5. Click through the tabs — every tab has its sidebar items and a
   placeholder content area.

> To wire up the **real engine**, add the two bridge `<script>` tags to your
> game page (see "Engine integration" below) and repeat steps 3–5.

---

## Architecture

```
┌─────────────────────────┐                ┌──────────────────────────────┐
│  Game page (inspected)  │                │  DevTools panel              │
│                         │   eval()       │  (panel.html / panel/*.js)   │
│  protocol/messages.js   │◄───────────────│── Transport                  │
│  bridge/…-bridge.js     │   eval()       │    └─ Connection             │
│    window.__RE4_DEBUG__ │───────────────►│        ├─ event bus (EVT.*)  │
│      .receive(cmd)      │  "drain()"     │        └─ pending (RESPONSE) │
│      .emit(evt)         │  JSON string   │  ┌─────────────────────────┐ │
│                         │                │  │ Top: runtime area       │ │
│  RE4 engine code        │                │  │   (toolbar + status)    │ │
│    .on(CMD.*, …)        │                │  ├─────────────────────────┤ │
│    .emit(EVT.*, …)      │                │  │ Bottom: tabs            │ │
└─────────────────────────┘                │  │  sidebar │ content area │ │
          (no network,                     └──────────────────────────────┘
           same browser)
```

### Key components

| Component | Role |
|---|---|
| `manifest.json` + `devtools.html/js` | Standard MV3 DevTools entry; registers the panel lazily. |
| `protocol/messages.js` | The **one** file both sides must agree on: protocol version, bridge global name, and every `CMD.*` / `EVT.*` type. Dual-format: classic script for the game page, side-effect import for the panel. |
| `bridge/re4-debug-bridge.js` | Engine-side SDK. Installs `window.__RE4_DEBUG__` with a tiny, stable API: `on/off` (commands), `emit` (events), `receive`/`drain` (panel entry points), `enabled` (master switch). Outbox is bounded (256 events) so a closed panel can never grow memory, and a throwing handler can never crash the engine. |
| `panel/transport.js` | The panel↔page boundary. Sends command envelopes via `chrome.devtools.inspectedWindow.eval` and polls the bridge outbox on the same channel. Envelopes cross as JSON strings. |
| `panel/connection.js` | Presence state machine (`offline`/`online`), an event bus (`connection.on(EVT.STATUS, …)`), and command delivery with optional request/response correlation (`{ wait: true }` resolves when the engine echoes `EVT.RESPONSE` with the same `id`). |
| `panel/tabs/tab.js` | Tab base class: renders the sidebar from a tab definition, manages the active item, caches routed engine data in `tab.data`, and swaps in `def.buildContent` when one exists (placeholder otherwise). |
| `ui/controls.js` | Widget factories with a uniform `node.set(value)` / `node.onChange(fn)` API so content areas stay uniform and testable. |

### Why eval + polling? (design decision)

The panel and the inspected page are **isolated JavaScript contexts**. The
only built-in channels between them are `chrome.devtools.inspectedWindow.eval`
and the DevTools console. WebSockets are out by requirement (everything is
local), and `BroadcastChannel`/`SharedWorker` do not span the
`chrome-devtools://` origin. So:

- **panel → engine** is synchronous and lossless: `eval` invokes
  `bridge.receive(envelope)` and returns the ack.
- **engine → panel** is a 100 ms drain poll (`Transport.pollIntervalMs`,
  configurable). For a debugger this is effectively real-time, it costs
  ~nothing, and the worst failure mode is a slightly stale read — never a
  broken link.
- **Presence** is a side effect of the same poll: if the page has no bridge
  (or is a `chrome://` page, or navigated away), the panel flips to
  `offline` and disables run control.

Upgrade paths if you ever want tighter latency (not needed for MVP-0):
shorter poll interval, a "notify" event that triggers an immediate drain, or
moving the bridge into a `chrome.scripting` injected world. The protocol
does not need to change.

---

## Message protocol

### Envelope

Every message is a JSON-serializable object:

```jsonc
{
  "v": 1,                    // RE4_MESSAGES.PROTOCOL_VERSION
  "id": "c12",               // unique per sender (correlates requests/responses)
  "type": "re4/cmd/start",   // one of RE4_MESSAGES.CMD.* or EVT.*
  "payload": { },            // optional; per-type shape below
  "ts": 1730000000000        // epoch ms, sender clock
}
```

### Commands — panel → engine (`bridge.receive`)

| Type | Payload | Engine should do |
|---|---|---|
| `re4/cmd/start` | `null` | Start the engine (idempotent) |
| `re4/cmd/stop` | `null` | Stop the engine (idempotent) |
| `re4/cmd/step` | `null` | Advance exactly one frame, then hold |
| `re4/cmd/toggle` | `{ path: string, value?: boolean }` | Toggle a named boolean feature (absent `value` = flip) |
| `re4/cmd/set-param` | `{ path: string, value: any }` | Set a named runtime parameter |
| `re4/cmd/query` | `object` | Snapshot state; answer with `re4/evt/response` |

The panel treats the ack's `handled` flag as authoritative: if the engine has
no handler for a command, `connection.send()` resolves with
`{ handled: false }` instead of hanging.

**Delivery semantics.** `connection.send(type, payload)` is
fire-and-forget by default: it resolves with the delivery ack
(`{ ok, id, handled }`) — right for START / STOP / STEP / TOGGLE /
SET_PARAM. When the command expects a snapshot back (CMD.QUERY), pass
`{ wait: true }` and the promise resolves with the matching
`re4/evt/response` payload instead (the engine echoes the envelope `id`):

```js
const ack   = await connection.send(RE4_MESSAGES.CMD.START);
const reply = await connection.send(RE4_MESSAGES.CMD.QUERY, { full: true }, { wait: true });
```

### Events — engine → panel (`bridge.emit`, drained by poll)

| Type | Payload | Consumed by |
|---|---|---|
| `re4/evt/status` | `{ state: "running"\|"paused"\|"stopped", frame?: number, fps?: number, stats?: { [label]: any } }` | Top runtime area |
| `re4/evt/response` | `{ id: <envelope id>, ...response }` | `connection.send()` promise (not fanned out) |
| `re4/evt/log` | `{ level: "info"\|"warn"\|"error", message: string }` | DevTools console |
| `re4/evt/world` | World snapshot | World tab (`tab.data`) |
| `re4/evt/game-objects` | Object/part data | Game Objects tab |
| `re4/evt/event-engine` | Subscription/context data | Event Engine tab |
| `re4/evt/particles` | Particle system data | Particle System tab |
| `re4/evt/rendering` | Render context/renderer data | Rendering tab |
| `re4/evt/memory` | Pool/allocation data | Spark Memory tab |

The `EVT.*` subsystem payloads are intentionally open-ended in MVP-0 — they
will be shaped by the content-area work. What is fixed is the **envelope**,
the **type names**, and the **direction**.

### Rules for extending the protocol

1. Add the new type to `protocol/messages.js` **once** — both sides read it.
2. `re4/cmd/*` for panel→engine, `re4/evt/*` for engine→panel.
3. Payload changes to an existing type → bump `PROTOCOL_VERSION` and note it
   here.
4. The engine **must** stay crash-proof: the bridge already isolates handler
   errors, but engines should not emit multi-MB payloads per frame (the
   outbox drops the oldest events past 256 anyway).
5. Throttle periodic events (`EVT.STATUS`) to ~10–30 Hz; the poll period is
   the floor on update frequency regardless.

---

## Engine integration (real engine)

```html
<!-- in your game page, before engine startup -->
<script src="devtools/protocol/messages.js"></script>
<script src="devtools/bridge/re4-debug-bridge.js"></script>
<script>
  const bridge = globalThis.__RE4_DEBUG__;
  const M = globalThis.RE4_MESSAGES;
  const engine = new RE4.Engine();

  // Run control (toolbar buttons)
  bridge.on(M.CMD.START, () => engine.start());
  bridge.on(M.CMD.STOP,  () => engine.stop());
  bridge.on(M.CMD.STEP,  () => engine.stepFrame());

  // Runtime status — throttle to ~10-30 Hz from inside the loop
  bridge.on(engine.onFrame, ({ frame, fps }) => {
    bridge.emit(M.EVT.STATUS, { state: engine.state, frame, fps, stats: { … } });
  });

  // Subsystem snapshots (emit on change or on a slow tick)
  bridge.on(engine.onWorldChange, () => bridge.emit(M.EVT.WORLD, engine.world.describe()));
  // …and so on for EVT.GAME_OBJECTS / EVT.EVENT_ENGINE / EVT.PARTICLES /
  // EVT.RENDERING / EVT.MEMORY

  // Content-area controls will arrive as generic commands:
  bridge.on(M.CMD.SET_PARAM, ({ path, value }) => engine.setParam(path, value));
  bridge.on(M.CMD.TOGGLE,    ({ path, value }) => engine.toggle(path, value));
</script>
```

`examples/demo-engine.html` contains a complete, runnable reference
implementation of exactly this wiring.

---

## Building content areas (MVP-1+)

Content areas are where per-item controls will live. The scaffolding defines
one uniform pattern:

### 1. Tab definition contract (`panel/tabs/tab.js`)

```js
export default {
  id: 'world',                 // unique; used for DOM + routing
  label: 'World',
  description: '…',
  items: [                     // sidebar entries, top to bottom
    { id: 'camera', label: 'Camera', description: '…' },
    // …
  ],
  events: [RE4_MESSAGES.EVT.WORLD],   // routed into tab.data automatically
  // --- extension points (MVP-1+) ---
  buildContent(tab, item) { … },      // returns an HTMLElement
  onItemShown(tab, item) { … },       // called after render
  onData(tab, payload) { … },         // called when routed events arrive
};
```

### 2. Compose controls from `ui/controls.js`

Every control supports `.set(value)` (push engine state in) and
`.onChange(fn)` (user intent out):

```js
import * as ui from '../ui/controls.js';
import '../protocol/messages.js';

// Example: World → Camera content area
export default {
  id: 'world',
  label: 'World',
  items: [
    { id: 'camera', label: 'Camera', description: 'World camera reference.' },
    // …other items
  ],
  events: [RE4_MESSAGES.EVT.WORLD],

  buildContent(tab, item) {
    const w = tab.data?.world ?? tab.data ?? {};   // latest EVT.WORLD payload
    const camera = w.camera ?? {};

    const section = ui.section({
      title: `World → ${item.label}`,
      hint: 'Live from re4/evt/world',
    });

    const fov = ui.number({ label: 'FOV (deg)', value: camera.fov ?? 70, min: 10, max: 140, unit: '°' });
    fov.onChange((v) => tab.connection &&
      connection.send(RE4_MESSAGES.CMD.SET_PARAM, { path: 'camera.fov', value: v }));

    const near = ui.slider({ label: 'Near plane', min: 0.01, max: 10, step: 0.01, value: camera.near ?? 0.1 });
    const far  = ui.slider({ label: 'Far plane',  min: 1, max: 1000, step: 1, value: camera.far ?? 200 });

    const state = ui.kvList({
      title: 'State',
      rows: Object.entries(camera).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : v]),
    });

    section.append(fov, near, far, state);
    return section;
  },
};
```

(Panel-wide access to `connection` is a small wiring detail for MVP-1 — the
tab base class already exposes `tab.data`; a `tab.connection` reference or a
module-level import from `panel/connection.js` will do.)

### 3. Sidebar items that should be dynamic

`tab.def.items` is currently a static list. When the **Game Objects** tab
needs to list *live* objects, the clean extension is to have the tab
definition re-render its sidebar from `tab.data` inside `onData` (the
`Tab` class keeps `showItem`/`render` as reusable building blocks).

---

## Roadmap (suggested)

- **MVP-0 (this box):** scaffolding, layout, protocol, bridge, transport,
  run-control wiring, demo harness. ✅
- **MVP-1:** Engine + World + Spark Memory content areas (status-driven
  `kvList`/`stat` views + `SET_PARAM`/`TOGGLE` controls), richer
  `EVT.*` payload contracts.
- **MVP-2:** Game Objects tree (dynamic sidebar from `EVT.GAME_OBJECTS`,
  per-part toggles), Event Engine subscription inspector.
- **MVP-3:** Particle System + Rendering deep dives (worker thread view,
  per-frame render stats, wireframe/overdraw toggles).
- **Later:** event log viewer (ring buffer of `EVT.LOG`), timeline/frame
  scrubber for `EVT.STATUS` history, resize handle between the two areas.

---

## Troubleshooting

| Symptom | Check |
|---|---|
| Badge stuck on **offline** | Is the page actually loading `bridge/re4-debug-bridge.js`? Open the page console and check `window.__RE4_DEBUG__` exists. `file://` pages work; `chrome://` pages don't (by design). |
| Buttons enabled but nothing happens | Look at **runtime-hint** text and the panel console: `no handler for …` means the engine didn't register that `CMD.*`. |
| Status strip not updating | The engine must `bridge.emit(M.EVT.STATUS, …)`; see the raw feed in the top area. |
| Panel missing from DevTools | Reload the extension at `chrome://extensions` after edits, then reload DevTools. |

---

## Design decisions (summary)

1. **No build step, no dependencies.** Plain ES modules + one classic-script
   bridge. The extension folder *is* the artifact; you point Chrome at it.
2. **One protocol file.** `protocol/messages.js` is the contract; both sides
   derive from it, so the two can never drift on type names.
3. **Bounded, crash-proof bridge.** The game page is the production artifact
   — the bridge caps its outbox, isolates handler exceptions, and is guarded
   against double-install. `bridge.enabled` is a one-line kill switch.
4. **Polling over push for engine→panel.** Deterministic, safe, and simple;
   latency is bounded by a configurable 100 ms poll. Documented upgrade
   paths if that ever isn't enough.
5. **Tabs are data (definitions), not code.** Adding a tab is one small file
   + one line in `panel/main.js`; the base class owns all DOM mechanics.
6. **Controls are factories with a uniform imperative API** (`.set` /
   `.onChange`), so content areas read the same whether they show a camera
   or a worker-thread pool, and stay trivially replaceable.
7. **Content areas are placeholders by instruction (MVP-0).** Every planned
   control is sketched in the tab-definition `TODO` comments so MVP-1 work
   has a map to follow.
