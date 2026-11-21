import RenderEngine from '../../../../src/engine/renderEngine4.js';
import CanvasRenderer from '../../../../src/engine/rendering/renderers/CanvasRenderer.js';

//--------------------------
// Load the game
//--------------------------
await RenderEngine.init(import.meta.url, { 
  thread: true,
  gamePath: './game.js',
  renderer: CanvasRenderer.build(document.getElementById("context"), {
    doubleBuffered: true,
    useCompiler: true
  })
});
