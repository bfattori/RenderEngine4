import RenderContext from '../contexts/RenderContext.js';
import Constants from '../../Constants.js';

export default class RenderContextProjector extends RenderContext {
    #rerouteContext = null;

    #connectUrl = null;
    #serveUrl = null;
    #acceptUrl = null;

    #connections = new Map(); // Map of connection IDs to RemoteRenderConnection objects
    #connectionIdCounter = 0; // Counter for generating unique connection IDs
    #maxConnections = 1;

    #connectionShapeMap = new Map();

    /**
     * Create a remote render context, on top of a render context, which can be used to reroute 
     * rendering requests to other clients. 
     * @param {Renderer} renderer - The renderer used
     * @param {RenderContext} renderContext - The render context to reroute
     * @param {Object} options - Configuration options
     */
    constructor(renderer, renderContext, options={ maxConnections: 10 }) {
        super(renderer, options);
        this.#rerouteContext = renderContext;
        this.#maxConnections = options.maxConnections; // Maximum number of connections allowed
        this.#instrumentContext();
    }
 
    /**
     * Set the Url that clients will connect to, which will be used to connect clients
     * to the server. Presents a dialog in the client's browser to choose available slots.
     * 
     * @param {String} url - The url to listen for new connections
     */
    set connectUrl(url) {
        this.#connectUrl = url;

        // start the listener for client connections. connecting to this endpoint
        // presents an offer to accept a client connection slot.
    }

    /**
     * The endpoint for new client connections.
     * @returns {String}
     */
    get connectUrl() {
        return this.#connectUrl;
    }

    /**
     * This is the endpoint where clients communicate with the server.
     * @param {String} url - Client communication endpoint
     */
    set serveUrl(url) {
        this.#serveUrl = url;
    }

    /**
     * The endpoint for serving clients.
     * @returns {String}
     */
    get serveUrl() {
        return this.#serveUrl;
    }

    /**
     * The url where the client requests are accepted. They are moved to
     * a websocket channel for direct communications.
     * @param {String} url - The accept connection Url
     */
    set acceptUrl(url) {
        this.#acceptUrl = url;
    }

    /**
     * The endpoint where client connections are accepted.
     * @returns {String}
     */
    get acceptUrl() {
        return this.#acceptUrl;
    }

    /**
     * Accept the connection and drop them to the websocket channel
     * for communications.
     * @param {Request} client 
     */
    #acceptClientConnection(client) {
        if (this.#connectionIdCounter === this.#maxConnections)
            this.#noMoreConnectionsAvailable(client);

        const connectionId = this.#connectionIdCounter++;
        const connection = new RemoteRenderConnection(connectionId, client);
        this.#addConnection(connectionId, connection);
    }

    /**
     * There are no more available connections - inform the client.
     * @param {Request} client 
     */
    #noMoreConnectionsAvailable(client) {
        // inform the client that there are no more open connections

    }

    /**
     * Add a new connection and initialize.
     * @param {number} connectionId 
     * @param {RemoteRenderConnection} connection 
     */
    #addConnection(connectionId, connection) {
        this.#connections.set(connectionId, connection);
    }

    /**
     * Make modifications to the context to project rendering methods to the {@link RemoteRenderContext}
     */
    #instrumentContext() {
        const rc = this.#rerouteContext;

        //-----------------------------
        // compiled shapes
        //----------------------------
        
        rc.prototype.getCompiledShape = (instructions, tag) => {
            const response = await this.#submitTask("compile", { instructions: instructions, tag: tag });
        }

        rc.prototype.destroyCompiledShape = (opaqueId) => {
            const response = await this.#submitTask("destroy", { opaqueId: opaqueId });
        }

        //---------------------------
        // rendering
        //---------------------------
        
        /**
         * Updates the rendering state based on current world time and delta
         * @param {number} currentTime - Current game time in milliseconds
         * @param {number} deltaTime - Time since last update in milliseconds
         * @returns {boolean} true if update was successful
         */
        rc.prototype.update = (currentTime, deltaTime) => {
            super.update(currentTime, deltaTime);
            return true;
        }

        /**
         * Add a rendering instruction. If the context is in immediate mode, the instruction is
         * drawn to the renderer as soon as it is received.
         * @param  {String} instruction A rendering instruction
         */
        rc.prototype.addInstruction = (instruction) => {
            if (this.immediateMode) {
                const response = await this.#submitTask("render", { instruction: instruction });
            } else {
                super.addInstruction(instruction);
            }
        }

        rc.prototype.renderInstructions = (time, deltaTime) => {
            // play out any pending instructions
            const response = await this.#submitTask("renderFrame", { instructions: this.#instructionBuffer, time: time, deltaTime: deltaTime });
        }
    }

    async #submitTask(taskType, operation) {
        // send out a request over the line, await a response...
    }
}