/**
 * Event Engine tab — pub/sub core + local context factory.
 */
import '../../protocol/messages.js';

const { EVT } = RE4_MESSAGES;

export default {
  id: 'event-engine',
  label: 'Event Engine',
  description: 'Primary pub/sub communication system; factory for Game Objects local event contexts.',
  items: [
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      description: 'Global topic → subscriber map and dispatch counts.',
    },
    {
      id: 'local-contexts',
      label: 'Local Contexts',
      description: 'Event contexts created by the factory for Game Objects.',
    },
    {
      id: 'dispatch',
      label: 'Dispatch',
      description: 'Queue depth, dispatch throughput, dropped events.',
    },
  ],

  // Events that will feed this tab's content areas (routed in main.js).
  events: [EVT.EVENT_ENGINE],

  // TODO(MVP-1): buildContent(tab, item) — e.g. for 'subscriptions':
  //   - kvList of topics with subscriber counts <- tab.data (EVT.EVENT_ENGINE)
  //   - button  "Test publish"    -> CMD.QUERY { action: 'publish', topic }
};
