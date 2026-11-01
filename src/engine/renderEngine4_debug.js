'use strict';

/**
 * Render Engine 4 debug bootstrapper
 */
import RenderEngine from './renderEngine4.js';

// Debugger bridge
const bridge = globalThis.__RE4_DEBUG__;
const M = globalThis.RE4_MESSAGES;

const Debug = {
    engine: null,
    initialize: () => {
        if (bridge) {
            Debug.engine = RenderEngine.RE4;

            // Run control (toolbar buttons)
            bridge.on(M.CMD.START,      () => RenderEngine.start());
            bridge.on(M.CMD.PAUSE,      () => RenderEngine.pause());
            bridge.on(M.CMD.STOP,       () => RenderEngine.stop());
            bridge.on(M.CMD.STEP,       () => RenderEngine.step());
            bridge.on(M.CMD.SHUTDOWN,   () => RenderEngine.shutdown());

            // Subsystem snapshots (emit on change or on a slow tick)
            //bridge.on(engine.onWorldChange, () => bridge.emit(M.EVT.WORLD, engine.world.describe()));
            // …and so on for EVT.GAME_OBJECTS / EVT.EVENT_ENGINE / EVT.PARTICLES /
            // EVT.RENDERING / EVT.MEMORY

            // Request/response: echo the envelope id back in a RESPONSE payload.
            bridge.on(M.CMD.QUERY, (_payload, envelope) => {
                bridge.emit(M.EVT.RESPONSE, {
                    id: envelope.id,
                    ok: true,
                    snapshot: Debug.engine.snapshotStats(),
                    world: Debug.engine.world,
                    particles: Debug.engine.particleEngine,
                    memory: self.SPARK_MM
                });
            });

            // Content-area controls will arrive as generic commands:
            bridge.on(M.CMD.SET_PARAM, ({ path, value }) => Debug.setParam(path, value));
            bridge.on(M.CMD.TOGGLE,    ({ path, value }) => Debug.toggle(path, value));

            // override the engine's callbacks to publish status updates to the debugger bridge
            Debug.overrideCallbacks();

            // start us off
            console.debug("Debugging bridge started");
            Debug.publish();
        } else {
            console.warn("Debugger bridge not found.");
        }
    },

    publish: () => {
        bridge.emit(M.EVT.STATUS, { 
            state: Debug.engine.state, 
            frame: Debug.engine.frameNumber, 
            fps: Debug.engine.realFPS, 
            stats: Debug.engine.snapshotStats() 
        });    
    },

    overrideCallbacks: () => {
        const oldFrameHook = Debug.engine.hooks.onFrame;
        Debug.engine.hooks.onFrame = (time, frame, fps, stats) => {
            oldFrameHook(time, frame, fps, stats);
            Debug.onFrame(time, frame, fps, stats);
        };

        const oldStartHook = Debug.engine.hooks.onStart;
        Debug.engine.hooks.onStart = () => {
            oldStartHook();
            Debug.publish();
        };
        const oldStopHook = Debug.engine.hooks.onStop;
        Debug.engine.hooks.onStop = () => {
            oldStopHook();
            Debug.publish();
        }
        const oldPauseHook = Debug.engine.hooks.onPause;
        Debug.engine.hooks.onPause = () => {
            oldPauseHook();
            Debug.publish();
        }
        const oldStepHook = Debug.engine.hooks.onStep;
        Debug.engine.hooks.onStep = () => {
            oldStepHook();
            Debug.publish();
        }
    },

    onFrame: (time, frame, fps, stats) => {
        if (bridge && time % 100 < 10) { // throttle to ~10 Hz
            Debug.publish();
        }
    },

    setParam: (path, value) => {
    },

    toggle: (path, value) => {
    }
};

// Add the debug functions to the RenderEngine object
RenderEngine.Debug = Debug;

// hook into the engine initialization to notify the debugger bridge
const oldInitialize = RenderEngine.initialize;
RenderEngine.initialize = (engineOptions) => {
    oldInitialize(engineOptions);
    Debug.initialize(engineOptions);
}

console.debug("Initializing debugging bridge...");
