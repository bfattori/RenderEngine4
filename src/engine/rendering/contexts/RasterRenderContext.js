/**
 * RasterRenderContext - Renders raster-style graphics (sprites, tilemaps, etc.) using an intermediate language
 * Consumed by subclasses (Canvas, WebGL) for actual frame output
 * 
 * @extends RenderContext
 */
import RenderContext from './RenderContext.js';
import { IdentityMatrix, Matrix2d } from '../../core/Matrix.js';
import { RASTER_IL } from '../assemblers/RasterAssembler.js';

export default class RasterRenderContext extends RenderContext {
    constructor(renderer) {
        super(renderer);
        this.pushTransform(new Matrix2d(IdentityMatrix[0], IdentityMatrix[1], IdentityMatrix[2]));
    }
}