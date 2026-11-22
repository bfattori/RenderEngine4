import RenderEngine from '../../../../src/engine/renderEngine4.js';

import RenderContext from '../../../../src/engine/rendering/context/RenderContext.js';
import Renderer from '../../../../src/engine/rendering/renderers/Renderer.js';
import Transform2dPart from '../../../../src/engine/parts/transform/Transform2dPart.js';
import CompiledRenderPart from '../../../../src/engine/parts/render/CompiledRenderPart.js';

import GameObject from '../../../../src/engine/gameobject/GameObject.js';

// create a double-buffered canvas renderer
await RenderEngine.init(import.meta.url, {
    flags: {
        debugMode: true,
        showFps: true,
        debugOpts: {
            objectOrigins: true
        }
    },
    world: {
        renderContext: new RenderContext(
            Renderer.stub(), { 
              enableCulling: false, 
              text: {
                  forceUpperCase: false
              }
            }
        ),
        dimensions: {width: 800, height: 600},
        viewport: {left: 0, top: 0, width: 800, height: 600}
    }
});

async function runGame() {
    // game object and component parts
    // - set world position, rotation, and scale
    const gameObject = new GameObject();
    gameObject
        .addComponentParts(
            new Transform2dPart("transform"), 
            new CompiledRenderPart("renderer"));

    // add the object to the world - before making any modifications to it
    RenderEngine.world.addObject(gameObject);

    // vector renderer draws out the word "Colorful"
    // capture the text sizing to set the origin
    let textBox = [0,0];
    const renderer = gameObject.PARTS.renderer;
    renderer.API
        .fontSize(20);

    await renderer.API.vecText("{#00f}C{#f00}o{#080}l{#ee0}o{#808}r{#088}f{#800}u{orange}l", {}, textBox);
    await renderer.compile();

    // set the origin at the center of the text
    //gameObject.origin = [textBox[0] / 2, textBox[1] / 2];

    const transform = gameObject.PARTS.transform;
    transform.position = [400, 300];

    // fires before each update of the object
    gameObject.onBeforeUpdate = (time, deltaTime) => {
        transform.rotation += 1;
    };

    RenderEngine.start();
}


const gameControl = {
    //--------------------------------------
    // required

    /**
     * This method is called when the engine is ready to run
     * the game. Call the method to start your game.
     */
    run: async() => {
        await runGame();    
    },

    /**
     * This method is called when the engine is shutting down
     * so your game can perform any clean up necessary.
     */
    shutdown: () => {
        
    },

    //-----------------------------------------------------
    // optional: called when the engine state changes
    
    /**
     * Called whent the engine is paused
     */
    paused: () => {
        
    },

    /**
     * Called when the engine is resumed
     */
    resumed: () => {
        
    },

    /**
     * Called when the engine is stopped
     */
    stopped: () => {
        
    },

    /**
     * Called when the engine is stepped by one frame
     */
    stepped: () => {
        
    }
};

export default gameControl;