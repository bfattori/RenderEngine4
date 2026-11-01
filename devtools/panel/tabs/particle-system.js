/**
 * Particle System tab — standalone engine, bound or worker-driven.
 */
import '../../protocol/messages.js';

const { EVT } = RE4_MESSAGES;

export default {
  id: 'particle-system',
  label: 'Particle System',
  description: 'Separate engine: bound to the Engine loop, or driven by Particle Manager + Orchestrator + Worker threads.',
  items: [
    {
      id: 'bound-mode',
      label: 'Bound Mode',
      description: 'When bound to the Engine update/render loop: emitter state, live particles.',
    },
    {
      id: 'particle-manager',
      label: 'Particle Manager',
      description: 'Manager abstraction: job queue, emission rates, budgets.',
    },
    {
      id: 'orchestrator',
      label: 'Orchestrator',
      description: 'Task distribution across particle workers.',
    },
    {
      id: 'worker-threads',
      label: 'Worker Threads',
      description: 'Particle Worker threads: count, state, throughput.',
    },
  ],

  // Events that will feed this tab's content areas (routed in main.js).
  events: [EVT.PARTICLES],

  // TODO(MVP-1): buildContent(tab, item) — e.g. for 'particle-manager':
  //   - select  "Mode" (bound | managed)  -> CMD.SET_PARAM
  //   - number  "Max particles"           -> CMD.SET_PARAM
  //   - kvList  per-emitter stats         <- tab.data (EVT.PARTICLES)
};
