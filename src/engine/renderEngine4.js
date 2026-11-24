/**
 * Render Engine 4 bootstrapper
 */
import Engine from './core/Engine.js';
import Util from './core/Util.js';
import KeyboardInput from './parts/input/KeyboardInput.js';

import $Thread from './core/threading/$Thread.js';

// Render Engine 4 instance
let engineOptions = null;
const RenderEngine = {
    STARTUP_ROOT: import.meta.url,

    RE4: null,
    paused: false,
    reset: false,

    gameRoot: null,
    mainThread: null,

    /**
     * Initialize the Render Engine 4.
     * 
     * @param {String} gameRoot - Pass `import.meta.url` from the launch file
     * @param {Object} options - See {@link Engine} for engine configuration options.
     */
    async init(gameRoot, options) {
        engineOptions = Util.deepMerge({}, options);
        RenderEngine.gameRoot = gameRoot;

        if (options && options.thread) {
            // load the module into the main thread and start it
            const mainThreadModule = await import(new URL('./core/threading/MainThread.js', import.meta.url), { type: 'module' });
            RenderEngine.mainThread = new mainThreadModule.default(options.gamePath, gameRoot, options.renderer);
            RenderEngine.mainThread.start(options.gamePath, gameRoot, options.renderer);
        } else {
            RenderEngine.RE4 = await Engine.init(gameRoot, import.meta.url, engineOptions);

            // assign to Global scope
            globalThis.RE4 = RenderEngine.RE4;

            // initialize the render engine bootstrapper
            RenderEngine.initialize(engineOptions);
        }
    },

    initialize(engineOptions) {
        console.debug("Render Engine 4 initialized", RE4.options.opts);
        console.verbose(engineOptions);

        if ($Thread.isGameThread)
            $Thread.pipeToMain.configEngine(RE4.options.opts);
    },

    async setEngineConfig(engineConfig) {
        engineConfig.particleEngineDisabled = true;
        engineConfig.world.renderContext.renderer = engineOptions.renderer;

        // configure the engine
        RenderEngine.RE4 = await Engine.init(RenderEngine.gameRoot, import.meta.url, engineConfig);

        // assign to Global scope
        globalThis.RE4 = RenderEngine.RE4;
        globalThis.RenderEngine4 = RenderEngine.RE4;
    },

    /**
     * Retrieve a copy of the options the engine was initialized with
     * @returns {object} - The initial engine options. Modifying this has no effect.
     */
    get startupOptions() {
        return engineOptions;
    },

    /**
     * Retrieve a copy of the options the engine is operating with.
     * @returns {object} - The current engine options. Modifying this has no effect.
     */
    get options() {
        return Engine.engine.options;
    },

    /**
     * Show a simple loading box over the display to prevent interaction
     * @param {String} text - The text to display, or "LOADING..." if `null`
     */
    loading(text) {
        if ($Thread.isGameThread)
            $Thread.pipeToMain.loading(text);
        else {
            document.querySelector('div#loading div.text').textContent = text || 'LOADING...';
            document.getElementById('loading').classList.remove('hide');
        }
    },

    /**
     * Hide the loading box
     */
    doneLoading() {
        if ($Thread.isGameThread)
            $Thread.pipeToMain.doneLoading();
        else
            document.getElementById('loading').classList.add('hide');
    },

    /**
     * Resume the engine after pausing
     */
    start() {
        if ($Thread.isMainThread)
            $Thread.pipeToGame.start();
        else {
            RenderEngine.RE4.start();
            console.info("Started");
        }
        RenderEngine.paused = false;
    },

    /**
     * Resume the engine after pausing
     */
    resume() {
        if ($Thread.isMainThread)
            $Thread.pipeToGame.resume();
        else {
            RenderEngine.RE4.start();
            console.info("Resumed");
        }
        RenderEngine.paused = false;
    },

    /**
     * Pause (halt) the engine without resetting it
     */
    pause() {
        if ($Thread.isMainThread)
            $Thread.pipeToGame.pause();
        else {
            console.info("Paused");
            RenderEngine.RE4.stop();
        }
        RenderEngine.paused = true;
    },

    /**
     * Stop and reset the engine.
     */
    stop() {
        if ($Thread.isMainThread)
            $Thread.pipeToGame.stop();
        else {
            RenderEngine.RE4.reset();
            console.info("Stopped & reset");
        }
        RenderEngine.reset = true;
    },

    /**
     * Step the engine by one frame
     */
    step() {
        if ($Thread.isMainThread)
            $Thread.pipeToGame.step();
        else
            RenderEngine.RE4.step();
    },

    /**
     * Shutdown the engine.
     */
    shutdown() {
        if ($Thread.isMainThread)
            $Thread.pipeToGame.shutdown();
        else {
            console.info("... shutting down");
            RenderEngine.RE4.destroy();
        }
    },

    /**
     * The game world instance
     * @returns {GameWorld}
     */
    get world() {
        return RenderEngine.RE4.world;
    },

    /**
     * The event engine instance
     * @returns {EventEngine}
     */
    get eventEngine() {
        return RenderEngine.RE4.eventEngine;
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
        return RenderEngine.RE4.particleEngine;
    },

    /**
     * The engine hooks
     * @returns {Object}
     */
    get hooks() {
        return RenderEngine.RE4.hooks;
    },

    /**
     * Game relative location
     * @returns {String}
     */
    get relativeLocation() {
        return this.STARTUP_ROOT;
    }
}

if (!$Thread.isThread) {
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

// Shutdown the engine if the context is unloading
// HOPEFULLY cleaning up threads so they stop 
// hanging around after restarts!!
self.addEventListener('beforeunload', (event) => {
    RenderEngine.shutdown();
});

console.verbose("Bootstrapper loaded");
export default RenderEngine;