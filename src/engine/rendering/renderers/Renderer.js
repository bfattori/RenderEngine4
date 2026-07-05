import Console from '../../core/Console.js';
import CompiledShape from '../shapes/CompiledShape.js';
import Constants from '../../Constants.js';
import RenderEngineError from '../../core/RenderEngineError.js';
import VectorAssembler from '../assemblers/VectorAssembler.js';
import RasterAssembler from '../assemblers/RasterAssembler.js';

export default class Renderer {
    #renderContext = null;
    #surface = null;
    #hasCompiler = false;
    #compiledShapes = {};
    #opaqueShapeId = 100;
    #assembler = null;

    // when compiling shapes, this is the index to the path id 
    // currently being updated in tha shape's drawing context
    #pathId = null;
    #path = null;

    constructor() {
    }

    /**
     * Set the associated render context for the renderer.
     * @param {RenderContext} context - The render context to set for the renderer. 
     */
    set renderContext(context) {
        this.#renderContext = context;
    }

    /**
     * Get the associated render context for the renderer.
     * @returns {RenderContext} The render context associated with the renderer. 
     */
    get renderContext() {
        return this.#renderContext;
    }

    get assembler() {
        if (this.#assembler === null) {
            if (this.#renderContext.constructor.name === 'VectorRenderContext') {
                this.#assembler = VectorAssembler;
            } else if (this.#renderContext.constructor.name === 'RasterRenderContext') {
                this.#assembler = RasterAssembler;
            } else {
                throw new RenderEngineError("Unsupported render context type");
            }
        }

        return this.#assembler;
    }

    /**
     * Set the associated render surface for the renderer. The surface is the hardware 
     * context within the renderer that the images are rendered to.
     * @param {Object} renderSurface - The render surface to set for the renderer. 
     */
    set surface(renderSurface) {
        this.#surface = renderSurface;
    }

    /**
     * Get the associated render surface for the renderer. The surface is the hardware 
     * context within the renderer that the images are rendered to. 
     * @returns {Object} The render surface associated with the renderer. 
     */
    get surface() {
        return this.#surface;
    }

    /**
     * Set whether the renderer supports compiling. 
     * @param {Boolean} state - Whether the renderer has a compiler or not. 
     */
    set hasCompiler(state = true) {
        this.#hasCompiler = state; 
    }

    /**
     * Returns whether the renderer supports compiling.
     * @returns {Boolean} Whether the renderer has a compiler or not.
     */
    get hasCompiler() {
        return this.#hasCompiler;
    }

    set pathId(id) {
        this.#pathId = id;
    }

    get pathId() {
        return this.#pathId;
    }

    set path(path) {
        this.#path = path;
    }

    get path() {
        return this.#path;
    }

    get compiledShapes() {
        return this.#compiledShapes;
    }

    get nextShapeId() {
        return this.#opaqueShapeId++;
    }

    /**
     * Initialize this renderer.
     * @param {RenderContext} context 
     */
    init(context) {
        this.#renderContext = context;    
    }

    /**
     * Called before a frame is rendered.
     */
    preFrame() {}

    /**
     * Method to render a single frame to the hardware context. Must be implmented by
     * sub-classes. 
     * @param {string} instruction - The intermediate language instruction to render
     * @returns {void} 
     */
    render(instruction) {
        throw new RenderEngineError('render() must implemented by sub-classes!');
    }

    /**
     * Called after a frame is rendered.
     */
    postFrame() {}

    /**
     * The method to compile a set of render instructions into an assembly that is executed by the renderer.
     * Invocations of this method are used to build a compiled function that can be executed each frame to
     * reduce the number of instructions that must be executed each frame. 
     * 
     * @param {String[]} instructions - A set of instructions to compile.
     * @returns {number} An opaque Id that references the compiled shape.
     * @private
     */
    compile(instructions) {
        if (instructions.length === 0) {
           Console.warn('Compiling an empty shape!');
           return Constants.COMPILATION_FAILED;
        }
    }

    /**
     * Renders a compiled shape with the given opaque Id. Compiled shapes are fixed shaped that can be
     * rendered without having to pass an entire set of render instructions to generate the assembly at each frame. 
     * @param {number} opaqueId - The shape Id to render
     * @param {number} time - The current world time
     * @param {number} deltaTime - The time that has past since the last frame
     */
    renderCompiledShape(opaqueId, time, deltaTime) {
    }

    /**
     * Compile a set of render instructions into an assembly that will be executed by the renderer. Used with
     * <code>renderShape</code> to render a shape to the context without having to pass an entire set of
     * render instructions to generate the assembly at each frame. 
     * @param {String[]} instructions - The render instructions.
     * @returns {number|null} An opaque Id to the compiled shape. A return of <code>null</code> means
     *                   the renderer does not support pre-compilation of renderable objects.
     */
    getCompiledShape(instructions) {
        if (!this.#hasCompiler) { return Constants.COMPILATION_NOT_SUPPORTED; }
        return this.compile(instructions);
    }

    /**
     * Us this method to destroy previously compiled shapes. Do not destroy a compiled shape directly
     * so it can be appropriately garbage collected.
     * @param {number} opaqueId Destroy the shape at the opque index.
     * @returns 
     */
    destroyCompiledShape(opaqueId) {
        if (!this.#hasCompiler) { return; }
        this.#compiledShapes[opaqueId].destroy();
        delete this.#compiledShapes[opaqueId];
    }

}