import AssemblerError from './AssemblerError.js';

// Intermediate Language instruction types for vector rendering
const VECTOR_IL = {
  // Decorator Instructions (State Modifiers)
  COLOR: 'COLOR',         // "COLOR #ff0000" would be a red color
  FONTSIZE: 'FONTSIZE',   // "FONTSIZE 12" would be a font size of 12
  FILL: 'FILL',           // "FILL #ff0000" would be a red fill color
  WIDTH: 'WIDTH',         // "WIDTH 5" would be a line width of 5
  TOGGLE: 'TOGGLE',       // "TOGGLE BOLD" would toggle bold on/off
   
  // Transformation matrix Instructions (State Modifiers)
  MOVETO: 'MOVETO',               // "MOVETO X Y" would move the cursor to X, Y
  TRANSFORM: 'TRANSFORM',         // "TRANSFORM m00 m01 m10 m11 m02 m12" would be a transformation matrix
  ABS_TRANSFORM: 'ABS_TRANSFORM', // "ABS_TRANSFORM m00 m01 m10 m11 m02 m12" would be a transformation matrix that replaces the current transform
  PUSH: 'PUSH',                   // "PUSH" will save the current transformation matrix  
  POP: 'POP',                     // "POP" will restore the previous transformation matrix
  IDENTITY: 'IDENTITY',           // "IDENTITY" will reset the transformation matrix to the identity matrix
  
  // Rendering Instructions (Imperative)
  POINT: 'POINT',         // "POINT X Y" will draw a point at X, Y
  LINESEG: 'LINESEG',     // "LINESEG FILLED" starts a line segment, FILLED is a boolean indicating whether the shape is filled or not
  ENDSEG: 'ENDSEG',       // "ENDSEG" ends the current line segment
  CURVE: 'CURVE',         // "CURVE FILLED" draws a cubic Bezier curve, FILLED is a boolean indicating whether the shape is filled or not
  ENDCURVE: 'ENDCURVE',   // "ENDCURVE" ends the current curve
  QUAD: 'QUAD',           // "QUAD CX1 CY1 X Y" is a quadratric curve through the control point to the end point
  BEZIER: 'BEZIER',       // "BEZIER CX1 CY1 CX2 XY2 X Y" is a Bezier curve through the control points to the end point
  LINE: 'LINE',           // "LINE X1 Y1 X2 Y2" is a line from (X1, Y1) to (X2, Y2)
  LINEREL: 'LINEREL',     // "LINEREL DX DY" is a line from the last drawing position to (DX, DY)
  ARC: 'ARC',             // "ARC X Y X_RADIUS Y_RADIUS START_ANGLE END_ANGLE FILLED" draws an arc centered at (X, Y) with the given radii and angles, FILLED is a boolean indicating whether the shape is filled or not

  // Shapes
  SHAPE: 'SHAPE',         // "SHAPE ID" draws a compiled shape with the given shape Id
};

// Export the Vector itermediate language instructions
export {
  VECTOR_IL
}

export default class VectorAssembler {

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
        const vector = VECTOR_IL;
        const parts = instruction.split(' ');
        const {operand, args} = {operand: parts.shift(), args: parts};
        let pathInfo;
        let _instruction;

        switch (operand) {
            case vector.TOGGLE:
                args[0] === 'BOLD' && (renderer.localFormat.set('b', !renderer.localFormat.get('b')));
                args[0] === 'ITALICS' && (renderer.localFormat.set('i', !renderer.localFormat.get('i')));
                args[0] === 'UNDERLINE' && (renderer.localFormat.set('u', !renderer.localFormat.get('u')));

                // Bold thickens the line width
                if (args[0] === 'BOLD' && renderer.localFormat.get('b')) {
                    return `this.surface.lineWidth = ${ renderer.lineWidth * 3 };`;
                } else if (!renderer.localFormat.get('b')) {
                    return `this.surface.lineWidth = ${ renderer.lineWidth };`;
                }

                // italics applies a shearing transform matrix
                if (args[0] === 'ITALICS' && renderer.localFormat.get('i')) {
                    return `this.surface.transform(${ShearingMatrix[0,0]}, ${ShearingMatrix[0,1]}, ${ShearingMatrix[1,0]}, ${ShearingMatrix[1,1]}, ${ShearingMatix[2,0]}, ${ShearingMatrix[2,1]});` +
                        'this.surface.save();';
                } else if (!renderer.localFormat.get('i')) {
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
                return `this.surface.transform(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]}, ${args[4]}, ${args[5]});`;
                break;
            case vector.ABS_TRANSFORM:
                return `this.surface.setTransform(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]}, ${args[4]}, ${args[5]});`;
                break;
            case vector.PUSH:
                return 'this.surface.save();';
                break;    
            case vector.POP:
                return 'this.surface.restore();';
                break;
            case vector.IDENTITY:
                return `this.surface.resetTransform();`;
                break;
            case vector.POINT:
                return `this.surface.fillRect(${parseInt(args[0]) - HALF_P}, ${parseInt(args[1]) - HALF_P}, ${POINT_SIZE}, ${POINT_SIZE});`;
                break;
            case vector.CURVE:
                pathInfo = { path: new Path2D(), fill: args[0], points: [[args[1], args[2]]], controls: [] };
                _instruction = operand === vector.CURVE ? `this.surface.moveTo(${args[1]}, ${args[2]});` : null;
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
                    _instruction = `this.surface.fill(shapeContext.get('paths')[${renderer.pathId}].path);`;
                } else {
                    _instruction = `this.surface.stroke(shapeContext.get('paths')[${renderer.pathId}].path);`;
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
                    return `this.surface.moveTo(${args[0]}, ${args[1]});` +
                        `this.surface.lineTo(${args[2]}, ${args[3]});` +
                        'this.surface.stroke();';
                } else {
                    return `this.surface.moveTo(${args[0]}, ${args[1]});` +
                        'this.surface.stroke();';
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
                    return 'this.surface.quadraticCurveTo(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]})';
                } else {
                    return 'this.surface.bezierCurveTo(${args[0]}, ${args[1]}, ${args[2]}, ${args[3]}, ${args[4]}, ${args[5]})';
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
            case vector.SHAPE:
                return `this.renderCompiledShape(${args[0]}, time, deltaTime);`;
                break;
            default:
                throw new AssemblerError(this, `Unrecognized instruction: ${operand} w/(${args})`);
        }    
    }
}