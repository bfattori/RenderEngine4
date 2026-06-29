import Console from '../../core/Console.js';
import CompiledShape from '../shapes/CompiledShape.js';
import RenderEngineError from '../../core/RenderEngineError.js';

export default class Renderer {
    constructor() {
        this._renderContext = null;
        this._surface = null;
        this._hasCompiler = false;
        this._compiledShapes = {};
    }

    set renderContext(context) {
        this._renderContext = context;
    }

    get renderContext() {
        return this._renderContext;
    }

    set surface(renderSurface) {
        this._surface = renderSurface;
    }

    get surface() {
        return this._surface;
    }

    set hasCompiler(state = true) {
        this._hasCompiler = state; 
    }

    init(context) {
        this.renderContext = context;    
    }

    /**
     * Called before the frame is rendered
     */
    preFrame() {}

    render() {
        throw new RenderEngineError('render() must implemented by sub-classes!');
    }

    /**
     * Called after the frame is rendered
     */
    postFrame() {}

    compile() {
    }

    /**
     * Renders a compiled shape with the given index.
     * @param {number} shapeIdx - The shape index to render
     * @param {number} time - The current world time
     * @param {number} deltaTime - The time past since the last frame
     */
    renderShape(shapeIdx, time, deltaTime) {
    }

    /**
     * Compile a set of render instructions into an assembly that is executed by the renderer. 
     * @param {String[]} instructions - The render instructions.
     * @returns {number|null} An opaque Id to the compiled shape. A return of <code>null</code> means
     *                   the renderer does not support pre-compilation of renderable objects.
     */
    getCompiledShape(instructions) {
        if (!this._hasCompiler) { return null; }
        this._compiledShapes[this._shapeIdx] = new CompiledShape(this, instructions);
        return this._shapeIdx;
    }
}