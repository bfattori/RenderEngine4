import RenderEngine from '../../../src/engine/renderEngine4.js';
import RasterRenderContext from '../../../src/engine/rendering/contexts/RasterRenderContext.js';
import CanvasRenderer from '../../../src/engine/rendering/renderers/CanvasRenderer.js';
import SpriteSheet from '../../../src/engine/resources/SpriteSheet.js';
import Sprite from '../../../src/engine/resources/Sprite.js';
import TileSheet from '../../../src/engine/resources/TileSheet.js';
import TileMap from '../../../src/engine/resources/TileMap.js';
import { $Math, Util } from '../../../src/engine/core/lib.js';

// create a double-buffered canvas renderer
await RenderEngine.init(import.meta.url, {
    flags: {
        debugMode: false
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
                enableCulling: false, 
                text: {
                    forceUpperCase: true
                }
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
const marioSprites = new SpriteSheet("SMBTiles", "../../assets/smb_sprites.json");
await marioSprites.loading();

const tileMap = new TileMap('platformer', '../../assets/platformer.json');
await tileMap.loading();

// drop some sprites in the playfield
// marioSprites.sprites.forEach(sprite => {
//     api
//         .push()
//         .scale($Math.randomRange(1, 4, true))
//         .sprite(sprite, $Math.randomRange(10, 600, true), $Math.randomRange(10, 500, true))
//         .pop();
// });


// load up a tilemap



// Run out one frame to render it   
RE4.update(0, 0);
RE4.renderWorld();

