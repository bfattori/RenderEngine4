/**
 * RenderEngine4 Inspector — panel bootstrap.
 * ============================================================================
 * Wires together:
 *   1. Communication layer  (Transport + Connection, started immediately)
 *   2. Header               (connection badge + run-control toolbar)
 *   3. Top area             (engine runtime information)
 *   4. Bottom area          (tab strip + sidebar/content tabs)
 *   5. Event routing        (subsystem events -> tab.data caches)
 *
 * MVP-0 scope: scaffolding + communication. Content areas are placeholders.
 */
import '../protocol/messages.js';
import { Transport } from './transport.js';
import { Connection } from './connection.js';
import { Tab } from './tabs/tab.js';
import * as ui from '../ui/controls.js';

import engineTab from './tabs/engine.js';
import worldTab from './tabs/world.js';
import gameObjectsTab from './tabs/game-objects.js';
import eventEngineTab from './tabs/event-engine.js';
import particleSystemTab from './tabs/particle-system.js';
import renderingTab from './tabs/rendering.js';
import memoryTab from './tabs/memory.js';

const { CMD, EVT } = RE4_MESSAGES;

// ---------------------------------------------------------------------------
// Communication layer
// ---------------------------------------------------------------------------
const connection = new Connection(new Transport({ pollIntervalMs: 100 }));

// ---------------------------------------------------------------------------
// Header: connection badge + run-control toolbar
// ---------------------------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const badge = $('#connection-badge');
const stateLabel = $('#engine-state');
const runtimeHint = $('#runtime-hint');
const btnStart = $('#btn-start');
//const btnStop = $('#btn-stop');
const btnPause = $('#btn-pause');
const btnStep = $('#btn-step');

connection.onPresenceChange((online) => {
  badge.textContent = online ? 'online' : 'offline';
  badge.className = `badge ${online ? 'badge-online' : 'badge-offline'}`;
  badge.title = online
    ? 'Bridge detected on the page'
    : 'No RenderEngine4 bridge found on this page (load examples/demo-engine.html or include the bridge in the game)';
  btnStart.disabled = !online;
  //btnStop.disabled = !online;
  btnPause.disabled = !online;
  btnStep.disabled = !online;
  stateLabel.textContent = online ? stateLabel.textContent : '—';
});

async function runCommand(type, verb) {
  if (!connection.online) return;
  try {
    const reply = await connection.send(type);
    if (reply && reply.handled === false) {
      runtimeHint.textContent = `${verb}: engine has no handler for this command yet`;
    }
  } catch (err) {
    runtimeHint.textContent = err.message;
    // eslint-disable-next-line no-console
    console.warn('[RE4 Inspector]', err.message);
  }
}

btnStart.addEventListener('click', () => runCommand(CMD.START, 'Start'));
//btnStop.addEventListener('click', () => runCommand(CMD.STOP, 'Stop'));
btnPause.addEventListener('click', () => runCommand(CMD.PAUSE, 'Pause'));
btnStep.addEventListener('click', () => runCommand(CMD.STEP, 'Step'));

// ---------------------------------------------------------------------------
// Top area: engine runtime information
// ---------------------------------------------------------------------------
const strip = $('#runtime-strip');
const rawPre = $('#runtime-raw');

/**
 * Render a status event into the runtime strip.
 * Expected payload (see protocol/messages.js): { state, frame, fps?, stats? }
 */
connection.on(EVT.STATUS, (payload, evt) => {
  if (!payload || typeof payload !== 'object') return;

  stateLabel.textContent = payload.state || 'unknown';

  strip.replaceChildren();
  const cells = [
    ['State', payload.state],
    ['Frame', payload.frame],
    ['FPS', payload.fps],
  ];
  if (payload.stats && typeof payload.stats === 'object') {
    for (const [label, value] of Object.entries(payload.stats)) cells.push([label, value]);
  }
  for (const [label, value] of cells) {
    if (value === undefined || value === null) continue;
    strip.appendChild(ui.stat({ label, value }));
  }

  // Raw feed for protocol verification (useful while wiring the real engine).
  rawPre.textContent = JSON.stringify(evt, null, 2);
  runtimeHint.textContent = evt.ts ? `last update ${new Date(evt.ts).toLocaleTimeString()}` : 'receiving status events';
});

// Engine-side log lines -> DevTools console.
connection.on(EVT.LOG, (payload) => {
  const level = payload && payload.level;
  const message = (payload && payload.message) || '';
  const log =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  log('[RE4 bridge]', message);
});

// ---------------------------------------------------------------------------
// Bottom area: tabs
// ---------------------------------------------------------------------------
const TAB_DEFS = [
  engineTab,
  worldTab,
  gameObjectsTab,
  eventEngineTab,
  particleSystemTab,
  renderingTab,
  memoryTab,
];

const tabs = TAB_DEFS.map((def) => new Tab(def));
const tabbar = $('#tabbar');
const tabbody = $('#tabbody');

function activateTab(id) {
  for (const btn of tabbar.querySelectorAll('.tab-tab')) {
    btn.classList.toggle('active', btn.dataset.tab === id);
  }
  for (const tab of tabs) {
    tab.paneEl.style.display = tab.def.id !== id ? 'none' : 'flex';
  }
}

for (const tab of tabs) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tab-tab';
  btn.textContent = tab.def.label;
  btn.dataset.tab = tab.def.id;
  btn.setAttribute('role', 'tab');
  btn.addEventListener('click', () => activateTab(tab.def.id));
  tabbar.appendChild(btn);

  tab.render(tabbody);
}

// Reveal the first tab (panes start hidden by Tab.render).
activateTab(TAB_DEFS[0].id);

// ---------------------------------------------------------------------------
// Event routing: subsystem events -> tab data caches.
// Each tab definition declares `events`; this generic router feeds tab.data
// so future buildContent implementations just read `tab.data`.
// ---------------------------------------------------------------------------
for (const tab of tabs) {
  for (const type of tab.def.events || []) {
    connection.on(type, (payload) => tab.setData(payload));
  }
}

// ---------------------------------------------------------------------------
// Go
// ---------------------------------------------------------------------------
connection.start();
