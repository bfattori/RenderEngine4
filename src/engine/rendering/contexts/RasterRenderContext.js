
// Intermediate Language instruction types for vector rendering
const RASTER_IL = {
  // Decorator Instructions (State Modifiers)
  COLOR: 'COLOR',
  WIDTH: 'WIDTH',
  FONT: 'FONT',
   
  // Transformation matrix Instructions (State Modifiers)
  TRANSFORM: 'TRANSFORM',
  PUSH: 'PUSH',
  POP: 'POP',
  
  // Rendering Instructions (primitives)
  POINT: 'POINT',
  LINE: 'LINE',
  TEXT: 'TEXT',

  // Rendering Instructions (complex)
  SPRITE: 'SPRITE',
  TILE: 'TILE',
  TILEMAP: 'TILEMAP'
};