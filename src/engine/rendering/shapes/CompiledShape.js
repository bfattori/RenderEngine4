/**
 * CompiledShapes are a product of the renderer and are used to execute renderable objects. 
 * They are created by the renderer when a set of render instructions is compiled and 
 * stored in the SHAPE_CACHE. 
 */
export default class CompiledShape {
    #renderer = null;
    #instructions = [];
    // the shape opaque Id from the renderer
    #assembly = null;

    /**
     * Create a CompiledShape
     * 
     * @param {Renderer} renderer - The renderer that produced this shape.
     * @param {String[]} instructions - (optional) A set of instructions to compile 
     */
    constructor(renderer, instructions) {
        this.#renderer = renderer;
        this.#instructions = instructions;
        this.compile();
    }

    /**
     * Get the language instructions that were used to compile this shape.
     */
    get instructions() {
        return this.#instructions;
    }

    /**
     * Get the renderer that produced this shape. The renderer is used to render the compiled
     */
    get renderer() {
        return this.#renderer;
    }

    /**
     * Get the assembly that was produced by the renderer when compiling this shape.
     * The assembly takes two parameters, the current time and the delta time since the last frame.
     * @returns {Function} - The assembly that was produced by the renderer
     */
    get assembly() {
        return this.#assembly;
    }

    /**
     * Compile
     */
    compile() {
        this.#assembly = this.renderer.compile(this.instructions);
    }

    /**
     * Allow a compiled shape to be garbage collected
     */
    destroy() {
        this.#renderer = null;
        this.#instructions = null;
        this.#assembly = null;
    }

    /**
     * Draw this shape to the renderer.
     * @param {number} time - The current world time in milliseconds 
     * @param {number} deltaTime - The last frame time in milliseconds
     */
    draw(time, deltaTime) {
        if (this.#assembly !== null) {
            this.renderer.renderCompiledShape(this.#assembly, time, deltaTime);
        } else {
            this.instructions.forEach(inst => {
                this.renderer.render(inst);
            });
        }
    }
}