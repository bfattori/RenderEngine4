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
    engineThreadManager: null,      // set inside the main thread, null in the game thread
    gameThread: null,               // set inside the game thread, null in the main thread
    renderer: null,

    /**
     * Initialize the Render Engine 4.
     * 
     * @param {String} gameRoot - Pass `import.meta.url` from the launch file
     * @param {Object} options - See {@link Engine} for engine configuration options.
     */
    async init(gameRoot, options) {
        engineOptions = options;

        if (options && !options.thread) {
            RenderEngine.RE4 = await Engine.init(gameRoot, import.meta.url, engineOptions);

            // assign to Global scope
            globalThis.RE4 = RenderEngine.RE4;
            globalThis.RenderEngine4 = RenderEngine.RE4;

            // initialize the render engine bootstrapper
            RenderEngine.initialize(engineOptions);
        } else {
            // we can query the global context to determine if we're on the main thread
            self.isMainThread = true;
            
            // load the threading engine manager and redirect there
            const threadMgr = await import(new URL('./core/threaded/EngineThreadManager.js', import.meta.url));
            RenderEngine.engineThreadManager = threadMgr.default;
            await RenderEngine.engineThreadManager.start(new URL(options.gamePath, gameRoot), options.renderer);
        }
    },

    initialize(engineOptions) {
        console.debug("Render Engine 4 initialized", RE4.options.opts);
        console.verbose(engineOptions);

        if (RenderEngine.isGameThread)
            RenderEngine.pipeToMain.configEngine(RE4.options.opts);
    },

    async setEngineConfig(engineConfig) {
        engineConfig.particleEngineDisabled = true;
        engineConfig.world.renderContext.renderer = engineOptions.renderer;

        // configure the engine
        RenderEngine.RE4 = await Engine.configEngine(engineConfig);

        // assign to Global scope
        globalThis.RE4 = RenderEngine.RE4;
        globalThis.RenderEngine4 = RenderEngine.RE4;
    },

    get renderer() {
        return RenderEngine.engineThreadManager.instance.renderer;
    },

    get isMainThread() {
        return self.isMainThread;
    },

    get isGameThread() {
        return self.isGameThread;
    },

    get pipeToRunLoop() {
        return RenderEngine.engineThreadManager.instance;
    },

    get pipeToMain() {
        return RenderEngine.gameThread;
    },

    set runLoopThread(thread) {
        RenderEngine.gameThread = thread;
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
     * Resume the engine after pausing
     */
    start() {
        if (RenderEngine.engineThreadManager)
            RenderEngine.engineThreadManager.instance.start();
        else {
            RE4.start();
            console.info("Started");
        }
        RenderEngine.paused = false;
    },

    /**
     * Resume the engine after pausing
     */
    resume() {
        if (RenderEngine.engineThreadManager)
            RenderEngine.engineThreadManager.instance.resume();
        else {
            RE4.start();
            console.info("Resumed");
        }
        RenderEngine.paused = false;
    },

    /**
     * Pause (halt) the engine without resetting it
     */
    pause() {
        if (RenderEngine.engineThreadManager)
            RenderEngine.engineThreadManager.instance.pause();
        else {
            console.info("Paused");
            RE4.stop();
        }
        RenderEngine.paused = true;
    },

    /**
     * Stop and reset the engine.
     */
    stop() {
        if (RenderEngine.engineThreadManager)
            RenderEngine.engineThreadManager.instance.stop();
        else {
            RE4.reset();
            console.info("Stopped & reset");
        }
        RenderEngine.reset = true;
    },

    /**
     * Step the engine by one frame
     */
    step() {
        if (RenderEngine.engineThreadManager)
            RenderEngine.engineThreadManager.instance.step();
        else
            RE4.step();
    },

    /**
     * Shutdown the engine.
     */
    shutdown() {
        if (RenderEngine.engineThreadManager)
            RenderEngine.engineThreadManager.instance.shutdown();
        else {
            console.info("... shutting down");
            RE4.destroy();
        }
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

if (!(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)) {
    // ONLY LOADED IN THE MAIN THREAD

    /**
     * `F2` while the engine is running will pause it. Pressing it again will resume the engine.
     * Pressing `F4` while the engine is running will stop and reset the engine. Pressing it again will 
     * shut the engine down. `F9` while the engine is paused will step the engine by one frame.
     */
    window.addEventListener('keyup', (event) => {
        if (event.keyCode === KeyboardInput.KEY_CODES.RESERVED_F2)
            if (RenderEngine.paused) {
                RenderEngine.resume();
            } else {
                RenderEngine.pause();
            }
        
        if (event.keyCode === KeyboardInput.KEY_CODES.RESERVED_F9)
            if (RenderEngine.paused) {
                RenderEngine.step();
            }

        if (event.keyCode === KeyboardInput.KEY_CODES.RESERVED_F4)
            if (RenderEngine.reset) {
                RenderEngine.shutdown();
            } else {
                RenderEngine.stop();
            }
        
        if ([KeyboardInput.KEY_CODES.RESERVED_F2, KeyboardInput.KEY_CODES.RESERVED_F4, KeyboardInput.KEY_CODES.RESERVED_F9].includes(event.keyCode)) {
            event.preventDefault = true;
            return false;
        }
    });    
}


// Shutdown the engine if the window is unloading
// HOPEFULLY cleaning up threads so they stop 
// hanging around after restarts!!
self.addEventListener('beforeunload', (event) => {
    RenderEngine.shutdown();
});

console.verbose("Bootstrapper loaded");
export default RenderEngine;