

export default class RemoteRenderContext {
    static CONNECTION = {
        DISCONNECTED: 'disconnected',
        CONNECTING: 'connect',
        NEGOTIATING: 'negotiating',
        CONNECTED: 'connected'
    };

    #socket = null;
    #localClientId = -1;
    #remoteClientId = -1;
    #renderer = null;
    #streaming = false;
    #streamWriter = null;
    #status = RemoteRenderContext.CONNECTION.DISCONNECTED;

    constructor(renderer, clientId, wsEndpoint) {
        this.#status = RemoteRenderContext.CONNECTION.CONNECTING;
        this.#renderer = renderer;
        this.#localClientId = parseInt(/([^\\D]+)/g.exec(clientId)[1]);
        this.#setup(wsEndpoint);
    }

    set renderer(renderer) {
        this.#renderer = renderer;
    }

    /**
     * Establish the websocket communication with the server.
     * @param {String} wsEndpoint - The endpoint for the socket connection
     * @private
     */
    #setup(wsEndpoint) {
        if (!("WebSocketStream" in self)) {
            // standard WebSocket if streaming not available
            this.#socket = new WebSocket(wsEndpoint);
            this.#instrumentSocket();
        } else {
            // streaming is more efficient
            this.#socket = new WebSocketStream(wsEndpoint);
            await this.#instrumentStreaming();
        }

        this.#openConnection();
    }

    /**
     * Open the connection to the server. This will send 
     * a "hello" message with the client ID.
     * @private
     */
    #openConnection() {
        // hello server, I am...
        this.#status = RemoteRenderContext.CONNECTION.NEGOTIATING;
        this.#toServer("hello", {clientId: this.#localClientId });
    }

    //-------------------------------------------
    // Handle operations inbound from the server
    //-------------------------------------------

    /**
     * Process inbound operations from the server, sending
     * responses where needed.
     * @param {Object} operation
     * @private 
     */
    async #processOperation(operation) {
        switch(operation.task) {
            case "hello":
                this.#connectionAcknowledged(operation);
                break;
            case "refused":
                this.#connectionRefused(operation);
                break;
            case "compile":
                const opaqueId = this.#compileShape(operation);
                await this.#toServer("compiled", {requestId: operation.requestId, clientId: this.#clientId, opaqueId: opaqueId});
                break;
            case "kill":
                this.#destroyShape(operation);
                await this.#toServer("killed", {clientId: this.#clientId, opaqueId: operation.opaqueId});
            case "inst":
                this.#renderInstruction(operation);
                // no acknowledgment for immediate instruction rendering
                break;
            case "frame":
                this.#renderFrame(operation);
                await this.#toServer("rendered", {requestId: operation.requestId, clientId: this.#clientId });
                break;
        }
    }

    //-----------------------------------
    // Outbound to server
    //-----------------------------------

    /**
     * Send a message to the server
     * @param {String} taskType - The type of message
     * @param {Object} data - The data related to the message
     * @returns 
     */
    async #toServer(taskType, data) {
        const packet = { task: taskType, ... data };
        if (this.#streaming) {
            return await this.#streamWriter.write(packet);
        } else {
            return this.#socket.send(packet);
        }
    }

    //-----------------------------------------
    // Connection status
    //-----------------------------------------

    /**
     * The server has acknowledged our connection, so we can 
     * start processing operations from the server
     * @param {Object} operation 
     * @private
     */
    #connectionAcknowledged(operation) {
        this.#remoteClientId = operation.id;
        this.#status = RemoteRenderContext.CONNECTION.CONNECTED;
        this.#configureRenderer(operation.config);
        
        // This is ready to receive rendering operations
        await this.#toServer("ready", { clientId: this.#localClientId, serverId: this.#remoteClientId });
    }

    /**
     * The connection was refused
     * @param {Object} operation 
     * @private
     */
    #connectionRefused(operation) {
        this.#clientId = null;
        this.#status = RemoteRenderContext.CONNECTION.DISCONNECTED;
    }

    //--------------------------------
    // Rendering Operations
    //--------------------------------

    /**
     * The configuration for the render context on the server to
     * set up the client renderer.
     * @param {Object} config 
     */
    #configureRenderer(config) {
        // set the dimensions and other rendering options
    }

    /**
     * Compile a shape locally, then return the opaque Id from the local system.
     * @param {Object} operation 
     * @returns {number} The opaque Id
     * @private
     */
    #compileShape(operation) {
        return this.#renderer.getCompiledShape(operation.instructions, `remoteShape_${operation.tag}`);
    }

    /**
     * Destroy the shape with the given Id
     * @param {Object} operation 
     * @private 
     */
    #destroyShape(operation) {
        this.#renderer.destroyCompiledShape(operation.opaqueId);
    }

    /**
     * Render out a single instruction on the renderer
     * @param {Object} operation 
     * @private 
     */
    #renderInstruction(operation) {
        // immediate mode
        this.#renderer.render(operation.instruction);
    }

    /**
     * Render a complete frame of instructions
     * @param {Object} operation 
     * @private
     */
    #renderFrame(operation) {
        const { instructions, serverTime, serverDeltaTime } = operation;
        for (const instruction of instructions) {
            this.#renderer.render(instruction, serverTime, serverDeltaTime);
        }
    }

    //------------------------------------
    // Underlying sockets
    //------------------------------------

    /**
     * Instrument a streaming websocket for communication
     */
    async #instrumentStreaming() {
        const { readable, writable, extensions, protocol } = await this.#socket.opened;
        const reader = readable.getReader();
        this.#streamWriter = writable.getWriter();
        this.#streaming = true;

        while(true) {
            const { operation, done } = await reader.read();
            if (done) break;

            await this.#processOperation(operation);
        }
    }

    /**
     * Instrument a standard websocket for communication
     */
    #instrumentSocket() {
        this.#socket.addEventListener("open", (event) => {
        });

        // Listen for messages
        this.#socket.addEventListener("message", (event) => {
            await this.#processOperation(event.data);
        });

        this.#socket.addEventListener("close", (event) => {
            console.log("Connection closed by the server");
        });

        this.#socket.addEventListener("error", (event) => {
            console.log("Connection error");
        })
    }
}