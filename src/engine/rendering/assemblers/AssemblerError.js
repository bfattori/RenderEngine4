import RenderEngineError from '../../core/RenderEngineError.js';

export default class AssemblerError extends RenderEngineError {
    constructor(assembler, message, rootCause) {
        super(message, rootCause);
        this.assembler = assembler;
    }
} 