/**
 * Global context for the engine
 */
export default class Context {
    static #instance = null;
    #debugOpts = {};
    #engineOpts = {};
    #sparkMM = null;
    #debug = true;
    #trackPerf = false;
    #allPragmas = false;
    
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

    get trackPerformance() {
        return this.#trackPerf;
    }

    set trackPerformance(state) {
        this.#trackPerf = state;
    }

    get pragmas() {
        return this.#allPragmas;
    }

    set pragmas(state) {
        this.#allPragmas = state;
    }

    set Spark(sparkMM) {
        this.#sparkMM = sparkMM;
    }

    get Spark() {
        return this.#sparkMM;
    }

    getOpts() {
        return {
            debugOpts: this.debugOpts,
            engineOpts: this.engineOpts,
            trackPerformance: this.trackPerformance,
            pragmas: this.pragmas
        };
    }
}