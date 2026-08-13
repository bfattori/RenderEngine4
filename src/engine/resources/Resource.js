import RenderEngineError from '../core/RenderEngineError.js';

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

export default class Resource {
    static TYPE = {
        TEXT: 'text',
        JSON: 'json',
        BLOB: 'blob'
    };

    #resourceUrl = null
    #content = null;
    #loaded = false;
    #inError = false;
    #type;
    #rel;

    /**
     * Loads a resource from the given Url into a container. 
     * Use `awaitResource()` to asynchronously wait for 
     * the resource to load or error.
     * 
     * @param {String} resourceUrl - The resource URL to load
     * @param {String} type - The type of resource to load (text, json, blob)
     */
    constructor(resourceUrl, type = Resource.TYPE.TEXT, rel = import.meta.url) {
        this.#resourceUrl = new URL(resourceUrl, rel);
        this.#type = type;
        this.#rel = rel;
        this.#loadResource();
    }

    destroy() {
        this.content = null;
    }

    get url() {
        return this.#resourceUrl.toString();
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

    get rel() {
        return this.#rel;
    }

    /**
     * Load up that resource
     */
    async #loadResource() {
        try {
            const response = await fetch(this.url);
    
            // Always check if the response status is OK (200-299)
            if (!response.ok) {
                throw new ResourceError(this, `HTTP error! Status: ${response.status}`);
            }
    
            let content;
            switch(this.#type) {
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
            throw new ResourceError(this, `An error occurred while loading the resource "${this.url}`, ex);
        }
    }

    postProcess(content) {
        return content;
    }

    //-----------------------------

    /**
     * A promise that resolves when the resource has finished loading.
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
}