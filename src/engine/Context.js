/**
 * Global context for the engine
 */
export default class Context {
    static #instance = null;
    #debug = true;
    #debugOpts = {};
    #engineOpts = {};
    #sparkMM = null;
    #performanceTrack = false;
    #allPragma = false;
    
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
        return this.#performanceTrack;
    }

    set trackPerformance(value) {
        this.#performanceTrack = value;
    }

    get pragmas() {
        return this.#allPragma;
    }

    set pragmas(val) {
        this.#allPragma = val;
    }

    set Spark(sparkMM) {
        this.#sparkMM = sparkMM;
    }

    get Spark() {
        return this.#sparkMM;
    }
}