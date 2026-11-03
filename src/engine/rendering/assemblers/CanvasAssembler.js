import Constants from '../../Constants.js';
import AssemblerError from './AssemblerError.js';
import Assembler from './Assembler.js';
import IL from './IntermediateLanguages.js';

export default class CanvasAssembler extends Assembler {
    constructor() {
        super();
    }

    /**
     * Get an instance of the `CanvasAssembler` class. This method should be called to 
     * obtain a single instance of the assembler.
     * @returns {CanvasAssembler} An instance of the `CanvasAssembler` class.
     * @static
     */
    static getInstance() {
        if (!Assembler.assemblerInstance) {
            Assembler.getInstance();
            Assembler.assemblerInstance = new CanvasAssembler();
        }
        return Assembler.assemblerInstance;
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
        const parts = instruction.split(' ');
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

        let pathInfo;
        let _instruction;

        switch (operand) {
            case IL.SYSTEXT:
                break;

            //-----------------------------------
            // State modifiers

            case IL.COLOR:
                return `surface.strokeStyle = "${args[0]}";`;
                break;
            case IL.FILL:
                return `surface.fillStyle = "${args[0]}";`;
                break;
            case IL.WIDTH:
                return `surface.lineWidth = ${args[0]};`;
                break;
            case IL.FONTSIZE:
                const current = args[0] / Constants.VECTOR_DEFAULTS.MAX_FONT_SIZE;
                const last = args[1] / Constants.VECTOR_DEFAULTS.MAX_FONT_SIZE;
                const delta = (current / last);
                // calculate a scaling factor for the delta
                return `this.surface.scale(${delta}, ${delta});`;
                break;

            //--------------------------------
            // Imperative Drawing

            case IL.POINT:
                if (args[3] === 1)
                    return `surface.arc(${parseInt(args[0])}, ${parseInt(args[1])}, ${args[2]}, 0, TwoPi); surface.fill();`;
                else {
                    const HALF_P = args[2] / 2;
                    return `surface.fillRect(${parseInt(args[0]) - HALF_P}, ${parseInt(args[1]) - HALF_P}, ${args[2]}, ${args[2]});`;
                }
                break;
            case IL.CURVE:
                pathInfo = { path: new Path2D(), fill: args[0], points: [[args[1], args[2]]], controls: [] };
                _instruction = operand === vector.CURVE ? `surface.moveTo(${args[1]}, ${args[2]});` : null;
            case IL.LINESEG:
                pathInfo = pathInfo || { path: new Path2D(), fill: args[0], points: [] };
                shapeContext.get('paths').push(pathInfo);
                renderer.pathId = shapeContext.get('paths').length - 1;
                return _instruction;
                break;
            case IL.ENDCURVE:
            case IL.ENDSEG:
                _instruction = '';
                if (shapeContext.get('paths')[renderer.pathId].fill === "1") {
                    _instruction = `surface.fill(shapeContext.get('paths')[${renderer.pathId}].path);`;
                } else {
                    _instruction = `surface.stroke(shapeContext.get('paths')[${renderer.pathId}].path);`;
                }
                renderer.pathId = null;
                return _instruction;
                break;
            case IL.LINE:
            case IL.LINEREL:
                if (renderer.pathId !== null) {
                    const pathInfo = shapeContext.get('paths')[renderer.pathId];
                    if (args.length === 4) {
                        pathInfo.points.push([args[0], args[1], args[2], args[3]]);
                        shapeContext.get('paths')[renderer.pathId].path.moveTo(args[0], args[1]);
                        shapeContext.get('paths')[renderer.pathId].path.lineTo(args[2], args[3]);
                    } else {
                        pathInfo.points.push([args[0], args[1]]);
                        shapeContext.get('paths')[renderer.pathId].path.lineTo(args[0], args[1]);
                    }
                    return null;
                } else if (args.length === 4) {
                    return `surface.moveTo(${args[0]}, ${args[1]});` +
                        `surface.lineTo(${args[2]}, ${args[3]});` +
                        'surface.stroke();';
                } else {
                    return `surface.moveTo(${args[0]}, ${args[1]});` +
                        'surface.stroke();';
                }
                break;
            case IL.QUAD:
            case IL.BEZIER:
                if (renderer.pathId !== null) {
                    const pathInfo = shapeContext.get('paths')[renderer.pathId];
                    if (args.length === 4) {
                        pathInfo.controls.push("q", [args[0], args[1], args[2], args[3]]);
                        shapeContext.get('paths')[renderer.pathId].path.quadraticCurveTo(args[0], args[1], args[2], args[3]);
                    } else {
                        pathInfo.controls.push("b", [args[0], args[1], args[2], args[3], args[4], arg[5]]);
                        shapeContext.get('paths')[renderer.pathId].path.bezierCurveTo(args[0], args[1], args[2], args[3], args[4], arg[5]);
                    }
                    return null;
                } else if (args.length === 4) {
                    return 'surface.quadraticCurveTo(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]})';
                } else {
                    return 'surface.bezierCurveTo(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]}, ${args[4]}, ${args[5]})';
                }
                break;
            case IL.ARC:
                return 'surface.beginPath();' +
                    `surface.ellipse(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]}, ${args[4]}, ${args[5]});` +
                    args[6] === 1 ? 'surface.fill();' : 'surface.stroke();';
                break;

            //-----------------------------
            // Complex types

            case IL.SHAPE:
                return `this.renderCompiledShape(${args[0]}, time, deltaTime);`;
                break;

            case IL.SPRITE:
            case IL.TILE:
            case IL.TILEMAP:
                return `this.renderSprite(${args[0]}, ${args[1]}, ${args[2]}, time, deltaTime);`;
                break;

            //--------------------------------------------
            // Transformations

            case IL.TRANSFORM:
                return `surface.transform(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]}, ${args[4]}, ${args[5]});`;
                break;
            case IL.ABS_TRANSFORM:
                return `surface.setTransform(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]}, ${args[4]}, ${args[5]});`;
                break;
            case IL.PUSH:
                _instruction = 'surface.save();';
                if (args.length === 6)
                    _instruction += ` surface.transform(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]}, ${args[4]}, ${args[5]});`
                return _instruction;
                break;    
            case IL.POP:
                return 'surface.restore();';
                break;
            case IL.XFORM_RESET:
                return `surface.resetTransform();`;
                break;
            case IL.MOVETO:
                return `surface.moveTo(${args[0]}, ${args[1]});`
                break;
            case IL.TRANSLATE:
                return `surface.translate(${args[0]}, ${args[1]});`;
                break;
            case IL.ROTATE:
                return `surface.rotate(${args[0]});`;
                break;
            case IL.SCALE:
            case IL.RSCALE:
                return `surface.scale(${args[0]}, ${args[1]});`;
                break;
            case IL.USCALE:
            case IL.RSCALEU:
                return `surface.scale(${args[0]}, ${args[0]});`;
                break;
            case IL.SKEW:
                return `surface.setTransform(surface.getTransform().skewXSelf(args[0]))`;
                break;

            default:
                throw new AssemblerError(this, `Unrecognized instruction: ${operand} w/(${args})`);
        }    
    }
}