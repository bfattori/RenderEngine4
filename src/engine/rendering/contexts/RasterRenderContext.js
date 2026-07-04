/**
 * RasterRenderContext - Renders raster-style graphics (sprites, tilemaps, etc.) using an intermediate language
 * Consumed by subclasses (Canvas, WebGL) for actual frame output
 * 
 * @extends RenderContext
 */
import Console from '../../core/Console.js';
import RenderContext from './RenderContext.js';
import { IdentityMatrix, Matrix2d } from '../../core/Matrix.js';

// Intermediate Language instruction types for raster rendering
const RASTER_IL = {
  // Decorator Instructions (State Modifiers)
  COLOR: 'COLOR',       // "COLOR #ff0000" would be a red color
  WIDTH: 'WIDTH',       // "WIDTH 5" would be a line width of 5
  FONT: 'FONT',         // "FONT FONTNAME FONTSIZE" would be a font with the given name and size
   
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

export default class RasterRenderContext extends RenderContext {
    constructor(renderer) {
        super(renderer);
        this.pushTransform(new Matrix2d(IdentityMatrix[0], IdentityMatrix[1], IdentityMatrix[2]));
    }
}