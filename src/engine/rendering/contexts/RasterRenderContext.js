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
  POINT: 'POINT',
  LINE: 'LINE',
  TEXT: 'TEXT',

  // Rendering Instructions (complex)
  SPRITE: 'SPRITE',
  TILE: 'TILE',
  TILEMAP: 'TILEMAP'
};

export default class RasterRenderContext extends RenderContext {
    constructor(renderer) {
        super(renderer);
        this.pushTransform(new Matrix2d(IdentityMatrix[0], IdentityMatrix[1], IdentityMatrix[2]));
    }
}