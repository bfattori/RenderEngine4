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
            case vector.LINESEG:
                const pathInfo = { path: new Path2D(), fill: args[0], points: [] };
                shapeContext.get('paths').push(pathInfo);
                renderer.pathId = shapeContext.get('paths').length - 1;
                return null;
                break;
            case vector.ENDSEG:
                let instruction = '';
                if (shapeContext.get('paths')[renderer.pathId].fill === "1") {
                    instruction = `this.surface.fill(shapeContext.get('paths')[${renderer.pathId}].path);`;
                } else {
                    instruction = `this.surface.stroke(shapeContext.get('paths')[${renderer.pathId}].path);`;
                }
                renderer.pathId = null;
                return instruction;
                break;
            case vector.LINE:
                if (renderer.pathId !== null) {
                    const pathInfo = shapeContext.get('paths')[renderer.pathId];
                    pathInfo.points.push([args[0], args[1], args[2], args[3]]);
                    shapeContext.get('paths')[renderer.pathId].path.moveTo(args[0], args[1]);
                    shapeContext.get('paths')[renderer.pathId].path.lineTo(args[2], args[3]);
                    return null;
                } else {
                    return `this.surface.moveTo(${args[0]}, ${args[1]});` +
                        `this.surface.lineTo(${args[2]}, ${args[3]});` +
                        'this.surface.stroke();';
                }
                break;
            case vector.LINEREL:
                if (renderer.pathId !== null) {
                    const pathInfo = shapeContext.get('paths')[renderer.pathId];
                    pathInfo.points.push([args[0], args[1], args[2], args[3]]);
                    shapeContext.get('paths')[renderer.pathId].path.lineTo(args[0], args[1]);
                    return null;
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
            case vector.SHAPE:
                return `this.renderCompiledShape(${args[0]}, time, deltaTime);`;
                break;
            default:
                return `// Unrecognized instruction: ${instruction}`;
        }    
    }

    /**
     * Renders the instruction to the surface as soon as it is received.
     * <b>Immediate Mode</b>
     * @param {Renderer} renderer - The renderer to use for immediate rendering
     * @param {String} instruction - The instruction to render 
     * @param {Number} time - The current time in seconds
     * @param {Number} deltaTime - The time elapsed since the last frame in seconds
     * @returns {void}
     */
    static immediate(renderer, instruction, time, deltaTime) {
        // render the drawing instruction
        let fillSeg = "0";
        const vector = VECTOR_IL;
        const parts = instruction.split(' ');
        const {operand, args} = {operand: parts.shift(), args: parts};
        switch (operand) {
            case vector.TOGGLE:
                args[0] === 'BOLD' && (renderer.localFormat.set('b', !renderer.localFormat.get('b')));
                args[0] === 'ITALICS' && (renderer.localFormat.set('i', !renderer.localFormat.get('i')));
                args[0] === 'UNDERLINE' && (renderer.localFormat.set('u', !renderer.localFormat.get('u')));
                break;
            case vector.COLOR:
                renderer.surface.strokeStyle = args[0];
                break;
            case vector.FILL:
                renderer.surface.fillStyle = args[0];
                break;
            case vector.WIDTH:
                renderer.surface.lineWidth = args[0];
                break;
            case vector.TRANSFORM:
                renderer.surface.setTransform(args[0], args[1], args[2], args[3], args[4], args[5]);
                break;
            case vector.ABS_TRANSFORM:
                renderer.surface.setTransform(args[0], args[1], args[2], args[3], args[4], args[5]);
                break;
            case vector.PUSH:
                renderer.surface.save();
                break;
            case vector.POP:
                renderer.surface.restore();
                break;
            case vector.IDENTITY:
                renderer.surface.setTransform(args[0], args[1], args[2], args[3], args[4], args[5]);
                break;
            case vector.POINT:
                renderer.surface.rect(args[0], args[1], 2, 2);
                renderer.surface.fill();
                break;
            case vector.LINESEG:
                renderer.path = new Path2D;
                fillSeg = args[0];
                break;
            case vector.ENDSEG:
                if (fillSeg === "1") {
                    renderer.surface.fill(renderer.path);
                } else {
                    renderer.surface.stroke(renderer.path);
                }
                fillSeg = "0"; // Reset fill to false after drawing the path
                renderer.path = null;
                break;
            case vector.LINE:
                if (renderer.path) {
                    renderer.path.moveTo(args[0], args[1]);
                    renderer.path.lineTo(args[2], args[3]);
                } else {
                    renderer.surface.beginPath();
                    renderer.surface.moveTo(args[0], args[1]);
                    renderer.surface.lineTo(args[2], args[3]);
                    renderer.surface.stroke();
                }
                break;
            case vector.LINEREL:
                if (renderer.path) {
                    renderer.path.lineTo(args[0], args[1]);
                } else {
                    renderer.surface.lineTo(args[0], args[1]);
                    renderer.surface.stroke();
                }
                break;
            case vector.ARC:
                renderer.surface.beginPath();
                renderer.surface.ellipse(args[0], args[1], args[2], args[3], 0, args[4], args[5]);
                if (args[6] === "1") {
                    renderer.surface.fill();
                } else {
                    renderer.surface.stroke();
                }
                break;
            case vector.MOVETO:
                renderer.surface.moveTo(args[0], args[1]);
                break;
            case vector.SHAPE:
                renderer.renderCompiledShape(args[0], time, deltaTime);
                break;
        }
    }
}