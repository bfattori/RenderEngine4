import RenderEngineError from '../RenderEngineError.js';

export default class ThreadError extends RenderEngineError {
    #thread;
    constructor(thread, message, error) {
        super(message, error);
        this.#thread = thread;
    }
    get thread() {
        return this.#thread;
    }
}