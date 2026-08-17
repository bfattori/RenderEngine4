import { Config, Enum, $Math, Util } from '../core/lib.js';

export default class Slider extends Config {
    #el = null;
    #rangeLabels = [];
    #value = 0;
    #dragStart = [];
    #dragEnd = [];
    #isDragging = false;
    #sliderId = null;
    
    // enums
    static STYLE = new Enum('HORIZONTAL', 'VERTICAL');
    static TYPE = new Enum('RANGE', 'PERCENT', 'INDEXED');
    static LABEL_POSITION = new Enum('TOP', 'BOTTOM');
    static RANGE_LABELS = new Enum('BOTH', 'MINIMUM', 'MAXIMUM');

    constructor(parentEl, options = {}) {
        super({
            label: 'Slider',
            style: Slider.STYLE.HORIZONTAL,
            type: Slider.TYPE.PERCENT,
            minValue: 0,
            maxValue: 100,
            initialValue: 0,
            step: 1,
            display: {
                withInput: false,
                ticks: true,
                labelPosition: Slider.LABEL_POSITION.TOP,
                rangeLabels: Slider.RANGE_LABELS.BOTH,
                class: 're4-slider'
            }
        });
        this.merge(options);

        // initialize the display
        const $this = this;
        setTimeout(async () => {
            const slider = await $this.build(parentEl);
            $this.value = $this.initialValue;
        }, 10);
    }

    set value(value) {
        this.#value = value;
        this.#updateDisplay();
        this.onSlide(this.value);
    }

    get value() {
        return this.#value;
    }

    get isDragging() {
        return this.#isDragging;
    }

    #updateDisplay() {
        const slider = document.getElementById(this.#sliderId);
        const bar = slider.querySelector('div.bar'), 
            thumb = bar.querySelector('div.thumb'),
            input = slider.querySelector('input.slider-input');

        const barSize = this.style === Slider.STYLE.HORIZONTAL ? bar.clientWidth : bar.clientHeight;
        const offset = this.style === Slider.STYLE.HORIZONTAL ? bar.offsetLeft : bar.offsetTop;

        // scale it to a percentage of the value
        let thumbPos = offset + Math.round(this.value / barSize);

        if (this.style === Slider.STYLE.HORIZONTAL)
            thumb.style.left = `${thumbPos}px`;
        else 
            thumb.style.top = `${thumbPos}px`;

        // update the input
        input.value = this.value;
    }

    async build(parentEl) {
        // create the slider element
        const id = await Util.hexHash(Date.now().toString());
        this.#sliderId = `slider${id}`;
        const container = document.createElement('div');
        container.id = this.#sliderId;
        container.classList.add('slider', this.#sliderId, this.display.class);
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
            input.name = `input-${this.sliderId}`;
            container.appendChild(input);
        }

        // minimum label
        if (this.display.rangeLabels === Slider.RANGE_LABELS.BOTH || this.display.rangeLabels === Slider.RANGE_LABLES.MINIMUM) {
            const minLabel = document.createElement('div');
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

        // need to add to the document to measure
        parentEl.appendChild(container);

        // tick marks
        if (this.display.ticks) {
            let numTicks = 5;
            if (this.type === Slider.TYPE.INDEXED) {
                // divide the range into segments based on step size (should be between 10 and 100)
                numTicks = Math.ceil((this.maxValue - this.minValue) / $Math.clamp(this.step, 10, 100));
            }

            // for even distribution
            if (numTicks % 2 !== 0) {
                numTicks += 1;
            }

            const tickStep = Math.round((this.style === Slider.STYLE.HORIZONTAL ? bar.clientWidth : bar.clientHeight) / numTicks);
            let tickLeft = 0;
            for (let i = 0; i < numTicks + 1; i++) {
                const tick = document.createElement('div');
                tick.classList.add('tick');
                tick.style.left = `${tickLeft}px`;
                tickLeft += tickStep;
                bar.appendChild(tick);
            }
        }

        this.#hookEvents(container);
        
        return container;
    }

    #hookEvents(slider) {
        if (this.withInput) {
            slider.querySelector('div.slider-input').addEventListener('change', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                    this.value = value;
                }
            });
        }

        const bar = slider.querySelector('div.bar'), 
            thumb = bar.querySelector('div.thumb');
        
        const $this = this;
        const scalar = (this.maxValue - this.minValue) / bar.clientWidth;

        bar.addEventListener('mousedown', e => {
            e.preventDefault = true;
            $this.startDrag(e.clientX, e.clientY);
        });

        bar.addEventListener('mouseup', e => {
            e.preventDefault = true;
            $this.endDrag(e.clientX, e.clientY);
        });

        bar.addEventListener('mousemove', e => {
            if (!$this.isDragging) return;
            e.preventDefault = true;

            if ($this.style === Slider.STYLE.HORIZONTAL) {
                const left = slider.offsetLeft + bar.offsetLeft;
                const val = $this.dragThumb(left, left + bar.clientWidth, e.clientX);
                $this.value = (val * scalar);
            } else { 
                const top = slider.offsetTop + bar.offsetTop;
                const val = $this.dragThumb(top, top + bar.clientHeight, e.clientY);
                $this.value = val * scalar;
            }
        });
    }

    startDrag(x, y) {
        this.#dragStart = [x, y];
        this.#isDragging = true;
    }

    endDrag(x, y) {
        this.#dragEnd = [x, y];
        this.#isDragging = false;
    }

    dragThumb(low, high, pos) {
        // restrict movement to within the bar
        pos = $Math.clamp(pos, low, high);

        // restrict if INDEXED
        if (this.type === Slider.TYPE.INDEXED) {
            pos = Math.round(pos / this.step) * this.step;
        }

        return pos;
    }

    // override to get feeback from the slider
    onSlide(value) {}
}