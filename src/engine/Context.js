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
    #verbosity = 2;         // log and debug
    
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

    /**
     * Enable debug in the engine. This not only enables logging, but also
     * enables the options in `debugOpts`.
     */
    set debug(state) {
        this.#debug = state;
    }

    /**
     * Set the debug options.
     * @param {Object} opts - The options object with properties for each option.
     */
    set debugOpts(opts) {
        this.#debugOpts = opts;
    }

    get debugOpts() {
        return this.#debugOpts;
    }

    /**
     * Set the level of debug output. A value of `0` disables debug
     * output. A value of `1` outputs on `log()`. A value of `2` adds
     * `debug()`, and a value of `3` adds `verbose()`. Use this to tune
     * the noise.
     * @param {number} verbosity - A number 
     */
    set debugVerbosity(verbosity) {
        this.#verbosity = Math.max(0, Math.min(3, verbosity));
    }

    get debugVerbosity() {
        return this.#verbosity;
    }

    /**
     * Set the engine options.
     * @param {Object} opts - The options object with properties for each option.
     */
    set engineOpts(opts) {
        this.#engineOpts = opts;
    }

    get engineOpts() {
        return this.#engineOpts;
    }

    get trackPerformance() {
        return this.#trackPerf;
    }

    /**
     * Set whether to track performance in the performance DevTool.
     * @param {boolean} state - A boolean indicating whether to track performance. 
     */
    set trackPerformance(state) {
        this.#trackPerf = state;
    }

    get pragmas() {
        return this.#allPragmas;
    }

    /**
     * Enable or disable PRAGMA debug points in the engine.
     * @param {boolean} state - A boolean indicating whether to enable PRAGMA debug points. 
     */
    set pragmas(state) {
        this.#allPragmas = state;
    }

    /**
     * Set the Spark memory manager for the engine.
     * @param {SparkMemoryManager} sparkMM - The Spark memory manager to use. 
     */
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