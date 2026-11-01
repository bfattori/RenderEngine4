/**
 * Spark Memory Manager tab — internal memory manager (GC minimization).
 */
import '../../protocol/messages.js';

const { EVT } = RE4_MESSAGES;

export default {
  id: 'memory',
  label: 'Spark Memory',
  description: 'Internal memory manager (primarily for the particle system) that minimizes garbage collection.',
  items: [
    {
      id: 'pools',
      label: 'Pools',
      description: 'Allocation pools: capacity, live, watermark, churn.',
    },
    {
      id: 'allocations',
      label: 'Allocation Stats',
      description: 'Bytes allocated/freed, resize history, overflow events.',
    },
    {
      id: 'gc-pressure',
      label: 'GC Pressure',
      description: 'Estimated GC pressure vs. baseline; spike correlation.',
    },
  ],

  // Events that will feed this tab's content areas (routed in main.js).
  events: [EVT.MEMORY],

  // TODO(MVP-1): buildContent(tab, item) — e.g. for 'pools':
  //   - kvList  per-pool live/capacity/watermark   <- tab.data (EVT.MEMORY)
  //   - button  "Shrink to fit"  -> CMD.QUERY { action: 'shrink-pool', pool }
};
