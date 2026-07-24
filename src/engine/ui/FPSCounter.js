
export default class FPSCounter {
    static #MAXSAMPLES = 100;  // for smoothing
    
    #tickers = {
        total: {
            index: 0,
            sum: 0,
            samples: new Array(FPSCounter.#MAXSAMPLES).fill(0)
        },
        update: {
            index: 0,
            sum: 0,
            samples: new Array(FPSCounter.#MAXSAMPLES).fill(0)
        },
        render: {
            index: 0,
            sum: 0,
            samples: new Array(FPSCounter.#MAXSAMPLES).fill(0)
        }
    };

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
        
    constructor() {
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

    update(frameStart, updateStart, updateEnd, renderStart, renderEnd, frameEnd) {
        const updateTick = updateEnd - updateStart;
        const renderTick = renderEnd - renderStart;
        const totalTick = frameEnd - frameStart;
        
        this.#tickers.update.sum -= this.#tickers.update.samples[this.#tickers.update.index];
        this.#tickers.render.sum -= this.#tickers.render.samples[this.#tickers.render.index];
        this.#tickers.total.sum -= this.#tickers.total.samples[this.#tickers.total.index];

        this.#tickers.update.sum += updateTick;
        this.#tickers.render.sum += renderTick;
        this.#tickers.total.sum += totalTick;

        this.#tickers.update.samples[this.#tickers.update.index] = updateTick;
        this.#tickers.render.samples[this.#tickers.render.index] = renderTick;
        this.#tickers.total.samples[this.#tickers.total.index] = totalTick;

        if(++this.#tickers.update.index===FPSCounter.#MAXSAMPLES)
            this.#tickers.update.index=0;

        if(++this.#tickers.render.index===FPSCounter.#MAXSAMPLES)
            this.#tickers.render.index=0;

        if(++this.#tickers.total.index===FPSCounter.#MAXSAMPLES)
            this.#tickers.total.index=0;

        const totalFPS = ((1 / (this.#tickers.total.sum / FPSCounter.#MAXSAMPLES)) * FPSCounter.#MAXSAMPLES).toFixed(0);
        const updateFPS = ((1 / (this.#tickers.update.sum / FPSCounter.#MAXSAMPLES)) * FPSCounter.#MAXSAMPLES).toFixed(0);
        const renderFPS = ((1 / (this.#tickers.render.sum / FPSCounter.#MAXSAMPLES)) * FPSCounter.#MAXSAMPLES).toFixed(0);

        const updatePct = (updateFPS/totalFPS).toFixed(0);
        const renderPct = (renderFPS/totalFPS).toFixed(0);

        this.#fpsCounter.textContent = `${(totalFPS / 10).toFixed(1)} fps`;

        this.#updateCounter.textContent = `${updatePct}%`;
        this.#updateBarText.textContent = `${updatePct}%`;

        this.#renderCounter.textContent = `${renderPct}%`;
        this.#renderBarText.textContent = `${renderPct}%`;

        this.#updateBar.style.width = `${updatePct}%`;
        this.#renderBar.style.width = `${renderPct}%`;
    }
}