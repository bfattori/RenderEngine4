import Console from '../../core/Console.js';
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
            
        #compiledShapes = new Map();

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
     * instructions to the canvas' viewport. This means that instructions are not sent for the
     * shape, and instead the object is rendered from a stored procedure.
     * 
     * @param {String[]} instructions - The instructions to compile.
     * @returns {Function} The compiled function, containing its drawing context.
     */
    compile(instructions) {
        super.compile(instructions);
        
        // generate the re-usable function
        const renderer = this;
        const shapeContext = new Map();
        shapeContext.set('paths', []);
        shapeContext.set('assembled', []);

        // assemble the instructions
        instructions.forEach(i => {
            if (i.charAt(0) !== '/' && i.charAt(1) !== '/') {
                // a comment
                shapeContext.get('assembled').push(i);
            } else {
                shapeContext.get('assembled').push(this.assembler.assemble(this, i, shapeContext));
            }
        });
        
        // assemble the function with its drawing context
        return function(time, deltaTime) {
            shapeContext.set('fn', Function("shapeContext", "time", "deltaTime", shapeContext.get('assembled').join("\n")));
            return shapeContext.get('fn').call(renderer, shapeContext, time, deltaTime);
        };
    }

    /**
     * Renders a compiled shape referenced by the opaque shape Id.
     * @param {number} opaqueId - The shape index to render
     * @param {number} time - The current world time
     * @param {number} deltaTime - The time past since the last frame
     */
    renderCompiledShape(opaqueId, time, deltaTime) {
        const drawShape = this.#compiledShapes[opaqueId];
        if (drawShape) {
            drawShape(time, deltaTime);
        } else {
            throw new RenderEngineError(`Shape '${opaqueId}' not found in cache!`);
        }
    }

    /**
     * Renders the instruction to the surface as soon as it is received.
     * <b>Immediate Mode</b>
     * @param {String} instruction - The instruction to render 
     */
    render(instruction) {
        if (this.assembler) {
            this.assembler.immediate(this, instruction);
        } else {
            throw new RenderEngineError("No assembler is associated with the CanvasRenderer!");
        }
    }   
}