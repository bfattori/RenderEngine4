
import Resource from './Resource.js';

export default class ImageResource extends Resource {
    #element = new HTMLImageElement();
    #bitmap = null;
    #width = 0;
    #height = 0;

    constructor(resourceUrl, width, height) {
        super(resourceUrl, Resource.TYPE.BLOB);
        this.#width = width;
        this.#height = height;
    }

    async postProcess(content) {
        // generate a DOM-accessible URL for the blob
        const imageObjectURL = URL.createObjectURL(content);
        
        // assign it to the image element
        this.#element.src = imageObjectURL;
        this.#element.width = this.#width;
        this.#element.height = this.#height;
        
        // extract the image bitmap
        this.#bitmap = self.createImageBitmap(this.#container);
        return this.#bitmap;
    }
    
    /**
     * Get the bitmap
     * @returns {ImageBitmap}
     */
    get bitmap() {
        return this.content;
    }
}