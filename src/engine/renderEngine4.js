/**
 * Render Engine 4 bootstrapper
 */
import Engine from './core/Engine.js';
import KeyboardInput from './parts/input/KeyboardInput.js';


// Render Engine 4 instance
let engineOptions = null;
const RenderEngine = {
    RE4: null,
    paused: false,
    reset: false,

    /**
     * Initialize the Render Engine 4.
     * 
     * @param {Object} options - See {@link Engine} for engine configuration options.
     */
    async init(options) {
        engineOptions = options;
        RenderEngine.RE4 = await Engine.init(engineOptions);

        // also assign to Window and Global scope
        if (window) {
            window.RE4 = RenderEngine.RE4;
            window.RenderEngine4 = RenderEngine.RE4;
        } else if (global) {
            global.RE4 = RenderEngine.RE4;
            global.RenderEngine4 = RenderEngine.RE4;
        }

        console.info("Render Engine 4 initialized", engineOptions);
    },

    /**
     * Retrieve a copy of the options the engine was initialized with
     * @returns {object} - The initial engine options. Modifying this has no effect.
     */
    get startupOptions() {
        return structuredClone(engineOptions);
    },

    /**
     * Retrieve a copy of the options the engine is operating with.
     * @returns {object} - The current engine options. Modifying this has no effect.
     */
    get options() {
        return structuredClone(Engine.engine.options);
    },

    /**
     * Start the engine
     */
    start(seedTime = 0) {
        RE4.start(engineOptions.world.fps, seedTime);
        console.info(" - started", RE4.engine.options, seedTime);
        RenderEngine.paused = false;
    },

    /**
     * Pause (halt) the engine without resetting it.
     */
    pause() {
        console.warn(" - paused");
        RE4.stop();
        RenderEngine.paused = true;
    },

    /**
     * Stop and reset the engine.
     */
    stop() {
        RE4.reset();
        console.info(" - stopped & reset");
        RenderEngine.reset = true;
    },

    /**
     * Shutdown the engine.
     */
    shutdown() {
        console.info(" - shutting down");
        RE4.destroy();
    },

    /**
     * The game world instance
     * @returns {GameWorld}
     */
    get world() {
        return RE4.world;
    },

    /**
     * The event engine instance
     * @returns {EventEngine}
     */
    get eventEngine() {
        return RE4.eventEngine;
    },

    /**
     * The game world primary camera
     * @returns {Camera}
     */
    get camera() {
        return this.world.camera;
    },

    /**
     * The render context for the game
     * @return {RenderContext}
     */
    get renderContext() {
        return this.world.renderContext;
    },

    /**
     * The particle engine instance
     * @returns {ParticleEngine}
     */
    get particleEngine() {
        return RE4.particleEngine;
    }
}

/**
 * `F2` while the engine is running will pause it. Pressing it again will resume the engine.
 * Pressing `F4` while the engine is running will stop and reset the engine. Pressing it again will 
 * shut the engine down.
 */
window.addEventListener('keyup', (event) => {
    if (event.code === KeyboardInput.KEY_CODES.RESERVED_F2)
        if (RenderEngine.paused) {
            console.warn(" - resuming...");
            RenderEngine.start();
        } else {
            RenderEngine.pause();
        }
    
    if (event.code === KeyboardInput.KEY_CODES.RESERVED_F4)
        if (RenderEngine.reset) {
            console.warn(" - shutting down...");
            RenderEngine.shutdown();
        } else {
            RenderEngine.stop();
        }
    
    if ([KeyboardInput.KEY_CODES.RESERVED_F2, KeyboardInput.KEY_CODES.RESERVED_F4].includes(event.code)) {
        event.preventDefault = true;
        return false;
    }
});

// Shutdown the engine if the window is unloading
// HOPEFULLY cleaning up threads so they stop 
// hanging around after restarts!!
window.addEventListener('beforeunload', (event) => {
    RenderEngine.shutdown();
});

console.info("Bootstrapper loaded");
export default RenderEngine;
