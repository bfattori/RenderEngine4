/**
 * Game Objects tab — composed objects, their parts, and private event contexts.
 */
import '../../protocol/messages.js';

const { EVT } = RE4_MESSAGES;

export default {
  id: 'game-objects',
  label: 'Game Objects',
  description: 'Game objects are compositions of parts (Transform, Render, Input, Collision, Sound) with a private local event context.',
  items: [
    {
      id: 'instances',
      label: 'Instances',
      description: 'Runtime list of live game objects (populated from re4/evt/game-objects).',
    },
    {
      id: 'parts',
      label: 'Parts',
      description: 'Base part types: Transform, Render, Input, Collision, Sound.',
    },
    {
      id: 'event-context',
      label: 'Local Event Context',
      description: 'Per-object private event context used for internal part communication.',
    },
  ],

  // Events that will feed this tab's content areas (routed in main.js).
  events: [EVT.GAME_OBJECTS],

  // TODO(MVP-2): buildContent(tab, item) — e.g. for 'instances':
  //   - kvList / tree of objects from tab.data
  //   - per-object: toggle "Enabled", toggles per part, kvList of part state
  //   - select an object to drill into its parts (Transform/Render/Input/…)
};
