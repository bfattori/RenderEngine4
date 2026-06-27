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
        this._renderer = renderer;
        this._instructions = [];
        this._drawContext = {};
        this._assembly = null;
    }

    /**
     * The index of the shape
     */
    get id() {
        return this._id;
    }

    get instructions() {
        return this._instructions;
    }

    get renderer() {
        return this._renderer;
    }

    set drawContext(relContext) {
        this._drawContext = relContext;
    }

    get compiled() {
        return this._compiled;
    }

    set compiled(assembly) {
        this._compiled = assembly;
    }

    compile() {
        this._assembly = this.renderer.compile(this.instructions);
    }

    /**
     * Remove the compiled shape from the cache.
     */
    destroy() {
        SHAPE_CACHE.splice(this._id, 1);
        this._renderer = null;
        this._id = null;
        this._instructions = null;
    }

    draw(time, deltaTime) {
        if (this._assembly !== null) {
            this._assembly(time, deltaTime);
        } else {
            this.instructions.forEach(inst => {
                this.renderer.render(inst);
            });
        }
    }
}