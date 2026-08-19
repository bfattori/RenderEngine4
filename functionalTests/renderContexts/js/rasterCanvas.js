import RenderEngine from '../../../src/engine/renderEngine4.js';
import RasterRenderContext from '../../../src/engine/rendering/contexts/RasterRenderContext.js';
import CanvasRenderer from '../../../src/engine/rendering/renderers/CanvasRenderer.js';
import SpriteSheet from '../../../src/engine/resources/loaders/SpriteSheet.js';
import Sprite from '../../../src/engine/resources/Sprite.js'
import TileSheet from '../../../src/engine/resources/loaders/TileSheet.js';
import Tile from '../../../src/engine/resources/Tile.js';
import $Math from '../../../src/engine/core/Math.js';
import Util from '../../../src/engine/core/Util.js';

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

const floorTiles = new TileSheet("Floor", "../../assets/floor_tiles.json");
await floorTiles.loading();

// draw some lines
for (let i = 0; i < 20; i++) {
    api
        .color(Util.getRandomColor(230, 230, 230)).width($Math.randomRange(1, 5, true))
        .line($Math.randomRange(5, 790, true), $Math.randomRange(5, 590, true), $Math.randomRange(5, 790, true), $Math.randomRange(5, 590, true));
}

// throw some confetti
for (let i = 0; i < 100; i++) {
    api
        .color(Util.getRandomColor(80, 80, 80)).width($Math.randomRange(1, 5, true))
        .point($Math.randomRange(5, 790, true), $Math.randomRange(5, 590, true));
}

// drop some sprites in the playfield
marioSprites.sprites.forEach(sprite => {
    api
        .push()
        .scale($Math.randomRange(1, 4, true))
        .sprite(sprite, $Math.randomRange(10, 600, true), $Math.randomRange(10, 500, true))
        .pop();
});

// toss out some tiles
floorTiles.tiles.forEach(tile => {
    api
        .push()
        .scale($Math.randomRange(1, 2, true))
        .tile(tile, $Math.randomRange(1, 15, true) * 32, $Math.randomRange(1, 15, true) * 32)
        .pop();
});


// load up a tilemap



// Run out one frame to render it   
RE4.update(0, 0);
RE4.renderWorld();

