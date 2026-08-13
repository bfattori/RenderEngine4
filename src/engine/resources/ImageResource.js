
import Resource from './Resource.js';

export default class ImageResource extends Resource {
    #offscreen = null;
    #context = null;
    #width = 0;
    #height = 0;

    constructor(resourceUrl, width, height, rel) {
        super(resourceUrl, Resource.TYPE.BLOB, rel);
        this.#offscreen = new OffscreenCanvas(width, height);
        this.#context = this.#offscreen.getContext('2d', {
            willReadFrequently: true
        });
        this.#width = width;
        this.#height = height;
    }

    async postProcess(content) {
        // store the image to the offscreen
        const bitmap = await createImageBitmap(content, 0, 0, this.#width, this.#height);
        this.#context.drawImage(bitmap, 0, 0);
        
        // get the underlying context
        return this.image;
    }
    
    /**
     * Get the image
     * @returns {CanvasRenderingContext2d}
     */
    get image() {
        return this.#offscreen.getContext('2d');
    }
}