'use strict';

/**
 * Render Engine 4 debug bootstrapper
 */
import RenderEngine from './renderEngine4.js';

// Debugger bridge
const bridge = globalThis.__RE4_DEBUG__;
const M = globalThis.RE4_MESSAGES;

console.debug("Connecting to RenderEngine4 DevTools bridge...");

const Debug = {
    engine: null,

    // called by the engine at runtime to initialize the 
    // debug bridge which communication with the DevTools extension
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
            bridge.on(M.CMD.TOGGLE,    ({ path, value }) => Debug.toggleParam(path, value));

            // override the engine's callbacks to publish status updates to the debugger bridge
            Debug.overrideCallbacks();

            // start us off
            console.debug("DevTools bridge connected.");
            Debug.publish();
        } else {
            console.error("DevTools bridge not found - uninstalling debug tooling!");
            delete RenderEngine.Debug;
        }
    },

    /**
     * Real-time engine state update to the DevTools extension
     */
    publish: () => {
        bridge.emit(M.EVT.STATUS, { 
            state: Debug.engine.state, 
            frame: Debug.engine.frameNumber, 
            fps: Debug.engine.realFPS, 
            stats: Debug.engine.snapshotStats() 
        });    
    },

    /**
     * Called per-frame to update the DevTools 
     * extension on a regular cadence
     * @param {number} time - The engine time
     * @param {number} frame - The frame number
     * @param {number} fps - The engine FPS
     * @param {Object} stats - Stats about various components of the engine
     */
    onFrame: (time, frame, fps, stats) => {
        if (bridge && time % 100 < 10) { // throttle to ~10 Hz
            Debug.publish();
        }
    },

    /**
     * Sets a value in the engine's configuration. Called by the DevTools extension.
     * @param {String} path - The config path
     * @param {*} value - The value to set
     */
    setParam: (path, value) => {
    },

    /**
     * 
     * @param {String} path - The config path
     * @param {boolean} value - The value to set to, or `undefined` to toggle
     */
    toggleParam: (path, value) => {
    },

    /**
     * Hook into the engine callbacks to relay information on state changes
     * to keep the DevTools extension current.
     * @private
     */
    overrideCallbacks: () => {
        const EngineHooks = Debug.engine.hooks;

        const oldFrameHook = EngineHooks.onFrame;
        EngineHooks.onFrame = (time, frame, fps, stats) => {
            oldFrameHook(time, frame, fps, stats);
            Debug.onFrame(time, frame, fps, stats);
        };

        const oldStartHook = EngineHooks.onStart;
        EngineHooks.onStart = () => {
            oldStartHook();
            Debug.publish();
        };
        const oldStopHook = EngineHooks.onStop;
        EngineHooks.onStop = () => {
            oldStopHook();
            Debug.publish();
        }
        const oldPauseHook = EngineHooks.onPause;
        Debug.engine.hooks.onPause = () => {
            oldPauseHook();
            Debug.publish();
        }
        const oldStepHook = EngineHooks.onStep;
        Debug.engine.hooks.onStep = () => {
            oldStepHook();
            Debug.publish();
        }
    }
};

// instrument the debug functions into the RenderEngine object
RenderEngine.Debug = Debug;

// hook into the engine's initialization to initialize the debugger bridge
const oldInitialize = RenderEngine.initialize;
RenderEngine.initialize = (engineOptions) => {
    oldInitialize(engineOptions);
    Debug.initialize(engineOptions);
}

