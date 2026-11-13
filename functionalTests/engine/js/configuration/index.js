import RenderEngine from '../../../../src/engine/renderEngine4.js';
import RenderContext from '../../../../src/engine/rendering/context/RenderContext.js';
import CanvasRenderer from '../../../../src/engine/rendering/renderers/CanvasRenderer.js';

//-----------------------------------------------
// The Engine's default options are located in 
// the "EngineConfig" class in the file 
// 
//   /src/core/config/Config.js
//
//----------------------------------------------

await RenderEngine.init(import.meta.url, {
  world: {
    
    //-----------------------------------------------
    // RenderContext's default options are located in 
    // the "RenderContextConfig" class in the file 
    //
    //   /src/rendering/context/ContextBase.js
    //
    //----------------------------------------------

    // Configure the RenderContext
    renderContext: new RenderContext(
      
      //-----------------------------------------------
      // CanvasRenderer's default options are located in 
      // the "CanvasConfig" class in the file 
      //
      //   /src/rendering/renderers/CanvasRenderer.js
      //
      //----------------------------------------------

      // Build the CanvasRenderer
      CanvasRenderer.build(document.getElementById("context"), { doubleBuffered: false })
    
    ),
    
    dimensions: {
      width: 320, 
      height: 240
    },

    viewport: {
      left: 0, 
      top: 0, 
      width: 320, 
      height: 240
    }
  },

  // The engine has several hooks that can be used to perform actions at different stages of the engine lifecycle. 
  hooks: {
    onInit: () => { 
      console.info("### Inspect the source, change parameters, see what it does."); 
    }
  }
});

const api = RenderEngine.renderContext.getAPI();

// basic vector text rendering    
api    
    .pushTransform()
    .translate(5, 100)
    .vecText("Open the Console\n(Press F12)", 
        {color: "black", lineWidth: 1})
    .popTransform();

// run a single frame
RE4.update(0, 0);
RE4.renderWorld();