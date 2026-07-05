import Console from '../../core/Console.js';
import Constants from '../../Constants.js';
import { IdentityMatrix, ShearingMatrix } from '../../core/Matrix.js';
import RenderEngineError from '../../core/RenderEngineError.js';
import Renderer from './Renderer.js';
import Engine from '../../core/Engine.js';

const POINT_SIZE = 4;
const HALF_P = Math.floor(POINT_SIZE * 0.5);

let built = false;
export default class CanvasRenderer extends Renderer {
        #buffered = false;
        #blit = null;
        #htmlElement = null;
        #canvas = null;
        #offscreen = null;
            
        #localFormat = new Map();


    constructor(htmlElement, buffered) {
        super();
        if (!built) {
            throw new RenderEngineError("CanvasRenderer must be built using CanvasRenderer.build()!");
        }
        built = false;
        this.#buffered = buffered;
        this.#htmlElement = htmlElement;

        // Let the context know the renderer can compile shapes
        this.hasCompiler = true;
        this.#localFormat.set('b', false);
        this.#localFormat.set('i', false);
        this.#localFormat.set('u', false);
    }

    get isDoubleBuffered() {
        return this.#buffered;
    }

    get blitter() {
        return this.#blit;
    }

    /**
     * Build a new instance of the CanvasRenderer.
     * 
     * @param {HTMLElement} htmlElement - The element that represents host the <code>Canvas</code> element.
     * @param {boolean} buffered - If true, the renderer will use a double-buffered canvas for rendering.
     * @returns {CanvasRenderer} - The initialized CanvasRenderer instance.
     */
    static build(htmlElement, buffered) {
        built = true;
        return new CanvasRenderer(htmlElement, buffered);
    }

     /**
     * Initialize the <code>CanvasRenderer</code>.
     * @param {RenderContext} context - The <code>RenderContext</code> that is connected to the renderer.
     */
    init(context) {
        super.init(context);
        this.#canvas = document.createElement("canvas");
        this.#canvas.width = context.viewport.width;
        this.#canvas.height = context.viewport.height;
        this.#htmlElement.appendChild(this.#canvas);

        if (this.#buffered) {
            // double-buffered
            this.#offscreen = new OffscreenCanvas(context.viewport.width, context.viewport.height);
            this.surface = this.#offscreen.getContext("2d");

            // the blitter target is the bitmap renderer of the visible context
            this.#blit = this.#canvas.getContext("bitmaprenderer");
        } else {
            // single-buffered
            this.#canvas.getContext("2d");
            this.surface = this.#canvas.getContext("2d");
        }
    }

    /**
     * Clear the frame buffer before beginning any rendering
     */
    preFrame() {
        // clear the surface before rendering
        this.surface.clearRect(0, 0, this.renderContext.viewport.width, this.renderContext.viewport.height);
    }

    /**
     * After rendering, if buffered, swap offscreen to visible context.
     */
    postFrame() {
        if (this.#buffered) {
            // swap offscreen to visible context
            this.#blit.transferFromImageBitmap(this.#offscreen.transferToImageBitmap());
        }
    }

    /**
     * Compile a set of intermediate drawing instructions into a function that, when called, executes the
     * instructions to the canvas' surface. Further references are to the opaque id, deferring rendering into
     * the renderer's scope.
     * 
     * @param {String[]} instructions - The instructions to compile.
     * @returns {number} The opaque reference to the function that will render the shape.
     */
    compile(instructions) {
        if (super.compile(instructions) === Constants.COMPILATION_FAILED) {
            return Constants.COMPILATION_FAILED;
        }
        
        // generate the re-usable function
        const renderer = this;
        const shapeContext = new Map();
        shapeContext.set('paths', []);
        shapeContext.set('assembled', []);

        // assemble the instructions
        instructions.forEach(i => {
            i = i.trim();
            if (i.charAt(0) !== '/' && i.charAt(1) !== '/') {
                // ignore comments
                const assembled = renderer.assembler.assemble(renderer, i, shapeContext);
                if (assembled !== null) {
                    shapeContext.get('assembled').push(assembled);
                }
            }
        });
        
        // assemble the function with its drawing context
        const instructionSet = shapeContext.get('assembled').join("\n");

        // the function that will be executed each frame to render the shape.
        const shapeFn = Function("shapeContext", "time", "deltaTime", instructionSet);
        const opaqueId = this.nextShapeId;
        
        // the stored procedure captures the shape context and the shape function, 
        // and executes the shape function using the current engine time and delta time.
        const storedProcedure = function(time, deltaTime) {
            shapeFn.call(this, shapeContext, time, deltaTime);
        }

        // store the procedure that will run the instructions
        this.compiledShapes[opaqueId] = storedProcedure;
        return opaqueId;
    }

    /**
     * Renders a compiled shape referenced by the opaque shape Id.
     * @param {number} opaqueId - The shape index to render
     * @param {number} time - The current world time
     * @param {number} deltaTime - The time past since the last frame
     */
    renderCompiledShape(opaqueId, time, deltaTime) {
        const drawShape = this.compiledShapes[opaqueId];
        if (drawShape) {
            drawShape.call(this, time, deltaTime);
        } else {
            Console.warn(`No compiled shape found for opaqueId: ${opaqueId}`);
        }
    }

    /**
     * Renders the instruction to the surface as soon as it is received.
     * <b>Immediate Mode</b>
     * @param {String} instruction - The instruction to render 
     * @param {Number} time - The current time in seconds
     * @param {Number} deltaTime - The time elapsed since the last frame in seconds
     * @returns {void}
     */
    render(instruction, time, deltaTime) {
        if (this.assembler) {
            this.assembler.immediate(this, instruction, time, deltaTime);
        } else {
            throw new RenderEngineError("No assembler is associated with the CanvasRenderer!");
        }
    }   
}