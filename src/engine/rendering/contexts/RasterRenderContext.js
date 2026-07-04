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
  COLOR: 'COLOR',
  WIDTH: 'WIDTH',
  FONT: 'FONT',
   
  // Transformation matrix Instructions (State Modifiers)
  TRANSFORM: 'TRANSFORM',
  PUSH: 'PUSH',
  POP: 'POP',
  
  // Rendering Instructions (primitives)
  POINT: 'POINT',       // "POINT X Y" would be a point at X, Y
  LINE: 'LINE',         // "LINE X1 Y1 X2 Y2" would be a line from (X1, Y1) to (X2, Y2)
  TEXT: 'TEXT',         // "TEXT X Y STRING" would be a string at (X, Y)

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