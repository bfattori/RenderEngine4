
import Util from '../../core/Util.js';

export default class LoadCounter {
    static #MAXSAMPLES = 100;  // for smoothing

    #views = null;

    // HTML Elements
    #loadDisplay = null;
    #loadTitle = null;
    #loadLabel = [];
    #loadCounter = [];
    #loadContainer = [];
    #loadBar = [];
    #loadBarText = [];

    // Smoothed values
    #smoothed = [];

    // Smoothing filter
    #filterStrength = 10;
        
    constructor(title, views) {
        // generate display
        this.#views = views;
        this.#loadDisplay = document.createElement('div');
        this.#loadDisplay.classList.add('loadView');
        this.#loadDisplay.style.height = `${15 + (views.length * 15)}px`;
        this.#loadTitle = document.createElement('div');
        this.#loadTitle.textContent = title;
        this.#loadTitle.classList.add('loadTitle');
        this.#loadDisplay.appendChild(this.#loadTitle);

        for (let i = 0; i < views.length; i++) {
            // container
            this.#loadContainer[i] = document.createElement('div');
            this.#loadContainer[i].classList.add('loadContainer');
            this.#loadContainer[i].style.top = `${15 + (i * 15)}px`;
            
            // label
            this.#loadLabel[i] = document.createElement('span');
            this.#loadLabel[i].classList.add('loadLabel');
            this.#loadLabel[i].textContent = views[i];
            this.#loadContainer[i].appendChild(this.#loadLabel[i]);
            
            // counter display
            this.#loadCounter[i] = document.createElement('div');
            this.#loadCounter[i].classList.add('loadCounter');
            this.#loadContainer[i].appendChild(this.#loadCounter[i]);
            
            // bar display
            this.#loadBar[i] = document.createElement('div');
            this.#loadBar[i].classList.add('loadBar');
            this.#loadBarText[i] = document.createElement('span');
            this.#loadBarText[i].classList.add('loadBarText');
            this.#loadBar[i].appendChild(this.#loadBarText[i]);
            this.#loadContainer[i].appendChild(this.#loadBar[i]);
            this.#loadBar[i].style.backgroundColor = Util.getRandomColor(140, 140, 140);

            // add the container
            this.#loadDisplay.appendChild(this.#loadContainer[i]);
        }
        document.body.appendChild(this.#loadDisplay);
    }

    update(view, value, pct = false) {
        const idx = this.#views.indexOf(view);

        const displayValue = `${value.toFixed(0)}${pct ? '%' : ''}`;
        this.#loadCounter[idx].textContent = displayValue;
        this.#loadBarText[idx].textContent = displayValue;

        if (pct) 
            this.#loadBar[idx].style.width = `${value.toFixed(0)}%`;
    }
}