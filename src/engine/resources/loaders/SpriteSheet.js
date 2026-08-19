import TileSheet from './TileSheet.js';
import { ResourceError } from './ResourceLoader.js';
import ImageResource from './ImageResource.js';
import Sprite from '../Sprite.js';

/**
 * SpriteSheet
 * See: functionalTests/gameObject/tileset/smbtiles.json
 *
 * @class
 * @extends Resource
 */
export default class SpriteSheet extends TileSheet {

    async postProcess(content) {
        if (!content.spriteSheet) 
            throw new ResourceError(this, `The resource "${this.url}" is not a valid sprite sheet.`);

        this.sheet = new ImageResource(`${this.name}-source`, content.bitmap.image, content.bitmap.width, content.bitmap.height, this.url);
        const assumeOpaque = content.assumeOpaque;
        const sprites = content.sprites;

        // this contains all the sprites
        if (await this.sheet.loading()) {
            // bitmap loaded, fill out the sprites
            Object.keys(sprites).forEach(key => {
                this.addTile(key, new Sprite(key, this, sprites[key]));
            });
        }
        return this;
    }

    get sprites() {
        return this.tiles;
    }

    tile(name, sprite) {
        return new Sprite(name, this, this.tileDef[sprite]);
    }

    sprite(name, sprite) {
        return this.tile(name, sprite);
    }
}