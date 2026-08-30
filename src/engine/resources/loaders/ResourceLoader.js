import { Paths } from '../../core/Engine.js';
import RenderEngineError from '../../core/RenderEngineError.js';
import TransferrableConfig from '../../core/TransferrableConfig.js';

class ResourceError extends RenderEngineError {
    #resource = null;

    constructor(resource, message, rootCause) {
        super(message, rootCause);
        this.#resource = resource;
    }

    get resource() {
        return this.#resource;
    }
}

export { ResourceError };

export default class ResourceLoader extends TransferrableConfig {
    #content = null;
    #loaded = false;
    #inError = false;

    /**
     * The type of resource this loads: TEXT, JSON, BLOB, or CUSTOM.
     * Plaintext, JSON, Binary data, and a custom type to allow expansion.
     * @type {{TEXT: string, JSON: string, BLOB: string, CUSTOM: string}}
     */
    static TYPE = {
        TEXT: 'text',
        JSON: 'json',
        BLOB: 'blob',
        CUSTOM: 'custom'
    };

    /**
     * Loads a resource from the given Url into a container. 
     * Use `awaitResource()` to asynchronously wait for 
     * the resource to load or error.
     * 
     * @param {String} resourceUrl - The resource URL to load
     * @param {String} type - The type of resource to load (text, json, blob)
     */
    constructor(resourceUrl, type = ResourceLoader.TYPE.TEXT, rel = null) {
        rel = rel || Paths.game;
        super({
            resourceUrl: new URL(resourceUrl, rel),
            type: type,
            rel: rel,
            retryInterval: 500
        });

        if (type !== ResourceLoader.TYPE.CUSTOM)
            this.#loadResource();

    }

    destroy() {
        this.content = null;
    }

    get url() {
        return this.resourceUrl.toString();
    }

    get loaded() {
        return this.#loaded;
    }

    set loaded(state) {
        this.#loaded = state;
    }

    get inError() {
        return this.#inError;
    }

    set inError(state) {
        this.#inError = state;
    }

    get content() {
        return this.#content;
    }

    async customLoadResource() {}

    /**
     * Load up the resource
     */
    async #loadResource() {
        try {
            const response = await fetch(this.url);
    
            // Always check if the response status is OK (200-299)
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
    
            let content;
            switch(this.type) {
                case "text": 
                    content = await response.text();
                    break;
                case "json":
                    content = await response.json();
                    break;
                case "blob":
                    content =await response.blob();
                    break;
            }
            this.#content = await this.postProcess(content);
            this.#loaded = true;
        } catch (ex) {
            this.#inError = true;
            throw new ResourceError(this, `An error occurred while loading the resource "${this.url}" - ${ex.message}`, ex);
        }
    }

    /**
     * Process the data that was loaded from the resource, the base class
     * simply returns the results, but a sub-class will take the content
     * and construct an instance of itself from the data.
     *
     * @param {String} content - The content returned from the resource
     * @returns {*}
     */
    postProcess(content) {
        return content;
    }

    //-----------------------------

    /**
     * Pauses the execution until the resource has finished loading. Using `Promise.all()`,
     * you can collect several resource loaders and wait for them all to complete.
     *
     * @example
     * import TileSheet from './src/engine/resources/TileSheet.js';
     * import SpriteSheet from './src/engine/resources/SpriteSheet.js';
     *
     * const assets = [];
     * ['tiles', 'floors', 'walls', 'lighting', 'misc'].forEach(e => {
     *  const sheet = new TileSheet(e, `./assets/tilemaps/${e}.json`);
     *  assets.push(sheet.loading());
     * });
     * ['player','enemies', 'bosses', 'hardware'].forEach(e => {
     *  const sheet = new SpriteSheet(e, `./assets/spritesheets/${e}.json`);
     *  assets.push(sheet.loading());
     * });
     *
     * // wait until all assets are loaded
     * await Promise.all(assets);
     *
     * const tiles = new TileSheet('tiles', './assets/tiles.json');
     * const sprites = new SpriteSheet(
     *
     * @returns {Promise<boolean>} `true` if the resource loaded without error, `false` otherwise
     */
    async loading() {
        return new Promise((resolve) => {
            const check = () => {
                if (!this.loaded && !this.#inError) {
                    setTimeout(check, this.retryInterval);
                    return;
                }
                resolve(!this.#inError);
            };
            check();
        })
    }

    /**
     * Change the enums to their ordinals
     * @returns {Object}
     */
    dehydrate() {
        const props = super.dehydrate();
        props.resourceUrl = props.resourceUrl.toString();
        return props;
    }

    /**
     * Change the enums back to their values
     * @returns 
     */
    rehydrate() {
        const obj = super.rehydrate();
        obj.resourceUrl = new URL(obj.resourceUrl);
        return obj;
    }
}