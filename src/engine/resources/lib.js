import ResourceLoader, { ResourceError } from './loaders/ResourceLoader.js';
import ImageResource from './loaders/ImageResource.js';
import SoundSheet from './loaders/SoundSheet.js';
import SpriteSheet from './loaders/SpriteSheet.js';
import TileSheet from './loaders/TileSheet.js';
import TileMap from './loaders/TileMap.js';

import Sound from './Sound.js';
import Sprite from './Sprite.js';
import Tile from './Tile.js';

const loaders = {
    ResourceLoader,
    ImageResource,
    SoundSheet,
    SpriteSheet,
    TileMap,
    TileSheet    
};

export {
    // Classes
    ResourceError,

    Sound,
    Sprite,
    Tile,

    // packages
    loaders
};