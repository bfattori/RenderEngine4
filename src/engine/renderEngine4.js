/**
 * Render Engine 4 bootstrapper
 */
import Engine from './core/Engine.js';

// Render Engine 4 instance
let engineOptions = null;
const RenderEngine = {
    RE4: null,

    /**
     * Initialize the Render Engine 4.
     * 
     * @param {Object} options - See {@link Engine} for engine configuration options.
     */
    init(options) {
        engineOptions = options;
        RenderEngine.RE4 = Engine.init(engineOptions);

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
        console.info("Started", RE4.engine.options, seedTime);
    },

    /**
     * Pause the engine
     */
    pause() {
        RE4.stop();
        console.warn("Paused");
    },

    /**
     * Stop and reset the engine
     */
    stop() {
        RE4.reset();
        console.error("Stopped");
    },

    /**
     * Shutdown the engine
     */
    shutdown() {
        RE4.shutdown();
        Console.info("Shutdown");
    },

    get world() {
        return RE4.world;
    },

    get eventEngine() {
        return RE4.eventEngine;
    },

    get camera() {
        return this.world.camera;
    },

    get renderContext() {
        return this.world.renderContext;
    }
}

// Reserved keyboard hook to allow shutdown 
// of an out of control engine
window.addEventListener('keyup', (event) => {
    if (event.key === 'F9')
        RenderEngine.stop();
})

console.info("Bootstrapper loaded");
export default RenderEngine;
