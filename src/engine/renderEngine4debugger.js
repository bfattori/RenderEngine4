import Console from './core/Console.js';

export default class RenderEngine4Debugger {
    constructor(engine) {
        this.instrument(engine);
    }
    
    instrument(clazz) {
        if (clazz.__instrumented) return;

        // instrument class for debugging
        
    }

    debug(object, ...args) {
        if (!object.constructor.__instrumented) return;

        // call the instrumented debug operation
        return object.__debug(...args);
    }
};