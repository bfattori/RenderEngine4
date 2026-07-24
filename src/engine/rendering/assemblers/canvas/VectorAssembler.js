import Constants from '../../../Constants.js';
import AssemblerError from '../AssemblerError.js';
import { VECTOR_IL } from '../IntermediateLanguages.js';

const compiledShapes = new Map();
let opaqueShapeId = 100;

function nextShapeId() {
    return opaqueShapeId++;
}

export default class CanvasVectorAssembler {
    static #instance = null;
    
    static get instance() {
        if (!this.#instance) {
            CanvasVectorAssembler.#instance = new CanvasVectorAssembler();
        }
        return CanvasVectorAssembler.#instance;
    }


    getCompiledShape(opaqueId) {
        return compiledShapes.get(opaqueId);
    }

    destroyCompiledShape(opaqueId) {
        compiledShapes.delete(opaqueId);
    }

    getCompiledShapes() {
        return compiledShapes;
    }
    
    /**
     * Compile a set of intermediate drawing instructions into a function that, when called, executes the
     * instructions to the canvas' surface. Further references are to the opaque id, deferring rendering into
     * the renderer's scope.
     * 
     * @param {String[]} instructions - The instructions to compile.
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
            i = i.trim();
            if (i.charAt(0) !== '/' && i.charAt(1) !== '/') {
                // ignore comments
                const assembled = this.assemble(renderer, i, shapeContext);
                if (assembled !== null) {
                    shapeContext.get('assembled').push(assembled);
                }
            }
        });

        // assemble the function with its drawing context
        const functionBody = ['const surface = this.surface;']
            .concat(shapeContext.get('assembled')).join("\n");

        // the assmbled function
        const shapeFn = Function("shapeContext", "time", "deltaTime", functionBody);
        const opaqueId = nextShapeId();
        
        // wrap the function to capture: renderer, shapeContext, time, and deltaTime
        const storedProcedure = function procName(time, deltaTime) {
            shapeFn.call(renderer, shapeContext, time, deltaTime);
        }
        
        // allows identification of stored procedures
        if (tag !== null) {
            storedProcedure.tag = tag;
        }

        // store the procedure that will run the instructions
        compiledShapes.set(opaqueId, storedProcedure);
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
        const vector = VECTOR_IL;
        const parts = instruction.split(' ');
        const {operand, args} = {operand: parts.shift(), args: parts};
        let pathInfo;
        let _instruction;

        switch (operand) {
            //-----------------------------------
            // State modifiers

            case vector.COLOR:
                return `surface.strokeStyle = "${args[0]}";`;
                break;
            case vector.FILL:
                return `surface.fillStyle = "${args[0]}";`;
                break;
            case vector.WIDTH:
                return `surface.lineWidth = ${args[0]};`;
                break;
            case vector.FONTSIZE:
                const current = args[0] / Constants.VECTOR_DEFAULTS.MAX_FONT_SIZE;
                const last = args[1] / Constants.VECTOR_DEFAULTS.MAX_FONT_SIZE;
                const delta = (current / last);
                // calculate a scaling factor for the delta
                return `this.surface.scale(${delta}, ${delta});`;
                break;

            //--------------------------------
            // Imperative Drawing

            case vector.POINT:
                return `surface.fillRect(${parseInt(args[0]) - HALF_P}, ${parseInt(args[1]) - HALF_P}, ${POINT_SIZE}, ${POINT_SIZE});`;
                break;
            case vector.CURVE:
                pathInfo = { path: new Path2D(), fill: args[0], points: [[args[1], args[2]]], controls: [] };
                _instruction = operand === vector.CURVE ? `surface.moveTo(${args[1]}, ${args[2]});` : null;
            case vector.LINESEG:
                pathInfo = pathInfo || { path: new Path2D(), fill: args[0], points: [] };
                shapeContext.get('paths').push(pathInfo);
                renderer.pathId = shapeContext.get('paths').length - 1;
                return _instruction;
                break;
            case vector.ENDCURVE:
            case vector.ENDSEG:
                _instruction = '';
                if (shapeContext.get('paths')[renderer.pathId].fill === "1") {
                    _instruction = `surface.fill(shapeContext.get('paths')[${renderer.pathId}].path);`;
                } else {
                    _instruction = `surface.stroke(shapeContext.get('paths')[${renderer.pathId}].path);`;
                }
                renderer.pathId = null;
                return _instruction;
                break;
            case vector.LINE:
            case vector.LINEREL:
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
            case vector.QUAD:
            case vector.BEZIER:
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
            case vector.ARC:
                return 'surface.beginPath();' +
                    `surface.ellipse(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]}, ${args[4]}, ${args[5]});` +
                    args[6] === 1 ? 'surface.fill();' : 'surface.stroke();';
                break;

            //-----------------------------
            // Shape Drawing

            case vector.SHAPE:
                return `this.renderCompiledShape(${args[0]}, time, deltaTime);`;
                break;

            //--------------------------------------------
            // Transformations

            case vector.TRANSFORM:
                return `surface.transform(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]}, ${args[4]}, ${args[5]});`;
                break;
            case vector.ABS_TRANSFORM:
                return `surface.setTransform(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]}, ${args[4]}, ${args[5]});`;
                break;
            case vector.PUSH:
                _instruction = 'surface.save();';
                if (args.length === 6)
                    _instruction += ` surface.setTransform(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]}, ${args[4]}, ${args[5]});`
                return _instruction;
                break;    
            case vector.POP:
                return 'surface.restore();';
                break;
            case vector.XFORM_RESET:
                return `surface.resetTransform();`;
                break;
            case vector.MOVETO:
                return `surface.moveTo(${args[0]}, ${args[1]});`
                break;
            case vector.TRANSLATE:
                return `surface.translate(${args[0]}, ${args[1]});`;
                break;
            case vector.ROTATE:
                return `surface.rotate(${args[0]});`;
                break;
            case vector.SCALE:
                return `surface.scale(${args[0]}, ${args[1]});`;
                break;
            case vector.USCALE:
                return `surface.scale(${args[0]}, ${args[0]});`;
                break;
            case vector.SKEW:
                return `surface.setTransform(surface.getTransform().skewXSelf(args[0]))`;
                break;

            default:
                throw new AssemblerError(this, `Unrecognized instruction: ${operand} w/(${args})`);
        }    
    }
}