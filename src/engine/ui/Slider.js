import { Config, Enum, $Math, Util } from '../core/lib.js';

export default class Slider extends Config {
    #el = null;
    #rangeLabels = [];
    #value = 0;
    #startDrag = [];
    #engDrag = [];
    #isDragging = false;
    
    // enums
    static STYLE = new Enum('HORIZONTAL', 'VERTICAL');
    static TYPE = new Enum('RANGE', 'PERCENT', 'INDEXED');
    static LABEL_POSITION = new Enum('TOP', 'BOTTOM');
    static RANGE_LABELS = new Enum('BOTH', 'MINIMUM', 'MAXIMUM');

    constructor(parentEl, options = {}) {
        super({
            label: 'Slider',
            sliderId: Util.hexHash(Date.now().toString()),
            style: Slider.STYLE.HORIZONTAL,
            type: Slider.TYPE.PERCENT,
            minValue: 0,
            maxValue: 100,
            initialValue: 0,
            step: 1,
            display: {
                withInput: true,
                ticks: true,
                labelPosition: Slider.LABEL_POSITION.TOP,
                rangeLabels: Slider.RANGE_LABELS.BOTH
            }
        });

        const slider = this.#build(parentEl);
        this.#hookEvents(slider);

        // initialize the display
        this.value = this.initialValue;
    }

    set value(value) {
        this.#value = value;
        this.#updateDisplay();
    }

    get value() {
        return this.#value;
    }

    get isDragging() {
        return this.#isDragging;
    }

    #build(parentEl) {
        // the container for the slider
        const container = document.createElement('div');
        container.id = `slider${this.sliderId}`;
        container.classList.add('slider', this.sliderId);
        container.classList.add(this.style === Slider.STYLE.HORIZONTAL ? 'horizontal' : 'vertical');
        
        // slider title
        const title = document.createElement('div');
        title.classList.add('title');
        title.textContent = this.label;
        container.appendChild(title);
        
        // slier bar & thumb
        const bar = document.createElement('div');
        const thumb = document.createElement('div');
        bar.classList.add('bar');
        thumb.classList.add('thumb');
        bar.appendChild(thumb);
        container.appendChild(bar);

        // direct input
        if (this.display.withInput === true) {
            const input = document.createElement('input');
            input.classList.add('slider-input');
            input.type = 'text';
            input.value = this.value.toString();
            container.appendChild(input);
        }

        // minimum label
        if (this.display.rangeLabels === Slider.RANGE_LABELS.BOTH || this.display.rangeLabels === Slider.RANGE_LABLES.MINIMUM) {
            const minLabel = document.createElenent('div');
            minLabel.textContent = this.type === Slider.TYPE.PERCENT ? '0%' : this.minValue;
            minLabel.classList.add('rangeLabel','min');
            container.appendChild(minLabel);
        }        

        // maximum label
        if (this.display.rangeLabels === Slider.RANGE_LABELS.BOTH || this.display.rangeLabels === Slider.RANGE_LABELS.MAXIMUM) {
            const maxLabel = document.createElement('div');
            maxLabel.classList.add('rangeLabel','max');
            maxLabel.textContent = this.type === Slider.TYPE.PERCENT ? '100%' : this.maxValue;
            container.appendChild(maxLabel);
        }

        // tick marks
        if (this.display.ticks) {
            let numTicks = 5;
            if (this.type === Slider.TYPE.INDEXED) {
                // divide the range into segments based on step size (should be between 10 and 100)
                numTicks = Math.ceil((this.maxValue - this.minValue) / $Math.clamp(this.step, 10, 100));
            }

            for (let i = 0; i < numTicks; i++) {
                const tick = document.createElement('div');
                tick.classList.add('tick');
                bar.appendChild(tick);
            }
        }

        return container;
    }

    #hookEvents(slider) {
        slider.querySelector('div.slider-input').addEventListener('change', (e) => {
            const value = parseFloat(e.target.value);
            if (!isNaN(value)) {
                this.setValue(value);
            }
        });

        const bar = slider.querySelector('div.bar'), 
            thumb = bar.querySelector('div.thumb');
        
        thumb.addEventListener('mouseDown', e => {
            e.preventDefault = true;
            this.#startDrag(e.clientX, e.clientY);
        });

        thumb.addEventListener('mouseMove', e => {
            e.preventDefault = true;

            if (this.style === Slider.STYLE.HORIZONTAL)
                this.value = this.#dragThumb(bar.clientX, bar.clientWidth, e.clientX);
            else 
                this.value = this.#dragThumb(bar.clientY, bar.clientHeight, e.clientY);
        });

        thumb.addEventListener('mouseUp', e => {
            e.preventDefault = true;
            this.#endDrag(e.clientX, e.clientY);
        });
    }

    #startDrag(x, y) {
        this.#dragStart = [x, y];
        this.#isDragging = true;
    }

    #endDrag(x, y) {
        this.#dragEnd = [x, y];
        this.#isDragging = false;
    }

    #dragThumb(low, high, pos) {
        // restrict movement to within the bar
        pos = $Math.clamp(pos, low, high);

        // restrict if INDEXED
        if (this.type = Slider.TYPE.INDEXED) {
            pos = Math.round(pos / this.step) * this.step;
        }

        return pos;
    }

    #updateDisplay() {
        const scale = (this.maxValue - this.minValue) / 100;
        const bar = slider.querySelector('div.bar'), 
            thumb = bar.querySelector('div.thumb');

        const barScale = (this.style === Slider.STYLE.HORIZONTAL ? bar.clientWidth - bar.clientX : bar.clientHeight - bar.clientY) / 100;

        // scale it to a percentage of the value
        let thumbPos = ((this.value * scale) * barScale);

        if (this.style === Slider.STYLE.HORIZONTAL)
            thumb.style.left = `${thumbPos}%`;
        else 
            thumb.style.top = `${thumbPos}%`
    }
}