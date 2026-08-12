/**
 * The intermediate languages consist of the instructions that renderers consume. Since each renderer performs its
 * operations in different ways, this allows a common language to be used when programming with any renderer. The `BASE_IL` forms
 * the basic instructions shared by the `VECTOR_IL` and `RASTER_IL`.
 * 
 * @module RenderContext/dIntermediateLanguages
 */
const BASE_IL = {
  // Decorator Instructions (State Modifiers)
  COLOR:          'COLOR',      // "COLOR #ff0000" would be a red color
  WIDTH:          'WIDTH',      // "WIDTH 5" would be a line width of 5
  FONTSIZE:       'FONTSIZE',   // "FONTSIZE 12" would be a font size of 12

  // Transformation matrix Instructions (State Modifiers)
  TRANSFORM:      'TRANSFORM',  // "TRANSFORM m00 m01 m10 m11 m02 m12" would be a transformation matrix
  ABS_TRANSFORM:  'ABS_TRANSFORM', // "ABS_TRANSFORM m00 m01 m10 m11 m02 m12" would be a transformation matrix that replaces the current transform
  XFORM_RESET:    'XFORM_RESET',  // "XFORM_RESET" will reset the transformation matrix to the identity matrix
  PUSH:           'PUSH',         // "PUSH" will save the current renderer state
  POP:            'POP',          // "POP" will restore the previous renderer state 

  // Atomic transform manipulation instructions
  TRANSLATE:      'TRANSLATE',    // "TRANSLATE X Y" modifies the current transform by translating the current transform by X and Y
  ROTATE:         'ROTATE',       // "ROTATE ANGLE" modifies the current transform by rotating the current transform by ANGLE degrees
  SCALE:          'SCALE',        // "SCALE X Y" modifies the current transform by scaling the current transform by X and Y
  USCALE:         'USCALE',       // "USCALE SCALAR" modifies the current transform by uniformly scaling the current transform by SCALAR
  SKEW:           'SKEW',         // "SKEW ANGLE X Y" modifies the current transform by skewing the current transform by ANGLE degrees along the X and Y axes

  // Rendering Instructions (Imperative)
  POINT:          'POINT',        // "POINT X Y SIZE=1" will draw a point at X, Y of SIZE radius
  LINE:           'LINE'          // "LINE X1 Y1 X2 Y2" is a line from (X1, Y1) to (X2, Y2)
};

// VECTOR: Intermediate Language instructions
const VECTOR_IL = {
  ...BASE_IL,

  // Decorator Instructions (State Modifiers)
  FILL:           'FILL',       // "FILL #ff0000" would be a red fill color

  // Rendering Instructions (Imperative)
  LINESEG:        'LINESEG',      // "LINESEG FILLED" starts a line segment, FILLED is a boolean indicating whether the shape is filled or not
  ENDSEG:         'ENDSEG',       // "ENDSEG" ends the current line segment
  CURVE:          'CURVE',        // "CURVE FILLED" draws a cubic Bezier curve, FILLED is a boolean indicating whether the shape is filled or not
  ENDCURVE:       'ENDCURVE',     // "ENDCURVE" ends the current curve
  QUAD:           'QUAD',         // "QUAD CX1 CY1 X Y" is a quadratric curve through the control point to the end point
  BEZIER:         'BEZIER',       // "BEZIER CX1 CY1 CX2 XY2 X Y" is a Bezier curve through the control points to the end point
  MOVETO:         'MOVETO',       // "MOVETO X Y" would move the start of the next draw operation at X, Y
  LINEREL:        'LINEREL',      // "LINEREL DX DY" is a line from the last drawing position to (DX, DY)
  ARC:            'ARC',          // "ARC X Y X_RADIUS Y_RADIUS START_ANGLE END_ANGLE FILLED" draws an arc centered at (X, Y) with the given radii and angles, FILLED is a boolean indicating whether the shape is filled or not

  // Rendering Instruction (Complex)
  SHAPE:          'SHAPE'         // "SHAPE ID" draws a compiled shape with the given shape Id
};

// Raster: Intermediate Language instructions
const RASTER_IL = {
  ...BASE_IL,

  // Decorator Instructions (State Modifiers)
  FONT:       'FONT',        // "FONT FONTNAME FONTSIZE" would be a font with the given name and size
  STYLE:      'STYLE',       // "STYLE BOLD ITALICS UNDERLINE" toggles the given styles on/off (BOLD = 1/0, ITALICS = 1/0, UNDERLINE = 1/0)
   
  // Rendering Instructions (Imperative)
  TEXT:       'TEXT',        // "TEXT X Y ALIGN STRING" would be a string at (X, Y) with (X, Y) being the anchor point, and ALIGN being one of: "left", "center", "right"

  // Rendering Instructions (Complex)
  SPRITE:     'SPRITE',      // Sprites have state: "SPRITE 1 2" would be sprite 1, state 2
  TILE:       'TILE',        // Tiles are just images: "TILE 1" would be tile 1
  TILEMAP:    'TILEMAP'      // Tilemaps are comprised of tiles: "TILEMAP 1" would be tilemap 1
};

const IL = {
  ...VECTOR_IL,
  ...RASTER_IL
};

// Export the itermediate language instructions
export {
  IL,
  VECTOR_IL,
  RASTER_IL
};