import RenderEngine from '../../../src/engine/renderEngine4.js';
import RemoteRenderContext from '../../../src/engine/rendering/remote/RemoteRenderContext.js';
import CanvasRenderer from '../../../src/engine/rendering/renderers/CanvasRenderer.js';

export function connect(playerSlot, socketEndpoint) {
    new RemoteRenderContext(
        CanvasRenderer.build(
                document.getElementById("context"), 
                true
            ), playerSlot, socketEndpoint);
}

