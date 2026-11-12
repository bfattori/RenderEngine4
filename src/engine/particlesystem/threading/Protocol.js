
const protocol = {
  // thread message origins
  MSG: {
      ORCHESTRATOR: 'mOrch',
      MANAGER: 'mPMgr',
      WORKER: 'mPWkr',
  },

  // thread message types
  MTYPE: {
    // from worker
    WORKER: {
      ACK: 'ack',
      READY: 'rdy',
      RENDERED: 'rndr',
      ACK_TYPE: 'ackType',
      ACK_EFFECT: 'ackFx',
      ACK_ZONE: 'ackPhys'
    },

    // from orchestrator
    ORCHESTRATOR: {
      GENESIS: 'gen',
      INIT: 'init',
      READY: 'rdy',
      ADD_TYPE: '+type',
      ADD_EFFECT: '+fx',
      ADD_ZONE: '+phys',
      ADD_PARTICLES: '+ptls',
      RUN_EFFECT: 'runFx',
      UPDATE_ZONE: 'updPhys',
      REMOVE_ZONE: '-phys',
      RENDERED: 'rndr',
      WORKER_RENDERED: 'wRndr',
      WORKERS_READY: 'wRdy',
      SPAWN: 'spawn',
      PAUSE: 'pause',
      RUN: 'run',
      SHUTDOWN: 'down',
      TERMINATED: 'term'
    },

    // from manager
    MANAGER: {
      INIT: 'init',
      RESET: 'reset',
      SHUTDOWN: 'down',
      ADD_TYPE: '+type',
      ADD_EFFECT: '+fx',
      ADD_ZONE: '+phys',
      ADD_PARTICLES: '+ptls',
      RUN_EFFECT: 'runFx',
      UPDATE_ZONE: 'updPhys',
      REMOVE_ZONE: '-phys',
      SPAWN: 'spawn'
    }
  }
};

export default protocol;