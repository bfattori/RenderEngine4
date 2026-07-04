import Console from '../../core/Console.js';
import { IdentityMatrix, ShearingMatrix } from '../../core/Matrix.js';
import { VECTOR_IL as vector} from '../contexts/VectorRenderContext.js';
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
            
        // when compiling shapes, this is the index to the path id 
        // currently being updated in tha shape's drawing context
        #pathId = null;
        #path = null;

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
                shapeContext.get('assembled').push(this.#assemble(i, shapeContext));
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
     * Assemble the instruction into a renderer-appropriate function call.
     * 
     * @param {String} instruction - The instruction to assemble.
     * @param {Map} shapeContext - The context that contains state variables for a compilation 
     * @returns {String} The configured instruction to invoke in the renderer
     * @private
     */
    #assemble(instruction, shapeContext) {
        const parts = instruction.split(' ');
        const {operand, ...args} = {operand: parts.shift(), args: parts};
        const pid = this.#pathId;
        switch (operand) {
            case vector.TOGGLE:
                args[0] === 'BOLD' && (this.#localFormat.set('b', !this.#localFormat.get('b')));
                args[0] === 'ITALICS' && (this.#localFormat.set('i', !this.#localFormat.get('i')));
                args[0] === 'UNDERLINE' && (this.#localFormat.set('u', !this.#localFormat.get('u')));

                // Bold thickens the line width
                if (args[0] === 'BOLD' && this.#localFormat.get('b')) {
                    return `this.surface.lineWidth = ${ this.renderContext.lineWidth * 3 };`;
                } else if (!this.#localFormat.get('b')) {
                    return `this.surface.lineWidth = ${ this.renderContext.lineWidth };`;
                }

                // italics applies a shearing transform matrix
                if (args[0] === 'ITALICS' && this.#localFormat.get('i')) {
                    return `this.surface.transform(${ShearingMatrix[0,0]}, ${ShearingMatrix[0,1]}, ${ShearingMatrix[1,0]}, ${ShearingMatrix[1,1]}, ${ShearingMatix[2,0]}, ${ShearingMatrix[2,1]});` +
                        'this.surface.save();';
                } else if (!this.#localFormat.get('i')) {
                    // pop the shearing matrix off the internal state stack
                    return 'this.surface.restore();';
                }
                break;
            case vector.COLOR:
                return `this.surface.strokeStyle = "${args[0]}";`;
                break;
            case vector.FILL:
                return `this.surface.fillStyle = "${args[0]}";`;
                break;
            case vector.WIDTH:
                return `this.surface.lineWidth = ${width};`;
                break;
            case vector.TRANSFORM:
                return `this.surface.transform(${args[0]}, ${args[3]}, ${args[1]}, ${args[4]}, ${args[2]}, ${args[5]});`;
                break;
            case vector.ABS_TRANSFORM:
                return `this.surface.setTransform(${args[0]}, ${args[3]}, ${args[1]}, ${args[4]}, ${args[2]}, ${args[5]});`;
                break;
            case vector.PUSH:
                return 'this.surface.save();';
                break;    
            case vector.POP:
                return 'this.surface.restore();';
                break;
            case vector.IDENTITY:
                return `this.surface.setTransform(${IdentityMatrix[0,0]}, ${IdentityMatrix[0,1]}, ${IdentityMatrix[1,0]}, ${IdentityMatrix[1,1]}, ${IdentityMatrix[2,0]}, ${IdentityMatrix[2,1]});`;
                break;
            case vector.POINT:
                return `this.surface.fillRect(${parseInt(args[0]) - HALF_P}, ${parseInt(args[1]) - HALF_P}, ${POINT_SIZE}, ${POINT_SIZE});`;
                break;
            case vector.LINESEG:
                const pathInfo = { path: new Path2D(), fill: args[0] };
                shapeContext.get('paths').push(pathInfo);
                this.#pathId = shapeContext.get('paths').length - 1;
                break;
            case vector.ENDSEG:
                this.#pathId = null;
                if (shapeContext.get('paths')[pid].fill) {
                    return `this.surface.fill(shapeContext.paths[${pid}].path);`;
                } else {
                    return `this.surface.stroke(shapeContext.paths[${pid}].path);`;
                }
                break;
            case vector.LINE:
                if (pid !== null) {
                    shapeContext.get('paths')[pid].path.moveTo(args[0], args[1]);
                    shapeContext.get('paths')[pid].path.lineTo(args[2], args[3]);
                } else {
                    return `this.surface.moveTo(${args[0]}, ${args[1]});` +
                        `this.surface.lineTo(${args[2]}, ${args[3]});` +
                        'this.surface.stroke();';
                }
                break;
            case vector.LINEREL:
                if (pid !== null) {
                    shapeContext.get('paths')[pid].path.lineTo(args[0], args[1]);
                } else {
                    return `this.surface.moveTo(${args[0]}, ${args[1]});` +
                        'this.surface.stroke();';
                }
                break;
            case vector.ARC:
                return 'this.surface.beginPath();' +
                    `this.surface.ellipse(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]}, ${args[4]}, ${args[5]});` +
                    args[6] === 1 ? 'this.surface.fill();' : 'this.surface.stroke();';
                break;
            case vector.MOVETO:
                return `this.surface.moveTo(${args[0]}, ${args[1]});`
                break;
        }    
    }

    /**
     * Renders the instruction to the surface as soon as it is received.
     * <b>Immediate Mode</b>
     * @param {String} instruction - The instruction to render 
     */
    render(instruction) {
        // render the drawing instruction
        let fillSeg = "0";
        const parts = instruction.split(' ');
        const {operand, args} = {operand: parts.shift(), args: parts};
        switch (operand) {
            case vector.TOGGLE:
                args[0] === 'BOLD' && (this.#localFormat.set('b', !this.#localFormat.get('b')));
                args[0] === 'ITALICS' && (this.#localFormat.set('i', !this.#localFormat.get('i')));
                args[0] === 'UNDERLINE' && (this.#localFormat.set('u', !this.#localFormat.get('u')));
                break;
            case vector.COLOR:
                this.surface.strokeStyle = args[0];
                break;
            case vector.FILL:
                this.surface.fillStyle = args[0];
                break;
            case vector.WIDTH:
                this.surface.lineWidth = args[0];
                break;
            case vector.TRANSFORM:
                this.surface.setTransform(args[0], args[3], args[1], args[4], args[2], args[5]);
                break;
            case vector.ABS_TRANSFORM:
                this.surface.setTransform(args[0], args[3], args[1], args[4], args[2], args[5]);
                break;
            case vector.PUSH:
                this.surface.save();
                break;
            case vector.POP:
                this.surface.restore();
                break;
            case vector.IDENTITY:
                this.surface.setTransform(IdentityMatrix[0,0], IdentityMatrix[0,1], IdentityMatrix[1,0], IdentityMatrix[1,1], IdentityMatrix[2,0], IdentityMatrix[2,1]);
                break;
            case vector.POINT:
                this.surface.rect(args[0], args[1], 2, 2);
                this.surface.fill();
                break;
            case vector.LINESEG:
                this.#path = new Path2D;
                fillSeg = args[0];
                break;
            case vector.ENDSEG:
                if (fillSeg === "1") {
                    this.surface.fill(this.#path);
                } else {
                    this.surface.stroke(this.#path);
                }
                fillSeg = "0"; // Reset fill to false after drawing the path
                this.#path = null;
                break;
            case vector.LINE:
                if (this.#path) {
                    this.#path.moveTo(args[0], args[1]);
                    this.#path.lineTo(args[2], args[3]);
                } else {
                    this.surface.beginPath();
                    this.surface.moveTo(args[0], args[1]);
                    this.surface.lineTo(args[2], args[3]);
                    this.surface.stroke();
                }
                break;
            case vector.LINEREL:
                if (this.#path) {
                    this.#path.lineTo(args[0], args[1]);
                } else {
                    this.surface.lineTo(args[0], args[1]);
                    this.surface.stroke();
                }
                break;
            case vector.ARC:
                this.surface.beginPath();
                this.surface.ellipse(args[0], args[1], args[2], args[3], 0, args[4], args[5]);
                if (args[6] === "1") {
                    this.surface.fill();
                } else {
                    this.surface.stroke();
                }
                break;
            case vector.MOVETO:
                this.surface.moveTo(args[0], args[1]);
                break;
            case vector.FONTSIZE:
                if (args[0]) {
                    this.renderContext.fontSize += parseInt(args[0]);
                } else {
                    this.renderContext.popFontSize;
                }
                break;
        }
    }
}