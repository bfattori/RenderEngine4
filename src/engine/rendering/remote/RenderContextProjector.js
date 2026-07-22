import RenderContext from '../contexts/RenderContext.js';
import Constants from '../../Constants.js';

import { RenderContextError } from '../contexts/RenderContext.js';

class RemoteRenderConnection {
    #client = null
    #shapeTable = new Map();
    #ready = false;

    constructor(client) {
        this.#client = client;
    }

    get client() {
        return this.#client;
    }

    get clientId() {
        return this.#client.__id;
    }

    set ready(state) {
        this.#ready = state;
    }

    get ready() {
        return this.#ready;
    }

    /**
     * Map a remotely compiled shape Id to the local Id
     * @param {number} serverId - The server Id
     * @param {number} clientId - The client's Id
     */
    mapShape(serverId, clientId) {
        this.#shapeTable.set(serverId, clientId);
    }

    deleteShape(serverId) {
        this.#shapeTable.delete(serverId);
    }

    /**
     * Get the Id of the remote shape for the local Id
     * @param {number} localId 
     * @returns {number}
     */
    remoteIdFor(localId) {
        return this.#shapeTable.get(localId);
    }

}


export default class RenderContextProjector extends RenderContext {
    #rerouteContext = null;
    #serveWSS = null;

    #connections = new Map(); // Map of connection IDs to RemoteRenderConnection objects
    #connectionIdCounter = 0; // Counter for generating unique connection IDs
    #maxConnections = 1;

    #pending = new Map();
    #shapeId = 58;

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
     * Returns the number of player slots that have connected
     * @returns {number}
     */
    get playersReady() {
        let readyCount = 0;
        for (const conn of this.#connections.values()) {
            if (conn.isReady)
                readyCount++;
        }
        return readyCount;
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
        this.#addConnection(connectionId, new RemoteRenderConnection(client));
        this.#broadcast('clientConnected', connectionId);
    }

    /**
     * There are no more available connections - inform the client.
     * @param {Request} client 
     */
    #noMoreConnectionsAvailable(client) {
        // inform the client that there are no more open connections
        this.#toClient(client, 0, 'refused', { message: 'No more connections available!' });
    }

    /**
     * Add a new connection and initialize.
     * @param {number} connectionId 
     * @param {RemoteRenderConnection} connection 
     */
    #addConnection(connectionId, connection) {
        this.#connections.set(connectionId, connection);

        // let the client know their server id
        // and the configuration for the render context
        this.#toClient(connection, 0, 'hello', { 
            id: connectionId,
            config: this.#rerouteContext.serialize()
        });
    }

    /**
     * Handle inbound data from client connections
     * @param {WebSocket} client - Client connection
     * @param {Object} data - Data received from the client
     * @param {String} [data.task] - The task name of the operation
     * @param {Object} [data.operation] - The operation information
     */
    #fromClient(client, data) {
        const clientId = client.__id;
        const requestId = data.requestId;
        const pendingData = this.#pendingData.get(requestId);
        const conn = this.#connections.get(clientId);

        switch (data.task) {
            case 'hello': // client tells us their client Id
                this.#acceptClientConnection(client, data.operation);
                break;
            case 'ready': // this client is ready for the game loop to start
                break;
            case 'compiled': // map the remote opaque Id to the local opaque Id for the client Id
                conn.mapShape(data.operation.opaqueId, pendingData.opaqueId);
                break;
            case 'killed': // the shape was destroyed on the client
                conn.deleteShape(data.operation.opaqueId);
                break;
            case 'rendered': // the frame was rendered on the client
                break;
            case 'input': // input received from the client
                break;
        }

        if (this.#pendingData.get(requestId) !== null) {
            // clean up
            this.#pendingData.delete(requestId);
        }
    }

    /**
     * Transmit a task to the client for execution
     * @param {WebSocket} client - The client socket
     * @param {number} requestId - Request Id for request/response matching
     * @param {String} taskType - The type of task to execute on the client
     * @param {Object} operation - The object containing task-specific information
     */
    #toClient(client, requestId, taskType, operation, data) {
        if (data) {
            this.#pending.set(requestId, data);
        }

        // send out a request over the line, await a response...
        client.send(JSON.stringify({ id: requestId, task: taskType, operation: operation }));
    }

    #broadcast(type, message) {
        for (const c of this.#serveWS.clients) {
            c.send(JSON.stringify({ type: type, message: message }));
        }
    }

    /**
     * Modifiy the render context to project rendering 
     * methods to the {@link RemoteRenderContext} over a WebSocket
     */
    #instrumentContext() {
        if (this.#serveWSS === null) {
            throw new RenderContextError(this, "No websocket connection provided - cannot start!");
        }

        // the context we're rerouting its methods
        const rc = this.#rerouteContext;

        // we don't need the renderer on the server
        if (rc.renderer)
            rc.renderer.destroy();

        // set up the client connection listener
        this.#serveWSS.on('connection', (conn) => {
            conn.on('message', (data) => {
                this.#fromClient(conn, data);
            });
            conn.on('error', console.error);
            this.#acceptClientConnection(conn);
        });

        //-----------------------------
        // compiled shapes
        //----------------------------
        
        /**
         * Render a compiled shape on the client. We will get back their opaque Id,
         * which is unique to their client, so we need to add it to their shape map.
         * @param {Array<String>} instructions 
         * @param {String} tag 
         */
        rc.getCompiledShape = (instructions, tag) => {
            const localShapeId = this.#shapeId++;
            this.#toClient(++requestId, 
                "compile", 
                { instructions: instructions, tag: tag },
                { opaqueId: localShapeId });
            return localShapeId;
        }

        /**
         * Destroy the compiled shape on the client, using its opaque Id
         * @param {number} opaqueId 
         */
        rc.destroyCompiledShape = (opaqueId) => {
            const conn = this.#connections.get(clientId);
            this.#toClient(++requestId, "kill", { opaqueId: conn.remoteIdFor(opaqueId) });
        }

        rc.renderCompiledShape = (opaqueId) => {
            const conn = this.#connections.get(clientId);
            this.#toClient(++requestId, "shape", {opaqueId: conn.remoteIdFor(opaqueId) });    
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
                this.#toClient(++requestId, "inst", { instruction: instruction });
            } else {
                super.addInstruction(instruction);
            }
        }

        rc.renderInstructions = (time, deltaTime) => {
            // play out any pending instructions
            this.#toClient(++requestId, "frame", { instructions: this.#instructionBuffer, time: time, deltaTime: deltaTime });
        }
    }
}