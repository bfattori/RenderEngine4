/**
 * Engine tab — the core: game loop + startup/shutdown.
 */
import '../../protocol/messages.js';

const { EVT } = RE4_MESSAGES;

export default {
  id: 'engine',
  label: 'Engine',
  description: 'Core engine: game loop, startup/shutdown, frame timing.',
  items: [
    {
      id: 'game-loop',
      label: 'Game Loop',
      description: 'Update/render cadence, current frame state, loop health.',
    },
    {
      id: 'lifecycle',
      label: 'Startup / Shutdown',
      description: 'Engine start/stop state and lifecycle transitions.',
    },
    {
      id: 'frame-timing',
      label: 'Frame Timing',
      description: 'Delta time, frame budget, and spike history.',
    },
  ],

  // Events that will feed this tab's content areas (routed in main.js).
  events: [EVT.STATUS, EVT.LOG],

  // TODO(MVP-1): buildContent(tab, item) — e.g. for 'game-loop':
  //   - toggle  "Auto-run"        -> CMD.START / CMD.STOP
  //   - button  "Step frame"      -> CMD.STEP
  //   - kvList  last frame stats  <- tab.data (EVT.STATUS)
};
