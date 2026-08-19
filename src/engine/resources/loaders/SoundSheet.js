import ResourceLoader from './ResourceLoader.js';
import Util from '../../core/Util.js';

export default class SoundSheet extends ResourceLoader {
    #name = null;

    constructor(name, resourceUrl, rel) {
        super(resourceUrl, ResourceLoader.TYPE.JSON, rel);
        this.#name = name || `SoundSheet${Util.hexHash(Date.now().toString())}`;
    }

}