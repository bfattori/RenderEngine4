
export default class FPSCounter {
    static #MAXSAMPLES = 100;  // for smoothing

    // HTML Elements
    #fpsDisplay = null;
    #fpsCounter = null;
    #updateContainer = null;
    #updateCounter = null;
    #updateBar = null;
    #updateBarText = null;
    #renderContainer = null;
    #renderCounter = null
    #renderBar = null;
    #renderBarText = null;

    // Smoothed values
    #smoothedFPS = 0;
    #smoothedT = 0;
    #smoothedR = 0;
    #smoothedU = 0;

    // Smoothing filter
    #filterStrength = 10;
        
    constructor() {
        // generate display
        this.#fpsDisplay = document.createElement('div');
        this.#fpsDisplay.classList.add('fpsCounter');
        this.#fpsDisplay.innerHTML = "<span class='fps'>FPS:</span><span class='update'>Update:</span><span class='render'>Render:</span>";
        this.#fpsCounter = document.createElement('div');
        this.#fpsCounter.classList.add('framesPerSec');
        this.#updateContainer = document.createElement('div');
        this.#updateContainer.classList.add('updateContainer');
        this.#updateCounter = document.createElement('div');
        this.#updateCounter.classList.add('updateCounter');
        this.#updateBar = document.createElement('div');
        this.#updateBar.classList.add('updateBar');
        this.#updateBarText = document.createElement('span');
        this.#updateBarText.classList.add('updateBarText');
        this.#updateBar.appendChild(this.#updateBarText);
        this.#updateContainer.appendChild(this.#updateCounter);
        this.#updateContainer.appendChild(this.#updateBar);
        this.#renderContainer = document.createElement('div');
        this.#renderContainer.classList.add('renderContainer');
        this.#renderCounter = document.createElement('div');
        this.#renderCounter.classList.add('renderCounter');
        this.#renderBar = document.createElement('div');
        this.#renderBar.classList.add('renderBar');
        this.#renderBarText = document.createElement('span');
        this.#renderBarText.classList.add('renderBarText');
        this.#renderBar.appendChild(this.#renderBarText);
        this.#renderContainer.appendChild(this.#renderCounter);
        this.#renderContainer.appendChild(this.#renderBar);
        this.#fpsDisplay.appendChild(this.#fpsCounter);
        this.#fpsDisplay.appendChild(this.#updateContainer);
        this.#fpsDisplay.appendChild(this.#renderContainer);
        document.body.appendChild(this.#fpsDisplay);
    }

    update(deltaTime, frameStart, updateStart, updateEnd, renderStart, renderEnd, frameEnd) {
        const updateTick = updateEnd - updateStart;
        const renderTick = renderEnd - renderStart;
        const totalTick = frameEnd - frameStart;
        
        const instantFPS = 1000 / deltaTime;
        this.#smoothedFPS += (instantFPS - this.#smoothedFPS) / this.#filterStrength;
        this.#smoothedT += (totalTick - this.#smoothedT) / this.#filterStrength;
        this.#smoothedU += (updateTick - this.#smoothedU) / this.#filterStrength;
        this.#smoothedR += (renderTick - this.#smoothedR) / this.#filterStrength;

        const updatePct = 100 - ((this.#smoothedU / this.#smoothedT) * 100);
        const renderPct = 100 - ((this.#smoothedR / this.#smoothedT) * 100);

        this.#fpsCounter.textContent = `${this.#smoothedFPS.toFixed(1)} fps`;

        this.#updateCounter.textContent = `${updatePct.toFixed(0)}%`;
        this.#updateBarText.textContent = `${updatePct.toFixed(0)}%`;

        this.#renderCounter.textContent = `${renderPct.toFixed(0)}%`;
        this.#renderBarText.textContent = `${renderPct.toFixed(0)}%`;

        this.#updateBar.style.width = `${updatePct.toFixed(0)}%`;
        this.#renderBar.style.width = `${renderPct.toFixed(0)}%`;
    }
}