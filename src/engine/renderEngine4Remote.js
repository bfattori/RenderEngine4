/**
 * Render Engine 4 bootstrapper
 */
import RemoteRenderContext from './rendering/remote/RemoteRenderContext.js';
import CanvasRenderer from './rendering/renderers/CanvasRenderer.js';

let remoteOptions = null;
const RenderEngine = {
    remoteContext: null,

    /**
     * Initialize the Render Engine 4.
     * 
     * @param {Object} options - 
     */
    connect(clientId, wsEndpoint, options = {}) {
        remoteOptions = options;
        RenderEngine.remoteContext = new RemoteRenderContext(clientId, wsEndpoint);
        console.info("Remote Context initialized", remoteOptions);
    },

    /**
     * Retrieve a copy of the options the engine was initialized with
     * @returns {object} - The initial engine options. Modifying this has no effect.
     */
    get startupOptions() {
        return structuredClone(remoteOptions);
    },

    /**
     * Start the engine
     */
    start(seedTime = 0) {
        RE4.start(engineOptions.world.fps, seedTime);
        console.info("Started", RE4.engine.options, seedTime);
        RenderEngine.paused = false;
    },

    /**
     * Pause the engine
     */
    pause() {
        console.warn("Pausing...");
        RE4.stop();
        RenderEngine.paused = true;
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

// Reserved keyboard hook to shutdown the engine
window.addEventListener('keyup', (event) => {
    if (event.key === 'F9')
        RenderEngine.stop();
    return false;
});

// Reserved keyboard hook to pause the engine
window.addEventListener('keyup', (event) => {
    if (event.key === 'F2')
        if (RenderEngine.paused) {
            console.warn("Resuming...");
            RenderEngine.start();
        } else
            RenderEngine.pause();
    return false;
});

console.info("Bootstrapper loaded");
export default RenderEngine;
