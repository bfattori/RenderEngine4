import RenderEngine from '../../../src/engine/renderEngine4.js';
import RasterRenderContext from '../../../src/engine/rendering/contexts/RasterRenderContext.js';
import CanvasRenderer from '../../../src/engine/rendering/renderers/CanvasRenderer.js';

import GameObject from '../../../src/engine/gameobject/GameObject.js';
import Transform2dPart from '../../../src/engine/parts/transform/Transform2dPart.js';
import SpritePart from '../../../src/engine/parts/render/SpritePart.js';

import SpriteSheet from '../../../src/engine/resources/SpriteSheet.js';
import Sprite from '../../../src/engine/resources/Sprite.js';

import { Matrix2d } from '../../../src/engine/core/Matrix.js';

// create a double-buffered canvas renderer
await RenderEngine.init(import.meta.url, {
    flags: {
        debugMode: true,
        showFps: true,
        debugOpts: {
            objectOrigins: false
        }
    },
    world: {
        renderContext: new RasterRenderContext(
            CanvasRenderer.build(
                document.getElementById("context"), 
                {
                    doubleBuffered: true,
                    useCompiler: true
                }
            ),
            { 
                enableCulling: false, 
                text: {
                    forceUpperCase: true
                }
             }
        ),
        dimensions: {width: 800, height: 600},
        viewport: {left: 0, top: 0, width: 800, height: 600}
    }
});

// load a sprite sheet
const sheet = new SpriteSheet("smbtiles", "../../assets/resources/mariosprites.json");
await sheet.loading();

// game object and component parts
// - set world position, rotation, and scale
const gameObject = new GameObject();
gameObject
    .addComponentParts(new Transform2dPart("transform"), new SpritePart("sprite"))
    .worldTransform = Matrix2d.identity().update({
        position: [400, 300],
        rotation: 0,
        scale: [1, 1]
    });

// add the object to the world - before making any modifications to it
RenderEngine.world.addObject(gameObject);

// assign a sprite to the gameObject
const spritely = gameObject.getComponentByName('sprite');
spritely.sprite = sheet.sprites.get('mario_walk');
spritely.sprite.play();

// Start the render loop   
RenderEngine.start();

