import Console from '../../core/Console.js';
import { IdentityMatrix, ShearingMatrix } from '../../core/Matrix.js';
import { IL_INSTRUCTIONS as vector} from '../contexts/VectorRenderContext.js';
import RenderEngineError from '../../core/RenderEngineError.js';
import Renderer from './Renderer.js';
import Engine from '../../core/Engine.js';

const POINT_SIZE = 4;
const HALF_P = Math.floor(POINT_SIZE * 0.5);

export default class CanvasRenderer extends Renderer {
    constructor(htmlElement, buffered = false) {
        super();
        this._buffered = buffered;
        this._blit = null;
        this._htmlElement = htmlElement;
            
        // when compiling shapes, this is the index to the path id 
        // currently being updated in tha shape's drawing context
        this._pathId = null;

        // Let the context know the renderer can compile shapes
        this.hasCompiler = true;
    }

    static build(htmlElement, buffered) {
        return new CanvasRenderer(htmlElement, buffered);
    }

    init(context) {
        this.renderContext = context;
        this._canvas = document.createElement("canvas");
        this._canvas.width = context.getRenderArea().width;
        this._canvas.height = context.getRenderArea().height;
        this._htmlElement.appendChild(this._canvas);

        if (this._buffered) {
            this._offscreen = new OffscreenCanvas(context.getRenderArea().width, context.getRenderArea().height);
            this.surface = this._offscreen.getContext("2d");
            this._blit = this._canvas.getContext("bitmaprenderer");
        } else {
            this.surface = this._canvas.getContext("2d");
        }
    }

    /**
     * Clear the frame buffer before beginning any rendering
     */
    preFrame() {
        // clear the surface before rendering
        this.surface.clearRect(0, 0, this.renderContext.getRenderArea().width, this.renderContext.getRenderArea().height);
    }

    /**
     * After rendering, if buffered, swap offscreen to visible context.
     */
    postFrame() {
        if (this._buffered) {
            // swap offscreen to visible context
            this._blit.transferFromImageBitmap(this._offscreen.transferToImageBitmap());
        }
    }

    /**
     * Compile a set of drawing instructions into a function that, when called, executes the
     * instructions to the canvases viewport.
     * 
     * @param {String} instructions - The instructions to compile.
     * @returns {Function} The compiled function, containing its drawing context.
     */
    compile(instructions) {
        if (instructions.length === 0) {
           Console.warn('Cannot compile an empty shape!');
        }

        // generate the re-usable function
        const renderer = this;
        const assembled = [];
        const shapeContext = {
            paths: []
        };
        // assemble the instructions
        instructions.forEach(i => {
            if (i.charAt(0) !== '/' && i.charAt(1) !== '/') {
                // a comment
                assembled.push(i);
            } else {
                assembled.push(this._assemble(i, shapeContext));
            }
        });
        
        // assemble the function with its drawing context
        return function(time, deltaTime) {
            const fn = Function("shapeContext", "time", "deltaTime", assembled.join());
            return fn.call(renderer, shapeContext, time, deltaTime);
        };
    }

