// Intermediate Language instruction types for vector rendering
const VECTOR_IL = {
  // Decorator Instructions (State Modifiers)
  COLOR: 'COLOR',         // "COLOR #ff0000" would be a red color
  FONTSIZE: 'FONTSIZE',   // "FONTSIZE 12" would be a font size of 12
  FILL: 'FILL',           // "FILL #ff0000" would be a red fill color
  WIDTH: 'WIDTH',         // "WIDTH 5" would be a line width of 5
   
  // Transformation matrix Instructions (State Modifiers)
  TRANSFORM: 'TRANSFORM',         // "TRANSFORM m00 m01 m10 m11 m02 m12" would be a transformation matrix
  ABS_TRANSFORM: 'ABS_TRANSFORM', // "ABS_TRANSFORM m00 m01 m10 m11 m02 m12" would be a transformation matrix that replaces the current transform
  XFORM_RESET: 'XFORM_RESET',     // "XFORM_RESET" will reset the transformation matrix to the identity matrix
  PUSH: 'PUSH',                   // "PUSH" will save the current renderer state
  POP: 'POP',                     // "POP" will restore the previous renderer state 

  // Atomic transform manipulation instructions
  TRANSLATE: 'TRANSLATE',   // "TRANSLATE X Y" modifies the current transform by translating the current transform by X and Y
  ROTATE: 'ROTATE',         // "ROTATE ANGLE" modifies the current transform by rotating the current transform by ANGLE degrees
  SCALE: 'SCALE',           // "SCALE X Y" modifies the current transform by scaling the current transform by X and Y
  USCALE: 'USCALE',         // "USCALE SCALAR" modifies the current transform by uniformly scaling the current transform by SCALAR
  SKEW: 'SKEW',             // "SKEW ANGLE X Y" modifies the current transform by skewing the current transform by ANGLE degrees along the X and Y axes

  // Rendering Instructions (Imperative)
  POINT: 'POINT',         // "POINT X Y" will draw a point at X, Y
  LINESEG: 'LINESEG',     // "LINESEG FILLED" starts a line segment, FILLED is a boolean indicating whether the shape is filled or not
  ENDSEG: 'ENDSEG',       // "ENDSEG" ends the current line segment
  CURVE: 'CURVE',         // "CURVE FILLED" draws a cubic Bezier curve, FILLED is a boolean indicating whether the shape is filled or not
  ENDCURVE: 'ENDCURVE',   // "ENDCURVE" ends the current curve
  QUAD: 'QUAD',           // "QUAD CX1 CY1 X Y" is a quadratric curve through the control point to the end point
  BEZIER: 'BEZIER',       // "BEZIER CX1 CY1 CX2 XY2 X Y" is a Bezier curve through the control points to the end point
  MOVETO: 'MOVETO',       // "MOVETO X Y" would move the start of the next draw operation at X, Y
  LINE: 'LINE',           // "LINE X1 Y1 X2 Y2" is a line from (X1, Y1) to (X2, Y2)
  LINEREL: 'LINEREL',     // "LINEREL DX DY" is a line from the last drawing position to (DX, DY)
  ARC: 'ARC',             // "ARC X Y X_RADIUS Y_RADIUS START_ANGLE END_ANGLE FILLED" draws an arc centered at (X, Y) with the given radii and angles, FILLED is a boolean indicating whether the shape is filled or not

  // Shapes
  SHAPE: 'SHAPE',         // "SHAPE ID" draws a compiled shape with the given shape Id
};

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

// Export the itermediate language instructions
export {
  VECTOR_IL,
  RASTER_IL
}