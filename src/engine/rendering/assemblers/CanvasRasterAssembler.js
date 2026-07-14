import AssemblerError from './AssemblerError.js';

// Intermediate Language instruction types for raster rendering
const RASTER_IL = {
  // Decorator Instructions (State Modifiers)
  COLOR: 'COLOR',       // "COLOR #ff0000" would be a red color
  WIDTH: 'WIDTH',       // "WIDTH 5" would be a line width of 5
  FONT: 'FONT',         // "FONT FONTNAME FONTSIZE" would be a font with the given name and size
  STYLE: 'STYLE',       // "STYLE BOLD ITALICS UNDERLINE" toggles the given styles on/off (BOLD = 1/0, ITALICS = 1/0, UNDERLINE = 1/0)
   
  // Transformation matrix Instructions (State Modifiers)
  TRANSFORM: 'TRANSFORM',   // "TRANSFORM m00 m01 m01 m11 m02 m21" would be a transformation matrix
  PUSH: 'PUSH',             // "PUSH" will push the current transformation matrix onto the stack
  POP: 'POP',               // "POP" will pop the current transformation matrix off the stack
  
  // Rendering Instructions (primitives)
  POINT: 'POINT',       // "POINT X Y" would be a point at X, Y
  LINE: 'LINE',         // "LINE X1 Y1 X2 Y2" would be a line from (X1, Y1) to (X2, Y2)
  TEXT: 'TEXT',         // "TEXT X Y ALIGN STRING" would be a string at (X, Y) with (X, Y) being the anchor point, and ALIGN being one of: "left", "center", "right"

  // Rendering Instructions (complex)
  SPRITE: 'SPRITE',     // Sprites have state: "SPRITE 1 2 X Y" would be sprite 1, state 2, at X, Y
  TILE: 'TILE',         // Tiles are just images: "TILE 1 X Y" would be tile 1, at X, Y
  TILEMAP: 'TILEMAP'    // Tilemaps are comprised of tiles: "TILEMAP 1 X Y" would be tilemap 1, at X, Y
};

export { RASTER_IL };

export default class CanvasRasterAssembler {

    /**
     * Assemble the instruction into a renderer-appropriate function call.
     * 
     * @param {Renderer} renderer - The renderer to use for rendering
     * @param {String} instruction - The instruction to assemble.
     * @param {Map} shapeContext - The context that contains state variables for a compilation 
     * @returns {String} The configured instruction to invoke in the renderer
     * @private
     */
    static assemble(renderer, instruction, shapeContext) {
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
    static immediate(renderer, instruction) {
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