import CompiledShape from '../shapes/CompiledShape.js';
import Constants from '../../Constants.js';
import RenderEngineError from '../../core/RenderEngineError.js';
import { RendererConfig } from '../../core/Config.js';

/**
 * Renderer error class for low-level rendering errors.
 * @param {Renderer} renderer - The renderer
 * @param {String} message - The error message
 * @param {Error} rootCause - Optional root cause Error instance
 * @extends RenderEngineError
 */
class RendererError extends RenderEngineError {
  constructor(renderer, message, rootCause) {
    super(message, rootCause);
    this.renderer = renderer;
  }
}

export {
    RendererError
};

export default class Renderer {
    static #built = false;

    #opts = null;
    #renderContext = null;
    #container = null;
    #surface = null;
    #hasCompiler = false;
    #assembler = null;

    constructor(options) {
        if (!Renderer.#built) {
            throw new RendererError(this, "Use Renderer.build() to construct a Renderer.");
        }
        Renderer.#built = false;
        this.#opts = options;
    }

    get config() {
        return this.#opts;
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

    /**
     * Get the associated assembler for this renderer.
     * @return 
     */
    get assembler() {
        return this.#assembler;
    }

    set assembler(assembler) {
        this.#assembler = assembler;
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

    set container(container) {
        this.#container = container;
    }

    get container() {
        return this.#container;
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

    /**
     * Satisfies the interface for a builder.
     */
    static build() {
        Renderer.#built = true;
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
     * Method to render a single instruction to the hardware context. Must be implmented by
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
     * Compile a set of render instructions into an assembly that is executed by the renderer. 
     * 
     * @param {String[]} instructions - A set of instructions to compile.
     * @returns {number} An opaque Id that references the compiled shape.
     * @private
     */
    compile(instructions, tag) {
        if (!this.#hasCompiler) { return Constants.COMPILATION.NOT_SUPPORTED; }
        return this.assembler.compileShape(instructions, tag);
    }

    /**
     * Render a compiled shape with the given opaque Id.
     * 
     * @param {number} opaqueId - The shape Id to render
     * @param {number} time - The current world time
     * @param {number} deltaTime - The time that has past since the last frame
     */
    renderCompiledShape(opaqueId, time, deltaTime) {
    }

    /**
     * Compiles the set of render instructions into an assembly that will be executed by the renderer. 
     * 
     * @param {String[]} instructions - The render instructions.
     * @param {String} tag - optional tag to apply to the assembly
     * @returns {number|null} An opaque Id to the compiled shape. A return of <code>null</code> means
     *                   the renderer does not support pre-compilation of renderable objects.
     */
    getCompiledShape(instructions, tag) {
        if (!this.#hasCompiler) { return Constants.COMPILATION.NOT_SUPPORTED; }
        return this.assembler.compileShape(this, instructions, tag);
    }

    /**
     * Destroy a previously compiled shape. Does not destroy a compiled shape directly
     * so it can be appropriately garbage collected.
     * @param {number} opaqueId Destroy the shape at the opque index.
     * @returns 
     */
    destroyCompiledShape(opaqueId) {
        if (!this.#hasCompiler) { return; }
        this.assembler.destroyShape(opaqueId);
    }

    destroy() {
        this.#assembler = null;
        this.#renderContext = null;
        this.#surface = null;
        super.destroy();
    }

    //-------------------------------
    // Properties
    //-------------------------------

    get properties() {
        return {
            RenderContext: this.renderContext,
            Assembler: this.assembler,

            surface: this.surface,
            hasCompiler: this.hasCompiler
        };
    }


      //-------------------------------
      // Serialization Methods
      //-------------------------------
      
      /**
       * Serializes a game component's properties into a plain object. Subclasses should override this to include specific properties.
       * 
       * @param {...string} ignoreKeys - Optional list of property keys to ignore during serialization
       * @returns {Object} Serialized representation of the component's properties, excluding any specified keys
       * @example
       * // In a subclass, you might implement serialize like this:
       * serialize() {
       *     return {
       *         ...super.serialize('temporaryState'), // Ignore 'temporaryState' from base properties
       *         customProperty: this.customProperty
       *     };
       * }
       */
      serialize(...ignoreKeys) {
          return Engine.engine.serialize.call(this, ['surface', 'assembler', 'path', ...ignoreKeys]);
      }
}