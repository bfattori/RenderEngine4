import Assembler from './assemblers/Assembler.js';
import AssemblerError from './assemblers/AssemblerError.js';
import { IL, VECTOR_IL, RASTER_IL } from './assemblers/IntermediateLanguages.js';

import CanvasRasterAssembler from './assemblers/canvas/RasterAssembler.js';
import CanvasVectorAssembler from './assemblers/canvas/VectorAssembler.js';

import Camera from './cameras/Camera.js';

import RenderContext, { RenderContextError } from './contexts/RenderContext.js';
import RasterRenderContext from './contexts/RasterRenderContext.js';
import VectorRenderContext from './contexts/VectorRenderContext.js';

import rasterAPI from './contexts/api/RasterAPI.js';
import vectorAPI from './contexts/api/VectorAPI.js';

import Renderer, { RendererError } from './renderers/Renderer.js';
import CanvasRenderer from './renderers/CanvasRenderer.js';
import WebGLRenderer from './renderers/WebGLRenderer.js';

import CompiledShape from './shapes/CompiledShape.js';
import CompiledSprite from './shapes/CompiledSprite.js';

const il = {
    IL,
    VECTOR_IL,
    RASTER_IL
};

const assemblers = {
    Assembler,
    AssemblerError,
    CanvasRasterAssembler,
    CanvasVectorAssembler,

    // packages
    il
};

const cameras = {
    Camera
};

const apis = {
    // these are functions to retrieve an API linked to a context
    // bind the context to the API, e.g.
    // const API = rasterAPI.call(renderContext);
    rasterAPI,
    vectorAPI
}

const contexts = {
    RenderContext,
    RenderContextError,

    RasterRenderContext,
    VectorRenderContext,

    // packages
    apis
};

const renderers = {
    Renderer,
    RendererError,

    CanvasRenderer,
    WebGLRenderer
};

const shapes = {
    CompiledShape,
    CompiledSprite
};

export {
    assemblers,
    cameras,
    contexts,
    renderers,
    shapes
};