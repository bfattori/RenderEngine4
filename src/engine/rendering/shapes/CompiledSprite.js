import CompiledShape from './CompiledShape.js';

export default class CompiledSprite extends CompiledShape {
    #states = null;

    /**
     * Construct a compiled sprite 
     * @param {Renderer} renderer 
     * @param {Array<any>} instructions 
     * @param {StateTable} states 
     */
    constructor(renderer, instructions, states = null) {
        super(renderer, instructions);
        this.#states = states;
    }
    
}