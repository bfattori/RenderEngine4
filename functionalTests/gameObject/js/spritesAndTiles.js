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
                    doubleBuffered: true
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

// add blue background
document.getElementById("context").classList.add("sprites-and-tiles");

// load a couple asset sheets
const marioSprites = new SpriteSheet('SMBTiles', '../../assets/smb_sprites.json');
const tiles = new TileSheet('Tiles', '../../assets/floor_tiles.json');

// wait until they are loaded to continue
await marioSprites.loading();
await tiles.loading();

// drop some sprites in the playfield
let x = 100, y = 100;

marioSprites.sprites.forEach(sprite => {
    const actor = new GameObject();
    actor.addComponentParts(new Transform2dPart("transform"), new SpritePart("sprite"))
        .worldTransform = Matrix2d.identity().update({
            position: [x, y]
        });

    const transformPart = actor.getComponentByName("transform");
    transformPart.scale = [-1, 1];

    // add the object to the world - before making any modifications to it
    RenderEngine.world.addObject(actor);
    
    const sprPart = actor.getComponentByName("sprite");
    sprPart.sprite = sprite;

    if (sprite.states.size > 1) {
        makeDropDown(sprPart, x, y + 50);
    }
    
    x += 55;
});

function makeDropDown(sprPart, x, y) {
    const select =document.createElement('select');
    select.classList.add('sprite-state-select');
    const offsetX = document.getElementById('context').getBoundingClientRect().left;
    for (const [stateName, state] of sprPart.sprite.states) {
        const option = document.createElement('option');
        option.value = stateName;
        option.text = stateName;
        select.appendChild(option);
    }
    document.body.appendChild(select);
    select.style.left = (offsetX + x) + 'px';
    select.style.top = y + 'px';
    select.onchange = function() {
        sprPart.stateName = this.value;
    };
}


// Start the render loop   
RenderEngine.start();