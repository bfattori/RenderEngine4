import RenderEngineError from '../../core/RenderEngineError.js';
export default class OrchestratorError extends RenderEngineError {
    #thread;
    constructor(thread, message, error) {
        super(message, error);
        this.#thread = thread;
    }
    get thread() {
        return this.#thread;
    }
}
