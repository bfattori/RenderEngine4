/**
 * Rendering Subsystem tab — Render Contexts and Renderers.
 */
import '../../protocol/messages.js';

const { EVT } = RE4_MESSAGES;

export default {
  id: 'rendering',
  label: 'Rendering',
  description: 'Render Contexts and Renderers — the two halves of the rendering subsystem.',
  items: [
    {
      id: 'render-contexts',
      label: 'Render Contexts',
      description: 'Contexts: canvas/backing store, state, active targets.',
    },
    {
      id: 'renderers',
      label: 'Renderers',
      description: 'Renderers: pipeline, passes, frame statistics.',
    },
  ],

  // Events that will feed this tab's content areas (routed in main.js).
  events: [EVT.RENDERING],

  // TODO(MVP-1): buildContent(tab, item) — e.g. for 'renderers':
  //   - kvList  "Last frame" (draw calls, tris, time)   <- tab.data
  //   - toggle  "Wireframe"          -> CMD.TOGGLE { path: 'renderer.wireframe' }
  //   - toggle  "Overdraw heatmap"   -> CMD.TOGGLE
};
