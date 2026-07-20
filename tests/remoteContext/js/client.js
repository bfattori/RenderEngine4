import RenderEngine from '../../../src/engine/renderEngine4.js';
import VectorRenderContext from '../../../src/engine/rendering/contexts/VectorRenderContext.js';
import CanvasRenderer from '../../../src/engine/rendering/renderers/CanvasRenderer.js';

import RemoteRenderContext from '../../../src/engine/rendering/remote/RemoteRenderContext.js';

// create a double-buffered canvas renderer
RenderEngine.init({
    flags: {
        debugMode: false
    },
    world: {
        renderContext: new RemoteRenderContext(
            new VectorRenderContext(
                CanvasRenderer.build(
                    document.getElementById("context"), 
                    true
                ),
                { enableCulling: false }
            )
        ),
        dimensions: [800, 600],
        viewport: [0, 0, 800, 600]
    }
});