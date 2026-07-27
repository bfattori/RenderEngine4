/**
 * Global context for the engine
 */
export default class Context {
    static #instance = null;
    #debug = true;
    #debugOpts = {};
    
    constructor() {}

    static getInstance() {
        if (Context.#instance === null) {
            Context.#instance = new Context();
        }
        return Context.#instance;
    }

    get debug() {
        return this.#debug;
    }

    set debug(state) {
        this.#debug = state;
    }

    set debugOpts(opts) {
        this.#debugOpts = opts;
    }

    get debugOpts() {
        return this.#debugOpts;
    }
}