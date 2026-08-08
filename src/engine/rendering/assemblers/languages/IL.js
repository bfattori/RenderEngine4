/**
 * The intermediate languages consist of the instructions that the renderers consume. Since each renderer performs its
 * operations in different ways, this allows a common language to be used when programming with any renderer. The `BASE_IL` forms
 * the basic instructions shared by the `VECTOR_IL` and `RASTER_IL`. This version of the intermediate languages lend themselves
 * to optimized network and thread transmission.
 * 
 * @module RenderContext/IntermediateLanguages
 */
const BASE_IL = {
  // Decorator Instructions (State Modifiers)
  COLOR:          0x01, // "COLOR #ff0000" would be a red color
  WIDTH:          0x02, // "WIDTH 5" would be a line-width of 5

  // Transformation matrix Instructions (State Modifiers)
  TRANSFORM:      0x03, // "TRANSFORM m00 m01 m10 m11 m02 m12" would be a transformation matrix
  ABS_TRANSFORM:  0x04, // "ABS_TRANSFORM m00 m01 m10 m11 m02 m12" would be a transformation matrix that replaces the current transform
  XFORM_RESET:    0x05, // "XFORM_RESET" will reset the transformation matrix to the identity matrix
  PUSH:           0x06, // "PUSH" will save the current renderer state
  POP:            0x07, // "POP" will restore the previous renderer state 

  // Atomic transform manipulation instructions
  TRANSLATE:      0x10, // "TRANSLATE X Y" modifies the current transform by translating the current transform by X and Y
  ROTATE:         0x11, // "ROTATE ANGLE" modifies the current transform by rotating the current transform by ANGLE degrees
  SCALE:          0x12, // "SCALE X Y" modifies the current transform by scaling the current transform by X and Y
  USCALE:         0x13, // "USCALE SCALAR" modifies the current transform by uniformly scaling the current transform by SCALAR
  SKEW:           0x14, // "SKEW ANGLE X Y" modifies the current transform by skewing the current transform by ANGLE degrees along the X and Y axes

  // Rendering Instructions (Imperative)
  POINT:          0x20, // "POINT X Y" will draw a point at X, Y
  LINE:           0x21  // "LINE X1 Y1 X2 Y2" will draw a line from X1, Y1 to X2, Y2
}

// language offsets
const VECTOR_OFFSET = 0x30;
const RASTER_OFFSET = 0x40;

// Intermediate Language instruction types for vector rendering
const VECTOR_IL = {
  ...BASE_IL,

  // Decorator Instructions (State Modifiers)
  FONTSIZE:       VECTOR_OFFSET, // "FONTSIZE 12" would be a font size of 12
  FILL:           VECTOR_OFFSET + 0x01, // "FILL #ff0000" would be a red fill color
   
  // Rendering Instructions (Imperative)
  LINESEG:        VECTOR_OFFSET + 0x02, // "LINESEG FILLED" starts a line segment, FILLED is a boolean indicating whether the shape is filled or not
  ENDSEG:         VECTOR_OFFSET + 0x03, // "ENDSEG" ends the current line segment
  CURVE:          VECTOR_OFFSET + 0x04, // "CURVE FILLED" draws a cubic Bezier curve, FILLED is a boolean indicating whether the shape is filled or not
  ENDCURVE:       VECTOR_OFFSET + 0x05, // "ENDCURVE" ends the current curve
  QUAD:           VECTOR_OFFSET + 0x06, // "QUAD CX1 CY1 X Y" is a quadratric curve through the control point to the end point
  BEZIER:         VECTOR_OFFSET + 0x07, // "BEZIER CX1 CY1 CX2 XY2 X Y" is a Bezier curve through the control points to the end point
  MOVETO:         VECTOR_OFFSET + 0x08, // "MOVETO X Y" would move the start of the next draw operation at X, Y
  LINEREL:        VECTOR_OFFSET + 0x09, // "LINEREL DX DY" is a line from the last drawing position to (DX, DY)
  ARC:            VECTOR_OFFSET + 0x0a, // "ARC X Y X_RADIUS Y_RADIUS START_ANGLE END_ANGLE FILLED" draws an arc centered at (X, Y) with the given radii and angles, FILLED is a boolean indicating whether the shape is filled or not

  // Rendering Instructions (Complex)
  SHAPE:          VECTOR_OFFSET + 0x0b  // "SHAPE ID" draws a compiled shape with the given shape Id
};

// Intermediate Language instruction types for raster rendering
const RASTER_IL = {
  // Decorator Instructions (State Modifiers)
  FONT:           RASTER_OFFSET,        // "FONT FONTNAME FONTSIZE" would be a font with the given name and size
  STYLE:          RASTER_OFFSET + 0x01, // "STYLE BOLD ITALICS UNDERLINE" toggles the given styles on/off (BOLD = 1/0, ITALICS = 1/0, UNDERLINE = 1/0)
  
  // Rendering Instructions (Imperative)
  TEXT:           RASTER_OFFSET + 0x02, // "TEXT X Y ALIGN STRING" would be STRING at (X, Y) with (X, Y) being the anchor point, and ALIGN being one of: "left", "center", "right"

  // Rendering Instructions (Complex)
  SPRITE:         RASTER_OFFSET + 0x03, // "SPRITE 1 2 X Y" sprites have state, would be sprite 1, state 2, at X, Y
  TILE:           RASTER_OFFSET + 0x04, // "TILE 1 X Y" tiles are just images, would be tile 1, at X, Y
  TILEMAP:        RASTER_OFFSET + 0x05  // "TILEMAP 1 X Y" tilemaps are comprised of tiles, would be tilemap 1 at X, Y
};

// This is only available with the numeric IL's
const IL = {
  ...VECTOR_IL,
  ...RASTER_IL
};

// Export the itermediate language instructions
export {
  IL,
  VECTOR_IL,
  RASTER_IL
}