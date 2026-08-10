/**
 * Global context for the engine
 */
export default class Context {
    static #instance = null;
    #debug = true;
    #debugOpts = {};
    #engineOpts = {};
    
    constructor() {}

    static getInstance() {
        if (Context.#instance === null) {
            Context.#instance = new Context();
        }
        return Context.#instance;
    }

    /**
     * Prevents script caching, if enabled
     * @returns {String}
     */
    get preventScriptCache() {
        return this.engineOpts.preventScriptCaching ? '?v=' + Date.now() : '';
    }

    /**
     * Prevents thread caching, if enabled
     * @returns {String}
     */
    get preventThreadCache() {
        return this.engineOpts.preventThreadCaching ? '?v=' + Date.now() : '';
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

    set engineOpts(opts) {
        this.#engineOpts = opts;
    }

    get engineOpts() {
        return this.#engineOpts;
    }
}