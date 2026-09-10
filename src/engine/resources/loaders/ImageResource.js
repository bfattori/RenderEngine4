import ResourceLoader from './ResourceLoader.js';

export default class ImageResource extends ResourceLoader {
    #image = null;

    constructor(name, resourceUrl, width, height, rel = null) {
        super(resourceUrl, ResourceLoader.TYPE.BLOB, rel);
        this.merge({
            name: name,
            width: width,
            height: height
        });
    }

    async postProcess(content) {
        this.#image = await createImageBitmap(content);
    }

    /**
     * Get the image
     * @returns {ImageBitmap}
     */
    get image() {
        return this.#image;
    }
}