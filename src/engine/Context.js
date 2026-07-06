/**
 * Global context for the engine
 */
export default class Context {
    #debug = true;
    static #instance = null;

    constructor() {}

    static getInstance() {
        if (Context.#instance === null) {
            Context.#instance = new Context();
        }
        return Context.#instance;
    }

    static get debug() {
        return this.#debug;
    }

    static set debug(state) {
        this.#debug = state;
    }
}