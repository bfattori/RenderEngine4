import { ResourceError } from './Resource.js';
import { Engine, TranserrableConfig, Util } from '../core/lib.js';

class TileDef extends TransferrableConfig {
    constructor(tileConfig) {
        super({
            shape: null,
            left: 0,
            top: 0,
            width: 1,
            height: 1,
            frameRect: [0,0,1,1],
            boundingBox: [0,0,1,1]
        });
        this.merge(tileConfig);
    }
}

export { TileDef };

export default class Tile extends TransferrableConfig {
    #opaqueId = null;
    
    /**
     * Create a new `Tile` resource.
     * 
     * @param {String} name - The name of the tile
     * @param {SpriteSheet} spriteSheet - The sprite sheet resource 
     * @param {{ Number, Number, Number, Number, Number, String, Boolean }} [props] - The tile info
     * @param {Number} [left=0] - The left position of the sprite on the sprite sheet
     * @param {Number} [top=0] - The top position of the sprite on the sprite sheet
     * @param {Number} [width] - The width of the sprite
     * @param {Number} [height] - The height of the sprite
     */
    constructor(name, spriteSheet, tileDef) {
        super({
            name: name || `TILE:${Util.hexHash(date.now().toString())}`,
            spriteSheet: spriteSheet,
            tile: null
        });

        if (!spriteSheet)
            throw new ResourceError(this, `An error occurred creating the tile "${name}" - no sprite sheet`, ex);

        if (tileDef)
            this.initialize = tileDef;
    }

    set opaqueId(id) {
        this.#opaqueId = id;
    }

    get opaqueId() {
        return this.#opaqueId;
    }

    set initialize(tileDef) {
        if (tileDef) {
            this.tile = new TileDef({
                shape: tileDef,
                left: tileDef[0],
                top: tileDef[1],
                widht: tileDef[2],
                height: tileDef[3],
                frameRect: [tileDef[0], tileDef[1], tileDef[2], tileDef[3]],
                boundingBox: [0, 0, tileDef[2], tileDef[3]]
            });
            // this would be better if we had a reference of our own
            this.#opaqueId = Engine.renderContext.compileTile(this);
        }
    }

    /**
     * Destroy the sprite instance
     */
    destroy() {
        this.spriteSheet = null;
    }

    /**
     * Returns the sprite source image (from the SpriteSheet)
     * @returns {Image}
     */
    get sourceImage() {
        // extract the frame and draw to our buffer
        return this.spriteSheet.sheet.image;
    }

    get frameRect() {
        return this.tile.frameRect;
    }

    /**
     * Updates the frame rectangle of the sprite state. The frame is defines what
     * portion of the sprite sheet the sprite frame occupies, given the specified time.
     *
     * @param time {Number} Current world time
     * @param deltaTime {Number} The delta between the world time and the last time the world was updated
     *          in milliseconds.
     */
    update(time, deltaTime) {}
}
