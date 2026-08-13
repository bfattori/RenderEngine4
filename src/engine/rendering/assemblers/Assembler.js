import Context from '../../Context.js';
import Constants from '../../Constants.js';
import AssemblerError from './AssemblerError.js';

const ctx = Context.getInstance();

/**
 * Base class for all assemblers. This class provides common functionality such as managing compiled shapes
 * and opaque ids, as well as abstract methods that must be implemented by sub-classes.
 */
export default class Assembler {
    static #built = false;

    #compiledShapes = new Map();
    #compiledSprites = new Map();
    #compiledTiles = new Map();
    #compiledTileMaps = new Map();

    #opaqueShapeId = 100;

    constructor() {
        if (!Assembler.#built) throw new AssemblerError("Use the static getInstance() method to construct an Assembler");
        Assembler.built = false;
    }

    /**
     * Get an instance of the Assembler class. This method should be called to obtain a single instance of the assembler.
     * @returns {Assembler} An instance of the Assembler class.
     * @static 
     */
    static getInstance() {
        Assembler.#built = true;
    }

    //-------------------------------------------------
    // Shape handling

    /**
     * Get the next available shape id for a new shape.
     * @returns {number} The next available shape id.
     */
    get #nextShapeId() {
        return this.#opaqueShapeId++;
    }

    /**
     * Get the compiled shape for the given opaque Id.
     * @param {CompiledShape} opaqueId - The opaque Id of the shape
     * @returns 
     */
    getCompiledShape(opaqueId) {
        return this.#compiledShapes.get(opaqueId);
    }

    getCompiledSprite(opaqueId) {
        return this.#compiledSprites.get(opaqueId);
    }

    /**
     * Destroy the compiled shape for the given opaque Id.
     * @param {number} opaqueId - The opaque Id of the shape
     */
    destroyCompiledShape(opaqueId) {
        this.#compiledShapes.delete(opaqueId);
    }

    destroyCompiledSprite(opaqueId) {
        this.#compiledSprites.delete(opaqueId);
    }

    /**
     * Compile a set of intermediate instructions into a shape function, returning
     * the opaque reference Id. 
     * 
     * @param {String[]} instructions - Intermediate language instructions to compile
     * @returns {number} The opaque reference to the function that will render the shape.
     */
    compileShape(renderer, instructions, tag = null) {
        if (instructions.length === 0) {
           console.warn('Compiling an empty shape?');
           return Constants.COMPILATION.FAILED;
        }
        
        // generate the re-usable function
        const shapeContext = new Map();
        shapeContext.set('paths', []);
        shapeContext.set('assembled', []);

        // assemble the instructions
        instructions.forEach(i => {
            if (ctx.debug)
                i = i.trim();

            if (!ctx.debug || (i.charAt(0) !== '/' && i.charAt(1) !== '/')) {
                // ignore comments
                const assembled = this.assemble(renderer, i, shapeContext);
                if (assembled !== null) {
                    shapeContext.get('assembled').push(assembled);
                }
            }
        });

        // assemble the function with its drawing context
        const functionBody = ['const surface = this.surface; const TwoPi = Math.PI * 2;']
            .concat(shapeContext.get('assembled')).join("\n");

        // the assembled function
        const shapeFn = Function("shapeContext", "time", "deltaTime", functionBody);
        const opaqueId = this.#nextShapeId;
        
        // wrap the function to capture: renderer, shapeContext, time, and deltaTime
        const storedProcedure = function procName(time, deltaTime) {
            shapeFn.call(renderer, shapeContext, time, deltaTime);
        }
        
        // identify stored procedures
        if (tag !== null) {
            storedProcedure.tag = tag;
        }

        // store the procedure that will run the instructions
        this.#compiledShapes.set(opaqueId, storedProcedure);
        return opaqueId;
    }

    compileSprite(sprite, tag = null) {
        const opaqueId = this.#nextShapeId;
        
        // in the future, we might wrape this in a self-contained function
        
        // identify stored procedures
        // if (tag !== null) {
        //     storedProcedure.tag = tag;
        // }

        // store the procedure that will run the instructions
        this.#compiledSprites.set(opaqueId, sprite);
        return opaqueId;
    }


    /**
     * Assemble the instruction into a renderer-appropriate function call.
     * 
     * @param {Renderer} renderer - The renderer to use for rendering
     * @param {String} instruction - The instruction to assemble.
     * @param {Map} shapeContext - The context that contains state variables for a compilation 
     * @returns {String} The configured instruction to invoke in the renderer
     * @private
     */
    assemble(renderer, instruction, shapeContext) {
        throw new AssemblerError(this, 'Must be implemented by sub-classes!'); 
    }

    //-------------------------------
    // Properties
    //-------------------------------

    /**
     * Gets the properties of this component as an object. Subclasses should override this to include specific properties.
     * @returns {Object} An object containing the component's properties
     */
    get properties() {
        return {
            compiledShapes: this.#compiledShapes,
            compiledSprites: this.#compiledSprites
        };
    }
}
