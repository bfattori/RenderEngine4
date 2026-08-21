import RenderEngine from '../../../src/engine/renderEngine4.js';
import RasterRenderContext from '../../../src/engine/rendering/contexts/RasterRenderContext.js';
import CanvasRenderer from '../../../src/engine/rendering/renderers/CanvasRenderer.js';
import SpriteSheet from '../../../src/engine/resources/loaders/SpriteSheet.js';
import TileSheet from '../../../src/engine/resources/loaders/TileSheet.js';
import Transform2dPart from '../../../src/engine/parts/transform/Transform2dPart.js';
import SpritePart from '../../../src/engine/parts/render/SpritePart.js';
import { Matrix2d } from '../../../src/engine/core/Matrix.js';

import GameObject from '../../../src/engine/gameobject/GameObject.js';

// create a double-buffered canvas renderer
await RenderEngine.init(import.meta.url, {
    flags: {
        debugMode: true,
        debugOpts: {
            objectOrigins: true,
            boundingBoxes: false
        }
    },
    world: {
        renderContext: new RasterRenderContext(
            CanvasRenderer.build(
                document.getElementById("context"), 
                {
                    doubleBuffered: false
                }
            ),
            { 
                enableCulling: false
            }
        ),
        dimensions: {width: 800, height: 600},
        viewport: {left: 0, top: 0, width: 800, height: 600}
    },
    hooks: {
        onInit: () => { console.log("Starting raster renderer example"); }
    }
});

const context = RE4.world.renderContext;

// chainable API for drawing shapes and text
const api = context.getAPI();

// load a couple sprite sheets
const marioSprites = new SpriteSheet('SMBTiles', '../../assets/smb_sprites.json');
const tiles = new TileSheet('Tiles', '../../assets/floor_tiles.json');

await marioSprites.loading();
await tiles.loading();

// drop some sprites in the playfield
let x = 100, y = 100;

marioSprites.sprites.forEach(sprite => {
   
    const actor = new GameObject();
    actor.addComponentParts(new Transform2dPart("transform"), new SpritePart("sprite"))
        .worldTransform = Matrix2d.identity().update({
            position: [x, y],
            rotation: 0,
            scale: [1, 1]
        });

    // add the object to the world - before making any modifications to it
    RenderEngine.world.addObject(actor);
    
    const sprPart = actor.getComponentByName("sprite");
    sprPart.sprite = sprite;
    
    x += 45;
});


// Start the render loop   
RenderEngine.start();