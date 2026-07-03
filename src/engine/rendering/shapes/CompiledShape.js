/**
 * CompiledShapes are a product of the renderer and are used to execute renderable objects. 
 * They are created by the renderer when a set of render instructions is compiled and 
 * stored in the SHAPE_CACHE. 
 */
export default class CompiledShape {
    /**
     * Create a CompiledShape
     * 
     * @param {Renderer} renderer - The renderer that produced this shape.
     * @param {String[]} instructions - A set of instructions to compile 
     */
    constructor(renderer, instructions) {
        this.#renderer = renderer;
        this.#instructions = [];
        // the shape opaque Id from the renderer
        this.#assembly = null;
    }

    get instructions() {
        return this.#instructions;
    }

    get renderer() {
        return this.#renderer;
    }

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
            this.renderer.renderShape(this.#assembly, time, deltaTime);
        } else {
            this.instructions.forEach(inst => {
                this.renderer.render(inst);
            });
        }
    }
}