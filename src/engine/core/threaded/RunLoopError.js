import RenderEngineError from '../RenderEngineError.js';

export default class RunLoopError extends RenderEngineError {
    #thread;
    constructor(thread, message, error) {
        super(message, error);
        this.#thread = thread;
    }
    get thread() {
        return this.#thread;
    }
}