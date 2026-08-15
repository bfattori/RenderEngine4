import Constants from '../../Constants.js';
import Context from '../../Context.js';
import { IdentityMatrix } from '../../core/Matrix.js';
import { RendererError } from './Renderer.js';
import Renderer from './Renderer.js';
import Engine from '../../core/Engine.js';
import { CanvasConfig } from '../../core/Config.js';
import CanvasVectorAssembler from '../assemblers/Canvas/VectorAssembler.js';
import CanvasRasterAssembler from '../assemblers/Canvas/RasterAssembler.js';
import { IL as VECTOR_IL } from '../assemblers/IntermediateLanguages.js';

const ctx = Context.getInstance();

export default class CanvasRenderer extends Renderer {
    #blit = null;
    #htmlElement = null;
    #canvas = null;
    #offscreen = null;
    #localFormat = new Map();

    // immediate mode path identifiers
    #pathId = null;
    #path = null;

    constructor(htmlElement, options) {
        super(new CanvasConfig(options));
        
        if (!htmlElement) {
            throw new RendererError(this, "CanvasRenderer requires an HTML element to initialize!");
        }

        this.#htmlElement = htmlElement;

        // Let the context know the renderer can compile shapes
        this.hasCompiler = this.config.useCompiler;
        this.config.formatting.set('b', false);
        this.config.formatting.set('i', false);
        this.config.formatting.set('u', false);
    }

    get offscreen() {
        return this.#offscreen;
    }

    get isDoubleBuffered() {
        return this.config.doubleBuffered;
    }
    get isUseCompiler() {
        return this.config.useCompiler;
    }

    get blitter() {
        return this.#blit;
    }

    get assembler() {
        if (!super.assembler) {
            if (this.renderContext.constructor.name === 'VectorRenderContext') {
                super.assembler = CanvasVectorAssembler.getInstance();
            } else if (this.renderContext.constructor.name === 'RasterRenderContext') {
                super.assembler = CanvasRasterAssembler.getInstance();
            } else {
                throw new RenderEngineError("Unsupported render context type");
            }
        }

        return super.assembler;
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

    /**
     * Build a new instance of the CanvasRenderer.
     * 
     * @param {HTMLElement} htmlElement - The element that represents host the <code>Canvas</code> element.
     * @param {CanvasOptions} options - Canvas cofigurations options
     * @returns {CanvasRenderer} - The initialized CanvasRenderer instance.
     */
    static build(htmlElement, options) {
        Renderer.build();
        return new CanvasRenderer(htmlElement, options);
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

        if (ctx.debug) {
            this.#htmlElement.classList.add('debug');
        }

        if (this.config.doubleBuffered) {
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

        // apply canvas default options
        for (const opt in this.config.defaults) {
            this.surface[opt] = this.config.defaults[opt];
        }
    }

    /**
     * Clear the frame buffer before beginning any rendering
     */
    preFrame() {
        this.surface.clearRect(0, 0, this.renderContext.viewport.width, this.renderContext.viewport.height);
    }

    #particles(target) {
        if (!Engine.options.particleEngine.disabled && Engine.particleEngine.bitmap) {
            // draw particles to target
            this.surface.drawImage(Engine.particleEngine.bitmap, 0, 0);
        }        
    }

    /**
     * After rendering, if buffered, swap offscreen to visible context.
     */
    postFrame() {
        if (this.config.doubleBuffered) {
            // draw particles to offscreen framebuffer
            this.#particles();

            // swap offscreen to visible context
            this.#blit.transferFromImageBitmap(this.#offscreen.transferToImageBitmap());
        } else {
            // draw particles directly to screen
            this.#particles();
        }
    }

    /**
     * Compile a set of render instructions into an assembly that is executed by the renderer. 
     * 
     * @param {String[]} instructions - A set of instructions to compile.
     * @returns {number} An opaque Id that references the compiled shape.
     * @private
     */
    compile(instructions, tag) {
        if (!this.hasCompiler) { return Constants.COMPILATION.NOT_SUPPORTED; }
        return this.assembler.compileShape(this, instructions, tag);
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
        } else if (opaqueId !== "undefined") {
            console.warn(`No compiled shape found for opaqueId: ${opaqueId}`);
        }
    }
    
    /**
     * Destroy a previously compiled shape. Does not destroy a compiled shape directly
     * so it can be appropriately garbage collected.
     * @param {number} opaqueId Destroy the shape at the opque index.
     * @returns 
     */
    destroyCompiledShape(opaqueId) {
        if (!this.hasCompiler) { return; }
        this.assembler.destroyShape(opaqueId);
    }

    compileSprite(sprite, tag) {
        return this.assembler.compileSprite(sprite, tag);
    }

    destroySprite(opaqueId) {
        this.assembler.destroySprite(opaqueId);
    }

    renderSprite(opaqueId, x, y, time, deltaTime) {
        const sprite = this.assembler.getCompiledSprite(parseInt(opaqueId));
        if (sprite) {
            sprite.update(time, deltaTime);
            const frame = sprite.frameRect;
            this.surface.drawImage(sprite.sourceImage, frame[0], frame[1], frame[2], frame [3], x, y, frame[2], frame[3]);
        } else if (opaqueId !== "undefined") {
            console.warn(`No compiled sprite found for opaqueId: ${opaqueId}`);
        }
    }

