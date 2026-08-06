import RenderEngineError from '../../core/RenderEngineError.js';
export default class ParticleWorkerError extends RenderEngineError {
    #worker;
    constructor(worker, message, error) {
        super(message, error);
        this.#worker = worker;
    }
    get worker() {
        return this.#worker;
    }
}
