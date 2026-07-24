// Intermediate Language instruction types for vector rendering
const VECTOR_IL = {
  // Decorator Instructions (State Modifiers)
  COLOR:          0x01, // "COLOR #ff0000" would be a red color
  FONTSIZE:       0x02, // "FONTSIZE 12" would be a font size of 12
  FILL:           0x03, // "FILL #ff0000" would be a red fill color
  WIDTH:          0x04, // "WIDTH 5" would be a line width of 5
   
  // Transformation matrix Instructions (State Modifiers)
  TRANSFORM:      0x05, // "TRANSFORM m00 m01 m10 m11 m02 m12" would be a transformation matrix
  ABS_TRANSFORM:  0x06, // "ABS_TRANSFORM m00 m01 m10 m11 m02 m12" would be a transformation matrix that replaces the current transform
  XFORM_RESET:    0x07, // "XFORM_RESET" will reset the transformation matrix to the identity matrix
  PUSH:           0x08, // "PUSH" will save the current renderer state
  POP:            0x09, // "POP" will restore the previous renderer state 

  // Atomic transform manipulation instructions
  TRANSLATE:      0x0a, // "TRANSLATE X Y" modifies the current transform by translating the current transform by X and Y
  ROTATE:         0x0b, // "ROTATE ANGLE" modifies the current transform by rotating the current transform by ANGLE degrees
  SCALE:          0x0c, // "SCALE X Y" modifies the current transform by scaling the current transform by X and Y
  USCALE:         0x0d, // "USCALE SCALAR" modifies the current transform by uniformly scaling the current transform by SCALAR
  SKEW:           0x0e, // "SKEW ANGLE X Y" modifies the current transform by skewing the current transform by ANGLE degrees along the X and Y axes

  // Rendering Instructions (Imperative)
  POINT:          0x0f, // "POINT X Y" will draw a point at X, Y
  LINESEG:        0x10, // "LINESEG FILLED" starts a line segment, FILLED is a boolean indicating whether the shape is filled or not
  ENDSEG:         0x11, // "ENDSEG" ends the current line segment
  CURVE:          0x12, // "CURVE FILLED" draws a cubic Bezier curve, FILLED is a boolean indicating whether the shape is filled or not
  ENDCURVE:       0x13, // "ENDCURVE" ends the current curve
  QUAD:           0x14, // "QUAD CX1 CY1 X Y" is a quadratric curve through the control point to the end point
  BEZIER:         0x15, // "BEZIER CX1 CY1 CX2 XY2 X Y" is a Bezier curve through the control points to the end point
  MOVETO:         0x16, // "MOVETO X Y" would move the start of the next draw operation at X, Y
  LINE:           0x17, // "LINE X1 Y1 X2 Y2" is a line from (X1, Y1) to (X2, Y2)
  LINEREL:        0x18, // "LINEREL DX DY" is a line from the last drawing position to (DX, DY)
  ARC:            0x19, // "ARC X Y X_RADIUS Y_RADIUS START_ANGLE END_ANGLE FILLED" draws an arc centered at (X, Y) with the given radii and angles, FILLED is a boolean indicating whether the shape is filled or not

  // Rendering Instructions (Complex)
  SHAPE:          0x1a, // "SHAPE ID" draws a compiled shape with the given shape Id
};

// Intermediate Language instruction types for raster rendering
const RASTER_IL = {
  // Decorator Instructions (State Modifiers)
  COLOR:          0x01, // "COLOR #ff0000" would be a red color
  WIDTH:          0x02, // "WIDTH 5" would be a line-width of 5
  FONT:           0x03, // "FONT FONTNAME FONTSIZE" would be a font with the given name and size
  STYLE:          0x04, // "STYLE BOLD ITALICS UNDERLINE" toggles the given styles on/off (BOLD = 1/0, ITALICS = 1/0, UNDERLINE = 1/0)
   
  // Transformation matrix Instructions (State Modifiers)
  TRANSFORM:      0x05, // "TRANSFORM m00 m01 m01 m11 m02 m21" would be a transformation matrix
  PUSH:           0x06, // "PUSH" will push the current transformation matrix onto the stack
  POP:            0x07, // "POP" will pop the current transformation matrix off the stack
  
  // Rendering Instructions (Imperative)
  POINT:          0x08, // "POINT X Y" would be a point at X, Y
  LINE:           0x09, // "LINE X1 Y1 X2 Y2" would be a line from (X1, Y1) to (X2, Y2)
  TEXT:           0x0a, // "TEXT X Y ALIGN STRING" would be STRING at (X, Y) with (X, Y) being the anchor point, and ALIGN being one of: "left", "center", "right"

  // Rendering Instructions (Complex)
  SPRITE:         0x0b, // "SPRITE 1 2 X Y" sprites have state, would be sprite 1, state 2, at X, Y
  TILE:           0x0c, // "TILE 1 X Y" tiles are just images, would be tile 1, at X, Y
  TILEMAP:        0x0d  // "TILEMAP 1 X Y" tilemaps are comprised of tiles, would be tilemap 1 at X, Y
};

// Export the itermediate language instructions
export {
  VECTOR_IL,
  RASTER_IL
}