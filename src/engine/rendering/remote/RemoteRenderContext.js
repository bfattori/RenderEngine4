export default class RemoteRenderContext {
    #socket = null;
    #connectionId = null;
    #clientId = -1;
    #renderer = null;
    #streaming = false;

    constructor(clientId, wsEndpoint) {
        this.#connectionId = clientId;
        this.#setup(wsEndpoint);
    }

    set renderer(renderer) {
        this.#renderer = renderer;
    }

    #setup(wsEndpoint) {
        if (!("WebSocketStream" in self)) {
            this.#socket = new WebSocket(wsEndpoint);
        } else {
            this.#socket = new WebSocketStream(wsEndpoint);
        }

        this.#establishConnection();
    }

    async #establishConnection() {
        if (this.#socket instanceof WebSocketStream) {
            await this.#instrumentStreaming();
        } else {
            this.#instrumentSocket();
        }
    }

    //------------------------------------
    // Underlying socket
    //------------------------------------

    async #instrumentStreaming() {
        const { readable, writable, extensions, protocol } = await this.#socket.opened;
        const reader = readable.getReader();
        const writer = writable.getWriter();

        this.#streaming = true;

        while(true) {
            const { operation, done } = await reader.read();
            if (done) break;

            await this.#processOperation(operation, writer);
        }

        // prepared
        this.#sendResponse(writer, "hello", {clientId: this.#connectionId });
    }

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

        // prepared
        this.#sendResponse(null, "hello", { clientId: this.#connectionId });
    }

    //-------------------------------------------
    // Handle operations sent from the server
    //-------------------------------------------

    async #processOperation(operation, destination) {
        switch(operation.task) {
            case "hello":
                this.#acknowledgeConnection(operation);
                break;
            case "compile":
                const opaqueId = this.#compileShape(operation);
                await this.#sendResponse(destination, "compiled", {clientId: this.#clientId, opaqueId: opaqueId});
                break;
            case "destroy":
                this.#destroyShape(operation);
                await this.#sendResponse(destination, "destroyed", {clientId: this.#clientId, opaqueId: operation.opaqueId});
            case "render":
                this.#renderInstruction(operation);
                // no acknowledgment for immediate instruction rendering
                break;
            case "renderFrame":
                this.#renderFrame(operation);
                await this.#sendResponse(destination, "rendered", {clientId: this.#clientId });
                break;
        }
    }

    #acknowledgeConnection(operation) {
        this.#clientId = operation.id;
    }

    #compileShape(operation) {
        return this.#renderer.getCompiledShape(operation.instructions, `remoteShape_${operation.tag}`);
    }

    #destroyShape(operation) {
        return this.#renderer.destroyCompiledShape(operation.opaqueId);
    }

    #renderInstruction(operation) {
        // immediate mode
        return this.#renderer.render(operation.instruction);
    }

    #render(operation) {
        const { instructions, serverTime, serverDeltaTime } = operation;
        for (const instruction of instructions) {
            this.#renderer.render(instruction, serverTime, serverDeltaTime);
        }
    }

    async #sendResponse(destination, taskType, data) {
        const packet = { task: taskType, ... data };
        if (this.#streaming) {
            return await destination.write(packet);
        } else {
            return this.#socket.send(packet);
        }
    }
}