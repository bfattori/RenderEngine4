import RenderContext from '../../rendering/contexts/RenderContext.js';
import { VECTOR_IL } from '../../rendering/assemblers/IntermediateLanguages.js';
import Engine from '../../core/Engine.js';
import getAPI from '../../rendering/contexts/api/VectorAPI.js';

class DebugContext extends RenderContext {
    #api = null;
    
    get API() {
        return this.#api;
    }

    set API(api) {
        this.#api = api;
    }

    pushTransform(transformationMatrix = null) {
        this.addInstruction(`${VECTOR_IL.PUSH}`);
    }

    popTransform() {
        this.addInstruction(`${VECTOR_IL.POP}`);
    }

    peekTransform() {
        return null;
    }

    resetTransforms() {
    }
}

class DebugObjects {
    static #instance = null;
    #api = null;
    #ctx = null;
    #outputContext = null;
    #shapes = {};

    static getInstance(renderContext) {
        if (DebugObjects.#instance === null)
            DebugObjects.#instance = new DebugObjects(renderContext);

        return DebugObjects.#instance;
    }

    constructor(renderContext) {
        this.#outputContext = renderContext;
        this.#ctx = new DebugContext(renderContext);
        this.#ctx.API = getAPI.call(this.#ctx);
        this.#api = this.#ctx.API;
    }

    shape(name) {
        if (this.#shapes[name]) return this.#shapes[name];
        this.#shapes[name] = this.#outputContext.getCompiledShape(this.#ctx.renderingInstructions, name);
        this.#ctx.clearInstructionBuffer();
        return this.#shapes[name];
    }
    
    shapeExists(name) {
        return this.#shapes[name] != null;
    }

    get API() {
        return this.#api;
    }
}

export default {
    /**
     * Get the origin shape (red line up, blue line to the right)
     */
    get originShape() {
        const dbo = DebugObjects.getInstance(Engine.world.renderContext);
        if (dbo.shapeExists('origin')) return dbo.shape('origin');
            
        // generate the shape
        dbo.API
            .setColor('#ff0000')
            .setWidth(1)
            .line(0,0,0,-10)
            .setColor('#0000ff')
            .line(0,0,10,0);

        return dbo.shape('origin');
    }
}
