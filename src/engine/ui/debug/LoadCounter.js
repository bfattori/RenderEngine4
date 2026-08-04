import Constants from '../../constants.js';
import Util from '../../core/Util.js';

export default class LoadCounter {
    #config = null;

    // HTML Elements
    #loadCounter = [];
    #loadBar = [];
    #loadBarText = [];

    // Smoothed values
    #smoothed = {};
    

    // Smoothing filter
    #filterStrength;

    constructor(title, config) {

        // generate display
        this.#config = { ...Constants.LOAD_COUNTER_DEFAULTS, ...config };
        Object.keys(config.options).forEach(k => {
            this.config.options[k] = {...Constants.DEFAULT_COUNTER_FORMAT, ...config.options[k]};    
        });
        this.#filterStrength = this.config.filteringStrength;

        const views = this.config.counters;
        const loadDisplay = document.createElement('div');
        loadDisplay.classList.add('loadView');

        // positioning & sizing
        ['top','left','right','bottom','width','minHeight'].forEach(e => {
            if (this.config[e] && this.config[e] !== 0)
                loadDisplay.style[e] = `${this.config[e]}px`;
        });

        const loadTitle = document.createElement('div');
        loadTitle.textContent = title;
        loadTitle.classList.add('loadTitle');
        loadDisplay.appendChild(loadTitle);

        const structure = {};
        const heights = {};

        for (let i = 0; i < views.length; i++) {
            const parts = views[i].split(':');
            const inSection = parts.length === 2;
            const viewName = inSection ? parts[0] : views[i];

            let container = document.createElement('div');
            container.style.marginTop = `1px`;
        
            if (inSection && !structure[viewName]) {
                structure[viewName] = container;

                // create section
                const section = document.createElement('div');
                section.classList.add('loadSection');
                // title
                const sectionTitle = document.createElement('div');
                sectionTitle.classList.add('sectionTitle');
                sectionTitle.textContent = viewName;
                section.appendChild(sectionTitle);
                // container
                section.appendChild(container);

                loadDisplay.appendChild(section);
            } else if (inSection) {
                // retrieve section
                container = structure[viewName];
            }

            if (!inSection) {
                structure[viewName] = container;
                loadDisplay.appendChild(container);
            }

            // stat container
            container = structure[viewName] || document.createElement('div');
            if (!container.classList.contains('loadContainer')) container.classList.add('loadContainer');

            const format = {
                ...Constants.DEFAULT_COUNTER_FORMAT,
                ...this.config.options[views[i]]
            };

            if (format.smooth) {
                this.#smoothed[views[i]] = 0;
            }

            const entry = document.createElement('div');
            entry.classList.add('loadEntry');

            // label string
            const labelStr = document.createElement('span');
            labelStr.classList.add('loadLabel');
            labelStr.textContent = inSection ? parts[1] : views[i];
            entry.appendChild(labelStr);

            // counter display
            this.#loadCounter[i] = document.createElement('div');
            this.#loadCounter[i].classList.add('loadCounter');
            entry.appendChild(this.#loadCounter[i]);

            // bar display
            if (format.bar) {
                this.#loadBar[i] = document.createElement('div');
                this.#loadBar[i].classList.add('loadBar');
                this.#loadBarText[i] = document.createElement('span');
                this.#loadBarText[i].classList.add('loadBarText');
                this.#loadBar[i].appendChild(this.#loadBarText[i]);
                this.#loadBar[i].style.backgroundColor = format.color || Util.getRandomColor(140, 140, 140);
                entry.appendChild(this.#loadBar[i]);
            }

            let containerHeight = heights[viewName] ? heights[viewName].h : 0;
            containerHeight += 15;
            container.append(entry);
            heights[viewName] = { el: container, h: containerHeight };
        }

        // adjust the heights of the containers
        Object.keys(heights).forEach(key => {
            const el = heights[key].el;
            el.style.height = `${heights[key].h}px`;
        })

        document.body.appendChild(loadDisplay);
    }

    get filteringStrength() {
        return this.#filterStrength;
    }

    set filteringStrength(strength) {
        this.#filterStrength = strength;
    }

    get config() {
        return this.#config;
    }

    update(view, value) {
        const idx = this.config.counters.indexOf(view);
        const format = this.config.options[view];

        if (format.smoothing) {
            this.#smoothed[view] += (value - this.#smoothed[view]) / this.filteringStrength;
        }
        
        const displayValue = [format.prefix, value.toFixed(0), format.suffix].filter(e => typeof e !== 'undefined').join('');
        this.#loadCounter[idx].textContent = displayValue;

        if (format.bar) {
            this.#loadBarText[idx].textContent = displayValue;
            this.#loadBar[idx].style.width = displayValue;
        }
    }
}