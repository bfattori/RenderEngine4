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
      width: 520, 
      height: 110
    },

    viewport: {
      left: 0, 
      top: 0, 
      width: 520, 
      height: 110
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
    .translate(25, 60)
    .vecText("Open the DevTools (Press F12)", 
        {color: "black", lineWidth: 1})
    .popTransform();

// run a single frame
RE4.update(0, 0);
RE4.renderWorld();

// What's going on here...
DemoHelper.showInfo( 
  `<p>
  The <b>RenderEngine4</b> is a powerful game engine written entirely in JavaScript. It is designed to be easy to use and 
  understand, making it ideal for beginners as well as experienced developers. Its features include a built-in particle engine, 
  a scene graph, and a rendering pipeline. The engine is designed to be highly customizable, allowing developers to create their
  own game mechanics and visual effects.
  </p><p>
  The engine is built on the idea of composition, from within the codebase itself to the way the engine functions. Starting
  with the way the engine is configured, properties in the constructor become properties of the object instance automatically.
  </p><p>
  Take a look at the <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/core/config/Config.js', {className:'Config'})">Config</a> class and its sub-classes.
  <code>Config</code> uses the <a class='class-ref' href='#' onclick="DemoHelper.showCode('/src/engine/core/Util.js', {className: 'Util', scroll:3500})">Util.lombok()</a> method to generate 
  the getter and setter methods. This is a handy function used in a few places in the engine.
  </p>
`);