    /**
     * Assemble the instruction into a renderer-appropriate function call.
     * 
     * @param {String} instruction - The instruction to assemble.
     * @param {Object} shapeContext - The context that contains state variables for a compilation 
     * @returns {String} The configured instruction to invoke in the renderer
     */
    _assemble(instruction, shapeContext) {
        const parts = instruction.split(' ');
        const {operand, ...args} = {operand: parts.shift(), args: parts};
        const pid = this._pathId;
        switch (operand) {
            case vector.TOGGLE:
                args[0] === 'BOLD' && (this.formatTemp.bold != this.formatTemp.bold);
                args[0] === 'ITALICS' && (this.formatTemp.italics != this.formatTemp.italics);
                args[0] === 'UNDERLINE' && (this.formatTemp.underline != this.formatTemp.underline);
                
                // Bold thickens the line width
                if (args[0] === 'BOLD' && this.formatTemp.bold) {
                    return `this.surface.lineWidth = ${ this.renderContext.lineWidth * 3 };`;
                } else if (!this.formatTemp.bold) {
                    return `this.surface.lineWidth = ${ this.renderContext.lineWidth };`;
                }

                // italics applies a shearing transform matrix
                if (args[0] === 'ITALICS' && this.formatTemp.italics) {
                    return `this.surface.transform(${ShearingMatrix[0,0]}, ${ShearingMatrix[0,1]}, ${ShearingMatrix[1,0]}, ${ShearingMatrix[1,1]}, ${ShearingMatix[2,0]}, ${ShearingMatrix[2,1]});` +
                        'this.surface.save();';
                } else if (!this.formatTemp.italics) {
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
            case vector.IDENTITY:
                return `this.surface.setTransform(${IdentityMatrix[0,0]}, ${IdentityMatrix[0,1]}, ${IdentityMatrix[1,0]}, ${IdentityMatrix[1,1]}, ${IdentityMatrix[2,0]}, ${IdentityMatrix[2,1]});`;
                break;
            case vector.POINT:
                return `this.surface.fillRect(${parseInt(args[0]) - HALF_P}, ${parseInt(args[1]) - HALF_P}, ${POINT_SIZE}, ${POINT_SIZE});`;
                break;
            case vector.LINESEG:
                const pathInfo = { path: new Path2D(), fill: args[0] };
                shapeContext.paths.push(pathInfo);
                this._pathId = shapeContext.paths.length - 1;
                break;
            case vector.ENDSEG:
                this._pathId = null;
                if (shapeContext.paths[pid].fill) {
                    return `this.surface.fill(shapeContext.paths[${pid}].path);`;
                } else {
                    return `this.surface.stroke(shapeContext.paths[${pid}].path);`;
                }
                break;
            case vector.LINE:
                if (pid !== null) {
                    shapeContext.paths[pid].path.moveTo(args[0], args[1]);
                    shapeContext.paths[pid].path.lineTo(args[2], args[3]);
                } else {
                    return `this.surface.moveTo(${args[0]}, ${args[1]});` +
                        `this.surface.lineTo(${args[2]}, ${args[3]});` +
                        'this.surface.stroke();';
                }
                break;
            case vector.LINEREL:
                if (pid !== null) {
                    shapeContext.paths[pid].path.lineTo(args[0], args[1]);
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
                args[0] === 'BOLD' && (this._format.bold != this._format.bold);
                args[0] === 'ITALICS' && (this._format.italics != this._format.italics);
                args[0] === 'UNDERLINE' && (this._format.underline != this._format.underline);
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
            case vector.IDENTITY:
                this.surface.setTransform(IdentityMatrix[0,0], IdentityMatrix[0,1], IdentityMatrix[1,0], IdentityMatrix[1,1], IdentityMatrix[2,0], IdentityMatrix[2,1]);
                break;
            case vector.POINT:
                this.surface.rect(args[0], args[1], 2, 2);
                this.surface.fill();
                break;
            case vector.LINESEG:
                this._path = new Path2D;
                fillSeg = args[0];
                break;
            case vector.ENDSEG:
                if (fillSeg === "1") {
                    this.surface.fill(this._path);
                } else {
                    this.surface.stroke(this._path);
                }
                fillSeg = "0"; // Reset fill to false after drawing the path
                this._path = null;
                break;
            case vector.LINE:
                if (this._path) {
                    this._path.moveTo(args[0], args[1]);
                    this._path.lineTo(args[2], args[3]);
                } else {
                    this.surface.beginPath();
                    this.surface.moveTo(args[0], args[1]);
                    this.surface.lineTo(args[2], args[3]);
                    this.surface.stroke();
                }
                break;
            case vector.LINEREL:
                if (this._path) {
                    this._path.lineTo(args[0], args[1]);
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