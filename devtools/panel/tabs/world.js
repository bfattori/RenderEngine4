/**
 * World tab — the container for everything the engine manages.
 * Sidebar items mirror the World's five references.
 */
import '../../protocol/messages.js';

const { EVT } = RE4_MESSAGES;

export default {
  id: 'world',
  label: 'World',
  description: 'Container for the Camera, Game Objects, Collision Model, Render Context, and Renderer.',
  items: [
    {
      id: 'camera',
      label: 'Camera',
      description: 'World camera reference: transform, projection, view state.',
    },
    {
      id: 'game-objects',
      label: 'Game Objects',
      description: 'World-level view of managed game objects (see Game Objects tab).',
    },
    {
      id: 'collision-model',
      label: 'Collision Model',
      description: 'World collision model: broadphase, shapes, queries.',
    },
    {
      id: 'render-context',
      label: 'Render Context',
      description: 'World render context reference (see Rendering tab).',
    },
    {
      id: 'renderer',
      label: 'Renderer',
      description: 'World renderer reference (see Rendering tab).',
    },
  ],

  // Events that will feed this tab's content areas (routed in main.js).
  events: [EVT.WORLD],

  // TODO(MVP-1): buildContent(tab, item) — e.g. for 'camera':
  //   - number  "FOV"             -> CMD.SET_PARAM { path: 'camera.fov' }
  //   - slider  "Near/Far plane"  -> CMD.SET_PARAM
  //   - kvList  transform state   <- tab.data (EVT.WORLD)
};
