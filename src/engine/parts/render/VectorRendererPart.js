import Constants from '../../Constants.js';
import Engine from '../../core/Engine.js';
import GameComponentError from '../ComponentPart.js';
import RenderPart from './RenderPart.js';
import { VECTOR_IL } from '../../rendering/assemblers/IntermediateLanguages.js';
import getAPI from '../../rendering/contexts/api/VectorAPI.js';

export default class VectorRendererPart extends RenderPart {
    #instructions = [];
    #api = null;
    // the compiled shape object (if supported by the render context)
    #compiledShape = null;
    #formatting = {
      bold: false,
      italics: false,
      underline: false
    };
    
    constructor(priority = Constants.RENDER_PRIORITY, name = 'VectorRenderer') {
        super(priority, name);

        // retrieve an API context
        this.#api = getAPI.call(this);
    }

    get instructions() {
        return [...this.#instructions];
    }

    get formatting() {
        return this.#formatting;
    }

    get letterSpacing() {
        return this.context.letterSpacing;
    }

    get API() {
        return this.#api;
    }

    get renderer() {
        return this.host.world.renderContext;
    }

    /**
     * Adds a rendering instruction to the shape.
     * @param {String} inst - Instruction from the render method 
     */
    addInstruction(inst) {
        this.#instructions.push(inst);
    }

    pushTransform(transform) {
        super.pushTransform(transform);
        this.addInstruction(`${VECTOR_IL.PUSH} ${transform ? transform.toCanvas() : ''}`);
    }

    popTransform() {
        const txfm = super.popTransform();
        this.addInstruction(`${VECTOR_IL.POP}`);
        return txfm;
    }

    resetTransforms() {
        super.resetTransforms();
        this.addInstruction(`${VECTOR_IL.XFORM_RESET}`);
    }

    setCursorPosition(x, y) {
        this.addInstruction(`${VECTOR_IL.TRANSLATE} ${x} ${y}`);
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
            this.#compiledShape = this.context.getCompiledShape(this.instructions, this.name);
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
            this.context.renderCompiledShape(this.#compiledShape);
        } else {
            this.instructions.forEach(instruction => {
                this.context.render(instruction);
            });
        }
    }

    destroy() {
        this.context.destroyCompiledShape(this.#compiledShape);
        super.destroy();
    }
}