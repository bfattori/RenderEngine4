
export default class CanvasPIP {
    #canvasPiP = null;

    // a temporary canvas where we can perform operations
    // and extract results
    static #workingCanvas = new OffscreenCanvas(160, 120);

    /**
     * 
     * @param {String} name - The picture-in-picture name 
     * @param {number} top - Optional top position of the PiP 
     * @param {number} width - The width in pixels of the PiP (default: 160)
     * @param {number} height - The height in pixels of the PiP (default: 120) 
     */
    constructor(title, top, width = 160, height = 120) {
        const pictureInPicture = document.createElement('div');
        pictureInPicture.classList.add('pip');
        if (top) {
            pictureInPicture.style.top = `${top}px`;
        }

        this.#canvasPiP = document.createElement('canvas');
        this.#canvasPiP.width = width;
        this.#canvasPiP.height = height;
        pictureInPicture.appendChild(this.#canvasPiP);
        document.body.appendChild(pictureInPicture);

        if (title !== '') {
            const titleEl = document.createElement('div');
            titleEl.classList.add('title');
            titleEl.textContent = title;
            pictureInPicture.appendChild(titleEl);
        }
    }

    get width() {
        return this.#canvasPiP.width;
    }

    get height() {
        return this.#canvasPiP.height;
    }

    /**
     * Update the picture-in-picture view
     * @param {ImageBitmap} image - The image to render to the view 
     */
    update(image) {
        // scale the image down to the PiP
        this.#canvasPiP.getContext('2d').clearRect(0, 0, this.#canvasPiP.width, this.#canvasPiP.height);
        this.#canvasPiP.getContext('2d').drawImage(image, 0, 0, this.#canvasPiP.width, this.#canvasPiP.height);
    }

    /**
     * Copy an `ImageBitmap`
     * @param {ImageBitmap} imageBitmap - The image bitmap to render
     * @returns {ImageBitmap}
     */
    static copyImage(imageBitmap, width, height) {
        CanvasPIP.#workingCanvas.getContext('2d').drawImage(imageBitmap, 0, 0, CanvasPIP.#workingCanvas.width, CanvasPIP.#workingCanvas.height);
        return CanvasPIP.#workingCanvas.transferToImageBitmap();
    }
}