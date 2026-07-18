import Constants from '../../Constants.js';
import { IdentityMatrix, ShearingMatrix } from '../../core/Matrix.js';
import { RendererError } from './Renderer.js';
import Renderer from './Renderer.js';
import Engine from '../../core/Engine.js';
import VectorAssembler from '../assemblers/Canvas/VectorAssembler.js';
import RasterAssembler from '../assemblers/Canvas/RasterAssembler.js';
import { VECTOR_IL, RASTER_IL } from '../assemblers/IntermediateLanguages.js';

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
            throw new RendererError(this, "CanvasRenderer must be built using CanvasRenderer.build()!");
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

    get assembler() {
        if (!super.assembler) {
            if (this.renderContext.constructor.name === 'VectorRenderContext') {
                super.assembler = VectorAssembler.instance;
            } else if (this.renderContext.constructor.name === 'RasterRenderContext') {
                super.assembler = RasterAssembler.instance;
            } else {
                throw new RenderEngineError("Unsupported render context type");
            }
        }

        return super.assembler;
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

        if (Engine.options.canvasDefaults) {
            // apply canvas default options
            for (const opt in Engine.options.canvasDefaults) {
                this.surface[opt] = Engine.options.canvasDefaults[opt];
            }
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

    compile() {

    }

    /**
     * Renders a compiled shape referenced by the opaque shape Id.
     * @param {number} opaqueId - The shape index to render
     * @param {number} time - The current world time
     * @param {number} deltaTime - The time past since the last frame
     */
    renderCompiledShape(opaqueId, time, deltaTime) {
        const drawShape = this.assembler.getCompiledShape(parseInt(opaqueId));
        if (drawShape) {
            drawShape.call(this, time, deltaTime);
        } else {
            console.warn(`No compiled shape found for opaqueId: ${opaqueId}`);
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
        this.#immediate(instruction, time, deltaTime);
    }
       
    /**
     * Renders the instruction to the surface as soon as it is received.
     * <b>Immediate Mode</b>
     * @param {String} instruction - The instruction to render 
     * @param {Number} time - The current time in seconds
     * @param {Number} deltaTime - The time elapsed since the last frame in seconds
     * @returns {void}
     */
    #immediate(instruction, time, deltaTime) {
        // render the drawing instruction
        let fillSeg = "0";
        const vector = VECTOR_IL;
        const parts = instruction.trim().split(' ');
        const {operand, args} = {operand: parts.shift(), args: parts};
        switch (operand) {
            case vector.TOGGLE:
                args[0] === 'BOLD' && (this.localFormat.set('b', !this.localFormat.get('b')));
                args[0] === 'ITALICS' && (this.localFormat.set('i', !this.localFormat.get('i')));
                args[0] === 'UNDERLINE' && (this.localFormat.set('u', !this.localFormat.get('u')));

                // Bold thickens the line width
                if (args[0] === 'BOLD' && this.localFormat.get('b')) {
                    this.surface.lineWidth = Constants.VECTOR_TEXT_BOLD;
                } else if (!this.localFormat.get('b')) {
                    this.surface.lineWidth = renderer.lineWidth;
                }

                // italics applies a shearing transform matrix
                if (args[0] === 'ITALICS' && this.localFormat.get('i')) {
                    return `this.surface.transform(${ShearingMatrix[0,0]}, ${ShearingMatrix[0,1]}, ${ShearingMatrix[1,0]}, ${ShearingMatrix[1,1]}, ${ShearingMatix[2,0]}, ${ShearingMatrix[2,1]});` +
                        'this.surface.save();';
                } else if (!this.localFormat.get('i')) {
                    // pop the shearing matrix off the internal state stack
                    return 'this.surface.restore();';
                }

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
                this.surface.transform(args[0], args[1], args[2], args[3], args[4], args[5]);
                break;
            case vector.ABS_TRANSFORM:
                this.surface.setTransform(args[0], args[1], args[2], args[3], args[4], args[5]);
                break;
            case vector.PUSH:
                this.surface.save();
                this.surface.setTransform(args[0], args[1], args[2], args[3], args[4], args[5]);
                break;
            case vector.POP:
                this.surface.restore();
                break;
            case vector.XFORM_RESET:
                this.surface.resetTransform();
                break;
            case vector.POINT:
                this.surface.rect(args[0], args[1], 2, 2);
                this.surface.fill();
                break;
            case vector.CURVE:
                this.path = new Path2D;
                this.path.moveTo(args[1], args[2]);
            case vector.LINESEG:
                fillSeg = args[0];
                break;
            case vector.ENDCURVE:
            case vector.ENDSEG:
                if (fillSeg === "1") {
                    this.surface.fill(this.path);
                } else {
                    this.surface.stroke(this.path);
                }
                fillSeg = "0"; // Reset fill to false after drawing the path
                this.path = null;
                break;
            case vector.LINE:
            case vector.LINEREL:
                if (this.path) {
                    if (args.length === 4) {
                        this.path.moveTo(args[0], args[1]);
                        this.path.lineTo(args[2], args[3]);
                    } else {
                        this.path.lineTo(args[0], args[1]);
                    }
                } else if (args.length === 4) {
                    this.surface.beginPath();
                    this.surface.moveTo(args[0], args[1]);
                    this.surface.lineTo(args[2], args[3]);
                    this.surface.stroke();
                } else {
                    this.surface.lineTo(args[0], args[1]);
                    this.surface.stroke();
                }
                break;
            case vector.QUAD:
            case vector.BEZIER:
                if (this.path) {
                    if (args.length === 4) {
                        this.path.quadraticCurveTo(args[0], args[1], args[2], args[3]);
                    } else {
                        this.path.bezierCurveTo(args[0], args[1], args[2], args[3], args[4], args[5]);
                    }
                } else {
                    throw new RendererError(this, 'Cannot draw a curve without a path!');
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
            case vector.SHAPE:
                this.renderCompiledShape(args[0], time, deltaTime);
                break;
            case vector.TRANSLATE:
                this.surface.translate(args[0], args[1]);
                break;
            case vector.ROTATE:
                this.surface.rotate(args[0]);
                break;
            case vector.SCALE:
                this.surface.scale(args[0], args[1]);
                break;
            case vector.USCALE:
                this.surface.scale(args[0], args[0]);
                break;
            case vector.SKEW:
                this.surface.setTransform(this.surface.getTransform().skewXSelf(args[0]));
                break;
            case vector.FONTSIZE:
                const current = args[0] / Constants.VECTOR_DEFAULTS.MAX_FONT_SIZE;
                const last = args[1] / Constants.VECTOR_DEFAULTS.MAX_FONT_SIZE;
                const delta = current / last;
                // calculate a scaling factor for the delta
                this.surface.scale(delta, delta);
                break;

            // eat these in immediate mode
            case '//':
                break;

            // UNRECOGNIZED
            default:
                throw new RendererError(this, `Unrecognized instruction: ${operand} w/(${args})`);
        }
    }

    destroy() {
        this.#blit = null;
        this.#htmlElement = null;
        this.#canvas = null;
        this.#offscreen = null;
        this.#localFormat = null;
        super.destroy();
    }
}