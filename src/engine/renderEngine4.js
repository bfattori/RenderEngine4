/**
 * Render Engine 4 bootstrapper
 */
import Console from './core/Console.js'
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

        Console.info("Render Engine 4 initialized", engineOptions);
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
        Console.info("Render Engine 4 started", Engine.engine.options, seedTime);
    },

    /**
     * Pause the engine
     */
    pause() {
        RE4.stop();
        Console.info("Render Engine 4 paused");
    },

    /**
     * Stop and reset the engine
     */
    stop() {
        RE4.reset();
        Console.info("Render Engine 4 stopped");
    },

    /**
     * Shutdown the engine
     */
    shutdown() {
        RE4.shutdown();
        Console.info("Render Engine 4 shutdown");
    },

    console: Console
} 

Console.info("Bootstrapper loaded");
export default RenderEngine;
