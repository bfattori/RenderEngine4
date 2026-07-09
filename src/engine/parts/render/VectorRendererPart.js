import Engine from '../../core/Engine.js';
import GameComponentError from '../ComponentPart.js';
import RenderPart from './RenderPart.js';

export default class VectorRendererPart extends RenderPart {
    #instructions = [];
    #api = {};
    // the compiled shape object (if supported by the render context)
    #compiledShape = null;
    #formatting = {
      bold: false,
      italics: false,
      underline: false
    };
    
    constructor(priority, name) {
        super(priority, name = 'VectorRenderer');

        // redirect the renderer's calls from the context's API 
        // methods to this component with this shape being the context of
        // the function call
        this.#api = Engine.renderContext.getAPI.call(this);
    }

    get API() {
        return this.#api;
    }

    get instructions() {
        return [...this.#instructions];
    }

    get formatting() {
        return this.#formatting;
    }

    /**
     * Adds a rendering instruction to the shape.
     * @param {String} inst - Instruction from the render method 
     */
    addInstruction(inst) {
        this.#instructions.push(inst);
    }

    /**
     * Reset the component's shape and compiled status.
     */
    reset() {
        this.#instructions = [];
        this.#compiledShape = null;
    }

    /**
     * Prepare the component, compiling it if the renderer supports it.
     */
    compile() {
        if (!this.#compiledShape) {
            this.#compiledShape = this.context.getCompiledShape(this.instructions);
        } else {
            throw new GameComponentError(this, 'Attempt recompile an already compiled shape!');
        }
    }

    /**
     * Draw the component to the renderer. If the component has a compiled shape, uses that
     * for speed. Otherwise it calls the rendering functions of the renderer.
     * @param {number} time 
     * @param {number} deltaTime 
     */
    draw(time, deltaTime) {
        if (this.#compiledShape !== null) {
            // TODO: This should trigger a draw in the Renderer
            this.context.renderCompiledShape(this.#compiledShape, time, deltaTime);
        } else {
            this.instructions.forEach(instruction => {
                this.context.render(instruction);
            });
        }
    }
}