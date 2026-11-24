
const protocol = {
  // thread message origins
  MSG: {
      ENGINE_MANAGER: 'engMgr',
      RUN_LOOP: 'runLoop',
  },

  // thread message types
  MTYPE: {
    // from run loop
    RUN_LOOP: {
      READY: 'rdy',

      ENGINE_CONFIG: 'eCfg',

      PRE_FRAME: 'pre',
      RENDER_INSTRUCTIONS: 'rndr',
      PARTICLE_BITMAP: 'pbm',
      POST_FRAME: 'post',

      COMPILE_TILE: '+tile',
      COMPILE_TILE_MAP: '+map',
      COMPILE_SPRITE: '+spr',
      COMPILE_SHAPE: '+arb',

      DESTROY_TILE: '-tile',
      DESTROY_TILE_MAP: '-map',
      DESTROY_SPRITE: '-spr',
      DESTROY_SHAPE: '-arb',

      LOADING: 'ld',
      DONE_LOADING: 'dl',

      COUNTER_CONFIG: 'cCfg',
      COUNTER_UPDATE: 'cUpd',
      PIP_CONFIG: 'pCfg',
      PIP_UPDATE: 'pUpd',

      TERMINATED: 'term'
    },

    // from engine manager
    ENGINE_MANAGER: {
      INIT: 'init',

      START: 'sta',
      SHUTDOWN: 'shu',

      PAUSE: 'pa',
      RESUME: 'res',
      STOP: 'sto',
      STEP: 'ste',

      CALLBACK: 'cb',

      TERMINATE: 'term'
    }
  }
};

export default protocol;