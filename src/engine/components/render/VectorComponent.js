import Engine from '../../core/Engine.js';
import GameComponentError from '../GameComponent.js';
import RenderComponent from './RenderComponent.js';

export default class VectorComponent extends RenderComponent {
    constructor(priority, name) {
        super(priority, name = 'VectorComponent');
        this._instructions = [];
        this._render = {};

        // the compiled shape object (if supported by the render context)
        this._compiledShape = null;

        // redirect the renderer's calls from the context's render 
        // methods to this component with this shape being the context of
        // the function call
        this.context.render.forEach(fn => {
            this._render[fn.name] = (...args) => {
                this.context.render[fn.name].apply(this, ...args);
            }
        });
    }

    get render() {
        return this._render;
    }

    get instructions() {
        return [...this._instructions];
    }

    /**
     * Adds a rendering instruction to the shape.
     * @param {String} inst - Instruction from the render method 
     */
    addInstruction(inst) {
        this._instructions.push(inst);
    }

    /**
     * Reset the component's shape and compiled status.
     */
    reset() {
        this._instructions = [];
        this._compiled = null;
    }

    /**
     * Prepare the component, compiling it if the renderer supports it.
     */
    compile() {
        if (!this._compiledShape) {
            this._compiledShape = this.context.renderer.getCompiledShape(this.instructions);
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
        if (this._compiledShape !== null) {
            this._compiledShape.draw(time, deltaTime);
        } else {
            this.instructions.forEach(instruction => {
                this.context.renderer.render(instruction);
            });
        }
    }
}