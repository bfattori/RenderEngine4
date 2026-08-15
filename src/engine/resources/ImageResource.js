
import Resource from './Resource.js';

export default class ImageResource extends Resource {
    #image = null;
    #width = 0;
    #height = 0;

    constructor(resourceUrl, width, height, rel = null) {
        super(resourceUrl, Resource.TYPE.CUSTOM, rel);
        this.#image = new Image(width, height);
        this.#image.addEventListener('load', () => { this.onLoad(); });
        this.#image.classList.add('image-resource');
        this.#width = width;
        this.#height = height;
        this.#image.src = this.url;
        document.body.appendChild(this.#image);
    }

    /**
     * Get the image
     * @returns {CanvasRenderingContext2d}
     */
    get image() {
        return this.#image;
    }

    onLoad(event) {
        this.loaded = true;
    }
}