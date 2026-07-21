import RenderContext from '../contexts/RenderContext.js';
import Constants from '../../Constants.js';

import { RenderContextError } from '../contexts/RenderContext.js';

export default class RenderContextProjector extends RenderContext {
    #rerouteContext = null;
    #serveWSS = null;

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
    constructor(renderer, renderContext, options={ serverSocket: null, maxConnections: 10 }) {
        super(renderer, options);
        this.#rerouteContext = renderContext;
        this.#serveWSS = options.serverSocket;
        this.#maxConnections = options.maxConnections; // Maximum number of connections allowed
        this.#instrumentContext();
    }
 
    /**
     * This is the channed where clients communicate with the server.
     * @param {String} socket - Client communication channel
     */
    set serveWS(socket) {
        this.#serveWS = socket;
    }

    /**
     * The endpoint for serving clients.
     * @returns {String}
     */
    get serveWS() {
        return this.#serveWS;
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
        client.__id = connectionId;
        this.#addConnection(connectionId, client);
    }

    /**
     * There are no more available connections - inform the client.
     * @param {Request} client 
     */
    #noMoreConnectionsAvailable(client) {
        // inform the client that there are no more open connections
        this.#submitTask(client, 0, 'refused', { message: 'No more connections!' });
    }

    /**
     * Add a new connection and initialize.
     * @param {number} connectionId 
     * @param {RemoteRenderConnection} connection 
     */
    #addConnection(connectionId, connection) {
        this.#connections.set(connectionId, connection);
        this.#submitTask(connection, 0, 'hello', { id: connectionId });
    }

    /**
     * Handle inbound data from client connections
     * @param {WebSocket} client - Client connection
     * @param {Object} data - Data received from the client
     */
    #handleClientMessage(client, data) {
        const clientId = client.__id;
        switch (data.task) {
            case 'hello': // client tells us their client Id
                break;
            case 'compiled': // map the remote opaque Id to the local opaque Id for the client Id
                this.#connectionShapeMap.set(clientId, { remoteOpaqueId: data.opaqueId })
                break;
            case 'destroyed': // the shape was destroyed on the client
                break;
            case 'input': // input received from the client
                break;
        }
    }

    /**
     * Modifiy the context to project rendering 
     * methods to the {@link RemoteRenderContext} over a WebSocket
     */
    #instrumentContext() {
        if (this.#serveWSS === null) {
            throw new RenderContextError(this, "No websocket connection provided - cannot start!");
        }

        // the context we're rerouting its methods to pass to the remote client
        const rc = this.#rerouteContext;

        // we don't need the renderer on the server
        if (rc.renderer)
            rc.renderer.destroy();

        // set up the client connection listener
        this.#serveWSS.on('connection', (conn) => {
            conn.on('message', (data) => {
                this.#handleClientMessage(conn, data);
            });
            conn.on('error', console.error);
            this.#acceptClientConnection(conn);
        });

        //-----------------------------
        // compiled shapes
        //----------------------------
        
        rc.getCompiledShape = (instructions, tag) => {
            this.#submitTask(++requestId, "compile", { instructions: instructions, tag: tag });
        }

        rc.destroyCompiledShape = (opaqueId) => {
            this.#submitTask(++requestId, "destroy", { opaqueId: opaqueId });
        }

        rc.renderCompiledShape = (opaqueId) => {
            this.#submitTask(++requestId, "renderShape", {opaqueId: opaqueId});    
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
        rc.update = (currentTime, deltaTime) => {
            super.update(currentTime, deltaTime);
            return true;
        }

        /**
         * Add a rendering instruction. If the context is in immediate mode, the instruction is
         * drawn to the renderer as soon as it is received.
         * @param  {String} instruction A rendering instruction
         */
        rc.addInstruction = (instruction) => {
            if (this.immediateMode) {
                this.#submitTask(++requestId, "render", { instruction: instruction });
            } else {
                super.addInstruction(instruction);
            }
        }

        rc.renderInstructions = (time, deltaTime) => {
            // play out any pending instructions
            this.#submitTask(++requestId, "renderFrame", { instructions: this.#instructionBuffer, time: time, deltaTime: deltaTime });
        }
    }

    /**
     * Transmit a task to the client for execution
     * @param {WebSocket} client - The client socket
     * @param {number} requestId - Request Id for request/response matching
     * @param {String} taskType - The type of task to execute on the client
     * @param {Object} operation - The object containing task-specific information
     */
    #submitTask(client, requestId, taskType, operation) {
        // send out a request over the line, await a response...
        client.send(JSON.stringify({ id: requestId, task: taskType, operation: operation }));
    }
}