import ResourceLoader from './ResourceLoader.js';

export default class ImageResource extends ResourceLoader {
    #image = null;

    constructor(name, resourceUrl, width, height, rel = null) {
        super(resourceUrl, ResourceLoader.TYPE.CUSTOM, rel);
        this.merge({
            name: name,
            width: width,
            height: height
        });
        this.#loadImage(width, height);
    }

    /**
     * Get the image
     * @returns {Image}
     */
    get image() {
        return this.#image;
    }

    #loadImage(width, height) {
        if (this.#image !== null) {
            this.#image.remove();
            this.#image = null;
        }

        // an element to load and hold the image
        this.#image = new Image(width, height);
        this.#image.addEventListener('load', () => { this.onLoad(); });
        this.#image.classList.add('image-resource');
        this.#image.src = this.url;
        document.body.appendChild(this.#image);
    }

    onLoad(event) {
        this.loaded = true;
    }

    /**
     * Load the image
     * @returns 
     */
    rehydrate() {
        const obj = super.rehydrate();
        this.#loadImage(obj.width, obj.height);
        return obj;
    }
}