    renderTile(opaqueId, x, y, time, deltaTime) {
        const tile = this.assembler.getCompiledTile(parseInt(opaqueId));
        if (tile) {
            const frame = tile.frameRect;
            this.surface.drawImage(tile.sourceImage, frame[0], frame[1], frame[2], frame [3], x, y, frame[2], frame[3]);
        } else if (opaqueId !== "undefined") {
            console.warn(`No compiled tile found for opaqueId: ${opaqueId}`);
        }
    }

    /**
     * Compiles the set of render instructions into an assembly that will be executed by the renderer. 
     * 
     * @param {String[]} instructions - The render instructions.
     * @param {String} tag - optional tag to apply to the assembly
     * @returns {number|null} An opaque Id to the compiled shape. A return of <code>null</code> means
     *                   the renderer does not support pre-compilation of renderable objects.
     */
    getCompiledSprite(sprite, tag) {
        return this.assembler.compileSprite(this, sprite, tag);
    }

    /**
     * Destroy a previously compiled shape. Does not destroy a compiled shape directly
     * so it can be appropriately garbage collected.
     * @param {number} opaqueId Destroy the shape at the opque index.
     * @returns 
     */
    destroyCompiledSprite(opaqueId) {
        this.assembler.destroySprite(opaqueId);
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
     * Renders the instruction to the surface immediately.
     * <b>Immediate Mode</b>
     * @param {String} instruction - The instruction to render 
     * @param {Number} time - The current time in seconds
     * @param {Number} deltaTime - The time elapsed since the last frame in seconds
     * @returns {void}
     */
    #immediate(instruction, time, deltaTime) {
        let fillSeg = 0;
        const vector = VECTOR_IL;
        const parts = instruction.trim().split(' ');
        const {operand, strArgs} = {operand: parts.shift(), strArgs: parts};
        // coerce args
        const args = strArgs ? strArgs.map(arg => {
                    if (arg === "true") return true;
                    if (arg === "false") return false;
                    if (!isNaN(arg)) {
                        if (Number.isInteger(arg))
                            return parseInt(arg);
                        else
                            return parseFloat(arg);
                    }
                    return arg;
                }) : [];
        
        switch (operand) {
            //-----------------------------------
            // State modifiers

            case vector.COLOR:
                this.surface.strokeStyle = args[0];
                break;
            case vector.FILL:
                this.surface.fillStyle = args[0];
                break;
            case vector.WIDTH:
                this.surface.lineWidth = args[0];
                break;
            case vector.FONTSIZE:
                const current = args[0] / Constants.VECTOR_DEFAULTS.MAX_FONT_SIZE;
                const last = args[1] / Constants.VECTOR_DEFAULTS.MAX_FONT_SIZE;
                const delta = (current / last);
                // calculate a scaling factor for the delta
                this.surface.scale(delta, delta);
                break;

            //--------------------------------
            // Imperative Drawing

            case vector.POINT:
                // this little hack propagates the stroke style to the fill style, ONLY for the raster renderer
                if (args[4] && args[4] === 1)
                    this.surface.fillStyle = this.surface.strokeStyle;
                
                if (args[3] === 1)
                    this.surface.arc(args[0], args[1], args[2], 0, Constants.TWO_PI);
                else {
                    this.surface.rect(args[0], args[1], args[2], args[2]);
                }
                this.surface.fill();
                break;
            case vector.LINESEG:
                this.path = new Path2D;
                fillSeg = args[0];
                break;
            case vector.CURVE:
                this.path = new Path2D;
                this.path.moveTo(args[1], args[2]);
                fillSeg = args[0];
                break;
            case vector.ENDCURVE:
            case vector.ENDSEG:
                if (fillSeg === 1) {
                    this.surface.fill(this.path);
                } else {
                    this.surface.stroke(this.path);
                }
                fillSeg = 0; // Reset fill to false after drawing the path
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
                if (args[6] === 1) {
                    this.surface.fill();
                } else {
                    this.surface.stroke();
                }
                break;

            //-----------------------------
            // Shape Drawing

            case vector.SHAPE:
                this.renderCompiledShape(args[0], time, deltaTime);
                break;

            case vector.SPRITE:
                this.renderSprite(args[0], args[1], args[2], time, deltaTime);
                break;

            case vector.TILE:
                this.renderSprite(args[0], args[1], args[2], time, deltaTime);
                break;

            case vector.TILEMAP:
                this.renderSprite(args[0], args[1], args[2], time, deltaTime);
                break;

            //--------------------------------------------
            // Transformations

            case vector.TRANSFORM:
                this.surface.transform(args[0], args[1], args[2], args[3], args[4], args[5]);
                break;
            case vector.ABS_TRANSFORM:
                this.surface.setTransform(args[0], args[1], args[2], args[3], args[4], args[5]);
                break;
            case vector.PUSH:
                this.surface.save();
                if (args.length === 6)
                    this.surface.setTransform(args[0], args[1], args[2], args[3], args[4], args[5]);
                break;
            case vector.POP:
                this.surface.restore();
                break;
            case vector.XFORM_RESET:
                this.surface.resetTransform();
                break;                
            case vector.MOVETO:
                this.surface.moveTo(args[0], args[1]);
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
        this.#path = null;
        super.destroy();
    }

    //-------------------------------
    // Properties
    //-------------------------------

    get properties() {
        return {
            config: this.config,
            doubleBuffered: this.isDoubleBuffered,
            useCompiler: this.isUseCompiler,

            blitter: this.blitter,
            _offscreenCanvas: this.#offscreen,
            _htmlElement: this.#htmlElement,
            _pathId: this.#pathId,
            _path: this.#path
        };
    }
    
}