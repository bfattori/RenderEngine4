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

        // an element to load and hold the image
        this.#image = new Image(width, height);
        this.#image.addEventListener('load', () => { this.onLoad(); });
        this.#image.classList.add('image-resource');
        this.#image.src = this.url;
        document.body.appendChild(this.#image);
    }

    /**
     * Get the image
     * @returns {Image}
     */
    get image() {
        return this.#image;
    }

    onLoad(event) {
        this.loaded = true;
    }
}