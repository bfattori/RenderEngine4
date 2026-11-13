/**
 * Render Engine 4 bootstrapper
 */
import Engine from './core/Engine.js';
import KeyboardInput from './parts/input/KeyboardInput.js';

// Render Engine 4 instance
let engineOptions = null;
const RenderEngine = {
    STARTUP_ROOT: import.meta.url,

    RE4: null,
    paused: false,
    reset: false,

    /**
     * Initialize the Render Engine 4.
     * 
     * @param {String} gamePath - Typically pass `import.meta.url`
     * @param {Object} options - See {@link Engine} for engine configuration options.
     */
    async init(gamePath, options) {
        engineOptions = options;
        RenderEngine.RE4 = await Engine.init(gamePath, import.meta.url, engineOptions);

        // assign to Global scope
        globalThis.RE4 = RenderEngine.RE4;
        globalThis.RenderEngine4 = RenderEngine.RE4;

        // initialize the render engine bootstrapper
        RenderEngine.initialize(engineOptions);
    },

    initialize(engineOptions) {
        console.debug("Render Engine 4 initialized", RE4.options.opts);
        console.verbose(engineOptions);
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
     * Show a simple loading box over the display to prevent interaction
     * @param {String} text - The text to display, or "LOADING..." if `null`
     */
    loading(text) {
        document.querySelector('div#loading div.text').textContent = text || 'LOADING...';
        document.getElementById('loading').classList.remove('hide');
    },

    /**
     * Hide the loading box
     */
    doneLoading() {
        document.getElementById('loading').classList.add('hide');
    },

    /**
     * Start the engine
     */
    start() {
        RE4.start();
        console.info(" - started", RE4.engine.options);
        RenderEngine.paused = false;
    },

    /**
     * Pause (halt) the engine without resetting it.
     */
    pause() {
        RenderEngine.paused = true;
        console.warn(" - paused");
        RE4.stop();
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
     * Step the engine by one frame
     */
    step() {
        RE4.step();
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
    },

    /**
     * The engine hooks
     * @returns {Object}
     */
    get hooks() {
        return RE4.hooks;
    },

    /**
     * Game relative location
     * @returns {String}
     */
    get relativeLocation() {
        return this.STARTUP_ROOT;
    }
}

/**
 * `F2` while the engine is running will pause it. Pressing it again will resume the engine.
 * Pressing `F4` while the engine is running will stop and reset the engine. Pressing it again will 
 * shut the engine down. `F9` while the engine is paused will step the engine by one frame.
 */
window.addEventListener('keyup', (event) => {
    if (event.keyCode === KeyboardInput.KEY_CODES.RESERVED_F2)
        if (RenderEngine.paused) {
            console.warn(" - resuming...");
            RenderEngine.start();
        } else {
            RenderEngine.pause();
        }
    
    if (event.keyCode === KeyboardInput.KEY_CODES.RESERVED_F9)
        if (RenderEngine.paused) {
            RenderEngine.step();
        }

    if (event.keyCode === KeyboardInput.KEY_CODES.RESERVED_F4)
        if (RenderEngine.reset) {
            console.warn(" - shutting down...");
            RenderEngine.shutdown();
        } else {
            RenderEngine.stop();
        }
    
    if ([KeyboardInput.KEY_CODES.RESERVED_F2, KeyboardInput.KEY_CODES.RESERVED_F4, KeyboardInput.KEY_CODES.RESERVED_F9].includes(event.keyCode)) {
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

console.verbose("Bootstrapper loaded");
export default RenderEngine;