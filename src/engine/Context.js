/**
 * Global context for the engine
 */
export default class Context {
    #debug = false;

    constructor() {}

    static getInstance() {
        if (this.#instance === null) {
            this.#instance = new Context();
        }
        return this.#instance;
    }

    static get debug() {
        return this.#debug;
    }

    static set debug(state) {
        this.#debug = state;
    }
}