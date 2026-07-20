export default class RemoteRenderContext {
    #socket = null;
    #connectionId = null;
    #client = null;
    #renderer = null;
    #streaming = false;

    constructor(connectionId, client) {
        this.#connectionId = connectionId;
        this.#client = client;
        
        // create the connection
        this.#setup();
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
    }

    #instrumentSocket() {
        this.#socket.addEventListener("open", (event) => {
            socket.send("Hello Server!");
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

    async #processOperation(operation, destination) {
        switch(operation.task) {
            case "init":
                this.#configure(operation);
                break;
            case "compile":
                const opaqueId = this.#compileShape(operation);
                await this.#sendResponse(destination, "compiled", {opaqueId: opaqueId})
                break;
            case "destroy":
                this.#destroyShape(operation);
                await this.#sendResponse(destination, "destroyed", {opaqueId: operation.opaqueId});
            case "render":
                this.#renderInstruction(operation);
                // no acknowledgment for immediate instruction rendering
                break;
            case "renderFrame":
                this.#renderFrame(operation);
                await this.#sendResponse(destination, "rendered", {});
                break;
        }
    }

    async #configure(operation) {
        const rendererClass = operation.rendererClass;
        if (typeof global !== "undefined") {
            this.#renderer = new global[rendererClass](this);
        } else {
            this.#renderer = new window[rendererClass](this);
        }
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
            return destination.write(packet);
        } else {
            this.#socket.send({ task:taskType, ...data });
        }
    }
}