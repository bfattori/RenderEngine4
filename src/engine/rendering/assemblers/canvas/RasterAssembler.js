import AssemblerError from '../AssemblerError.js';
import { RASTER_IL } from '../IntermediateLanguages.js'; 

export default class CanvasRasterAssembler {
    static #instance = null;

    static get instance() {
        if (!CanvasRasterAssembler.#instance) {
            CanvasRasterAssembler.#instance = new CanvasRasterAssembler();
        }
        return CanvasRasterAssembler.#instance;
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
        const raster = RASTER_IL;
        const parts = instruction.split(' ');
        const {operand, ...args} = {operand: parts.shift(), args: parts};
        const pid = renderer.pathId;
        switch (operand) {
            case raster.COLOR:
                return `this.surface.strokeStyle = "${args[0]}";`;
                break;
            case raster.WIDTH:
                return `this.surface.lineWidth = ${width};`;
                break;
            case raster.TRANSFORM:
                return `this.surface.transform(${args[0]}, ${args[3]}, ${args[1]}, ${args[4]}, ${args[2]}, ${args[5]});`;
                break;
            case raster.PUSH:
                return 'this.surface.save();';
                break;    
            case raster.POP:
                return 'this.surface.restore();';
                break;
            case raster.IDENTITY:
                return `this.surface.setTransform(${IdentityMatrix[0,0]}, ${IdentityMatrix[0,1]}, ${IdentityMatrix[1,0]}, ${IdentityMatrix[1,1]}, ${IdentityMatrix[2,0]}, ${IdentityMatrix[2,1]});`;
                break;
            case raster.POINT:
                return `this.surface.fillRect(${parseInt(args[0]) - HALF_P}, ${parseInt(args[1]) - HALF_P}, ${POINT_SIZE}, ${POINT_SIZE});`;
                break;
            case raster.LINE:
                return `this.surface.moveTo(${args[0]}, ${args[1]});` +
                    `this.surface.lineTo(${args[2]}, ${args[3]});` +
                    'this.surface.stroke();';
                break;
        }    
    }

    /**
     * Renders the instruction to the surface as soon as it is received.
     * <b>Immediate Mode</b>
     * @param {Renderer} renderer - The renderer to use for rendering
     * @param {String} instruction - The instruction to render 
     */
    #immediate(renderer, instruction) {
        // render the drawing instruction
        let fillSeg = "0";
        const raster = RASTER_IL;
        const parts = instruction.split(' ');
        const {operand, args} = {operand: parts.shift(), args: parts};
        switch (operand) {
            case raster.COLOR:
                renderer.surface.strokeStyle = args[0];
                break;
            case raster.WIDTH:
                renderer.surface.lineWidth = args[0];
                break;
            case raster.TRANSFORM:
                renderer.surface.setTransform(args[0], args[3], args[1], args[4], args[2], args[5]);
                break;
            case raster.PUSH:
                renderer.surface.save();
                break;
            case raster.POP:
                renderer.surface.restore();
                break;
            case raster.IDENTITY:
                renderer.surface.setTransform(IdentityMatrix[0,0], IdentityMatrix[0,1], IdentityMatrix[1,0], IdentityMatrix[1,1], IdentityMatrix[2,0], IdentityMatrix[2,1]);
                break;
            case raster.POINT:
                renderer.surface.rect(args[0], args[1], 2, 2);
                renderer.surface.fill();
                break;
            case raster.LINE:
                renderer.surface.beginPath();
                renderer.surface.moveTo(args[0], args[1]);
                renderer.surface.lineTo(args[2], args[3]);
                renderer.surface.stroke();
                break;
        }
    }
}