import Grid from './Grid.js';
import ColorUtil from './ColorUtil.js';

import { DefaultPaint, DefaultErase, DefaultUndo, DefaultShift, 
  DefaultFlip, DefaultRotate, DefaultCaptureFrame } from './plugins/toolbar/Buttons.js';
import Filtering, { FilterKernels, FilterTools } from './plugins/filters/Filters.js';

export default class SpriteEditor {
  static #instance = null;

  #previewCtx;
  #previewEl;
  #editorEl;
  #grid;

  #filterFn;
  #toolbarButtons = new Map();
  #enabledButton;

  #actionHandlers = new Map();

  #previousColors = [];

  static getInstance(editorEl, previewEl) {
    if (SpriteEditor.#instance === null)
      SpriteEditor.#instance = new SpriteEditor(editorEl, previewEl);

    return SpriteEditor.#instance;
  }

  /**
   * Create a Sprite Editor instance
   * @param {HTMLCanvasElement} editorEl - The editor canvas
   * @param {HTMLCanvasElement} previewEl - The preview canvas
   */
  constructor(editorEl, previewEl) {
    this.#editorEl = editorEl;
    this.#previewEl = previewEl;
    this.#previewCtx = previewEl.getContext('2d', {
      alpha: false,
      colorType: 'float16'
    });

    this.#previewCtx.imageSmoothingEnabled = false;
    this.#grid = new Grid(this, editorEl.width, editorEl.height, 16, 16, editorEl);
    
    this.#setupEvents();

    // add the default plugins
    const firstButton = new DefaultPaint();
    this.addButtons(firstButton, new DefaultErase(), new DefaultUndo(), new DefaultCaptureFrame(),
      new DefaultShift(), new DefaultFlip(), new DefaultRotate()
    );

    // load default filters
    this.#loadFilters();

    // get everything ready
    this.#wireUI();
    this.#bindPreview();
    this.refreshPreview();
    this.enableButton(firstButton);

    // force a new swatch
    this.#setForegroundColor(document.getElementById('fg').value);
  }

  /**
   * Static method to get the grid associated with the SpriteEditor instance
   */
  static get grid() {
    return SpriteEditor.getInstance().grid;
  }

  /**
   * Get the grid associated with the SpriteEditor
   */
  get grid() {
    return this.#grid;
  }

  get pluginToolbar() {
    return document.getElementById('editor-toolbar');
  }

  get currentPluginEnabled() {
    return this.#enabledButton;
  }

  /**
   * Refresh the preview display
   */
  refreshPreview() {
    this.#previewEl.width = this.#grid.cellsX;
    this.#previewEl.height = this.#grid.cellsY;
    this.#previewCtx.imageSmoothingEnabled = false;
    this.#previewCtx.clearRect(0, 0, this.#previewEl.width, this.#previewEl.height);
    this.#previewCtx.drawImage(this.#grid.previewCanvas, 0, 0, this.#previewEl.width, this.#previewEl.height);
  }

  resizePreview(width, height) {
    this.#previewEl.width = width;
    this.#previewEl.height = height;
    this.refreshPreview();
  }

  async loadPlugin(pluginFile) {
    const pluginClass = await import(new URL(`./plugins/app/${pluginFile}`, import.meta.url));
    const plugin = new pluginClass.default();
    this.addAppPlugin(plugin);
    console.info(`Loaded "${pluginFile}"`);
  }

  //-----------------------------------------------------------
  // Plugins
  //-----------------------------------------------------------

  /**
   * Add a set of plugins to the SpriteEditor
   * @param  {...any} plugins - The plugins to add
   */
  addAppPlugins(...plugins) {
    plugins.forEach(plugin => this.addAppPlugin(plugin));
  }

  /**
   * Add a single plugin to the SpriteEditor
   * @param  {any} plugin - The plugin to add
   */
  addAppPlugin(plugin) {

  }

  /**
   * Add a set of button plugins to the SpriteEditor
   * @param  {...any} buttons - The buttons to add
   */
  addButtons(...buttons) {
    buttons.forEach(button => this.addButton(button));
  }

  /**
   * Add a single button plugin to the SpriteEditor
   * @param  {any} plugin - The button to add
   */
  addButton(button) {
    this.#toolbarButtons.set(button.name, button);
    button.activate(this);
  }

  /**
   * Enables the plugin associated with the button
   * @param {DefaultToolbarButton} button - The toolbar button
   */
  enableButton(button) {
    if (!button.options.momentary) {
      // if the plugin should stay on, replace the previous plugin
      this.#enabledButton?.disabled();
      this.#enabledButton = button;
    }

    // only change action when not "none"
    if (button.action !== Grid.ACTIONS.none)
      this.grid.action = button.action;

    button.enabled();
  }

  //--------------------------------------------------------------
  // Event handlers
  //--------------------------------------------------------------

  /**
   * Register an event handler to call on a button.
   * @param {DefaultToolbarButton} button - The target for the event
   * @param {String} handlerName - The handler to attach to
   * @param {*} fn - The function to call when the event is triggered
   */
  addHandler(button, handlerName, fn) {
    const handlers = this.#actionHandlers.get(handlerName);
    handlers.push({ p: button, f: fn });
    this.#actionHandlers.set(handlerName, handlers.sort((a, b) => (b.p.options.priority || 0.5) - (a.p.options.priority || 0.5)));
  }


  /**
   * Trigger an event handler on the SpriteEditor.
   * @param {String} handlerName - The name of the handler to trigger
   * @param  {...any} args - The arguments to pass to the event handler
   */
  triggerHandler(handlerName, ... args) {
    const handlers = this.#actionHandlers.get(handlerName);
    if (handlers) {
      handlers.forEach(h => { 
        if (h.p.isEnabled || (h.p.options.always && h.p.options.always.includes(handlerName))) 
          h.f(...args); 
      });
    }
  }

  //-------------------------------------------------------------
  // Private methods
  //-------------------------------------------------------------

  #setupEvents() {
    ['mouseDown', 'mouseUp', 'mouseLeave', 'mouseMove', 'contextMenu', 
      'clearGrid', 'loadSprite', 'spriteLoaded', 'saveSprite', 'spriteSaved',
      'zoomIn', 'zoomOut', 'zoomReset', 'keyDown', 'keyUp', 'keyPress',
      'beforeFilter', 'filtered']
     .forEach(e => {
      this.#actionHandlers.set(e, []);
    })
  }

  #loadFilters() {
    const select = document.getElementById('filter-list');
    select.addEventListener('change', (e) => {
      const v = e.target.selectedOptions[0].value.split(':');
      this.#filterSelected(v[0], v[1]);
    });

    let header = document.createElement('optgroup');
    header.label = 'Image Filters'
    select.appendChild(header);
    Object.keys(FilterKernels.image).forEach(k => {
      const opt = document.createElement('option');
      opt.label = k;
      opt.value = `image:${k}`;
      select.appendChild(opt);
    });

    header = document.createElement('optgroup');
    header.label = 'Color Adjustment'
    select.appendChild(header);
    Object.keys(FilterTools).forEach(k => {
      const opt = document.createElement('option');
      opt.label = k;
      opt.value = `tool:${k}`;
      select.appendChild(opt);
    });

  }

  #getInputsForVariable(varB) {
    const tool = document.getElementById('tool-inputs');
    let inp = tool.querySelectorAll(`input[name=${varB}]`);
    if (inp.length === 0)
      inp = tool.querySelectorAll(`select[name=${varB}]`);

    return inp;
  }

  #getValueForVariable(varB) {
    let inp = this.#getInputsForVariable(varB);
    if (inp.length === 0) {
      throw new Error(`No input found for variable "${varB}"`);
    } else if (inp.length === 1) {
      inp = inp.item(0);
    } else {
      let tmp;
      inp.forEach(el => {
        if (el.checked)
          tmp = el;
      });
      inp = tmp;
    }

    return inp.value;
  }

  #filterSelected(type, name) {
    const btn = document.getElementById('apply-filter');
    const tool = document.getElementById('tool-inputs');

    if (this.#filterFn)
      btn.removeEventListener('click', this.#filterFn);

    // show input display
    tool.classList.add('visible');    // Filter tool inputs
    tool.replaceChildren();

    const filter = type === Filtering.TYPE.Tool ? FilterTools[name] : FilterKernels[type][name];
    const vars = filter.inputs ? filter.inputs.map(e => e.var) : null;

    this.#filterFn = () => { 
      this.triggerHandler('beforeFilter');

      const fields = {};
      if (vars)
        vars.forEach(varB => {
          fields[varB] = this.#getValueForVariable(varB);
        });

      const matrix = filter.filter ? filter.filter(fields) : filter.matrix(fields);
      let result;
      switch (type) {
        case Filtering.TYPE.Image: 
          result = !filter.colorspace ? 
            Filtering.apply2dKernel(this.#grid.previewImage, matrix.matrix, matrix.divisor, matrix.offset) :
            Filtering.applyColorSpace(this.#grid.previewImage, matrix);
          break;
        case Filtering.TYPE.Tool:
          result = Filtering.applyColorSpace(this.#grid.previewImage, matrix);
          break;
      }
      this.#grid.loadContentsFromImage(result, false);
      this.refreshPreview();
      this.triggerHandler('filtered');
    };

    // build the user inputs and wire them up
    if (filter.inputs) {
      filter.inputs.forEach(input => {

        let i = document.createElement('div');
        let label = document.createElement('label');
        label.textContent = `${input.name}: `;

        let el, delayed = [];

        if ([Filtering.INPUTS.slider,
            Filtering.INPUTS.text,
            Filtering.INPUTS.select].includes(input.type)) {
          el = document.createElement(input.type === Filtering.INPUTS.select ? Filtering.INPUTS.select : 'input');
          el.id = `filter-input-${input.var}`;
          el.name = input.var;
          el.value = input.val;
        }

        if (![Filtering.INPUTS.select, 
              Filtering.INPUTS.oneOf, 
              Filtering.INPUTS.manyOf].includes(input.type))
          el.type = input.type;

        switch(input.type) {
          case Filtering.INPUTS.slider:
            el.min = input.min;
            el.max = input.max;
            if (input.decimal)
              el.step = input.stepSize || 0.01;
            else
              el.step = input.stepSize || 1;
            break;
          case Filtering.INPUTS.text:
            el.maxLength = input.len || 10;
            el.placeholder = input.placeholder || '';
            break;
          case Filtering.INPUTS.select:
            input.options.forEach(option => {
              const opt = document.createElement('option');
              opt.value = option;
              opt.textContent = option;
              el.appendChild(opt);
            });
            break;

          case Filtering.INPUTS.oneOf:
            el = document.createElement('span');
            input.options.forEach(opt => {
              const radio = document.createElement('input');
              radio.type = 'radio';
              radio.name = input.var;
              radio.value = opt;
              if (opt === input.selected) {
                radio.checked = true;  
              }
              el.appendChild(radio);
              let spn = document.createElement('span');
              spn.classList.add('radio-option');
              spn.textContent = opt;
              el.appendChild(spn);
            });
            break;
          case Filtering.INPUTS.manyOf:
            el = document.createElement('span');
            input.options.forEach(opt => {
              const check = document.createElement('input');
              check.type = 'checkbox';
              check.name = input.var;
              check.value = opt;
              if (opt === input.selected) 
                check.checked = true;  
              el.appendChild(check);
              let spn = document.createElement('span');
              spn.classList.add('check-option');
              spn.textContent = opt;
              el.appendChild(spn);
            });
            break;
        }

        if (input.when) {
          // only visible when the named input has one of the values
          delayed.push(((when,  varName, values) => {
            // an iife to setup the inputs
            return () => {
              // disable the target(s) when the selected option 
              // does not match any item in values
              const inputs = this.#getInputsForVariable(when);
              const targets = this.#getInputsForVariable(varName);
              inputs.forEach(elm => {
                elm.addEventListener('change', () => {
                  const enabled = values.includes(this.#getValueForVariable(when)); 
                  targets.forEach(t => t.disabled = !enabled);
                });
              });

              // set the default
              const curValue = this.#getValueForVariable(when);
              if (!values.includes(curValue)) {
                targets.forEach(t => t.disabled = true);
              }
            }
          })(input.when, input.var, input.is));
        }

        label.appendChild(el);

        if (input.suffix) {
          const sufSpan = document.createElement("span");
          sufSpan.textContent = input.suffix;
          label.appendChild(sufSpan);
        }

        if (input.type === Filtering.INPUTS.slider) {
            const vis = document.createElement('span');
            vis.classList.add('slider-val');
            vis.textContent = input.val;
            el.addEventListener('input', e => {
              vis.textContent = e.target.value;
            });
            el.after(vis);
        }

        i.appendChild(label);
        tool.appendChild(i);

        while(delayed.length > 0) {
          delayed.shift()();
        }
      });
    }

    btn.addEventListener('click', this.#filterFn);
  }

  /**
   * Load a sprite into the Grid
   * @param {Event} e - File event
   * @returns 
   */
  async #loadSprite(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const bmp = await createImageBitmap(file);
      const off = document.createElement('canvas');
      off.width = this.#grid.cellsX;
      off.height = this.#grid.cellsY;
      const octx = off.getContext('2d');
      octx.imageSmoothingEnabled = false;
      octx.drawImage(bmp, 0, 0, off.width, off.height);
      this.#grid.loadContentsFromImage(octx.getImageData(0, 0, off.width, off.height));
      bmp.close();
      this.refreshPreview();
    } catch (err) {
      console.error('Failed to load image:', err);
    } finally {
      e.target.value = '';
    }
  }

  #setForegroundColor(color) {
    this.#grid.foregroundColor = color;
    this.#makePreviousColorBox(this.#grid.foregroundColor);
  }

  #setBackgroundColor(color) {
    this.#grid.backgroundColor = color;
  }

  #makePreviousColorBox(color) {
    color = ColorUtil.color8Hex(color);
    if (this.#previousColors.includes(color)) return;

    const prevColors = document.getElementById('previous-colors');
    const newSwatch = document.createElement('div');
    newSwatch.classList.add('color-swatch');
    newSwatch.style.backgroundColor = color;
    prevColors.appendChild(newSwatch);
    newSwatch.addEventListener('click', () => {
      document.getElementById('fg').value = color;
      this.#grid.foregroundColor = color;
    });

    this.#previousColors.push(color);
  }

  #switchTab(label, tabId) {
    const editorTabs = document.getElementById('editor-tabs');
    editorTabs.querySelector('label.selected').classList.remove('selected');
    editorTabs.querySelector('div.tab.visible').classList.remove('visible');
    label.classList.add('selected');
    document.getElementById(tabId).classList.add('visible');
  }

  /**
   * Wire up the user interface elements.
   */
  #wireUI() {
        // ---- colors ----
    const fgInput = document.getElementById('fg');
    fgInput.title = fgInput.value;
    const bgInput = document.getElementById('bg');
    bgInput.title = bgInput.value;
    fgInput.addEventListener('change', () => { this.#setForegroundColor(fgInput.value); fgInput.title = fgInput.value; });
    bgInput.addEventListener('change', () => { this.#setBackgroundColor(bgInput.value); bgInput.title = bgInput.value; });
    const fgAlpha = document.getElementById('fg-alpha');
    const bgAlpha = document.getElementById('bg-alpha');
    fgAlpha.addEventListener('change', () => { this.#grid.foregroundAlpha = fgAlpha.value; });
    bgAlpha.addEventListener('change', () => { this.#grid.backgroundAlpha = bgAlpha.value; });

    // ---- zoom ----
    document.getElementById('zoomIn').addEventListener('click', () => this.#grid.zoomIn());
    document.getElementById('zoomOut').addEventListener('click', () => this.#grid.zoomOut());
    document.getElementById('zoomReset').addEventListener('click', () => this.#grid.resetZoom());

    // ---- grid size ----
    const cellsInput = document.getElementById('cells');
    document.getElementById('applyCells').addEventListener('click', () => {
      const n = parseInt(cellsInput.value, 10);
      if (n >= 1) {
        this.#grid.setCells(n, n);
        this.refreshPreview();
      }
    });

    // ---- clear grid ----
    document.getElementById('clearGrid').addEventListener('click', () => {
      this.#grid.clear();
      this.refreshPreview();
    });

    // ---- load sprite ----
    document.getElementById('load').addEventListener('change', (e) => { this.#loadSprite(e); });

    // ---- export PNG ----
    document.getElementById('export').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = this.#grid.toDataURL('image/png');
      a.download = 'sprite.png';
      a.click();
    });

    // ---- hover readout ----
    const hoverEl = document.getElementById('hover');
    this.#editorEl.addEventListener('mousemove', () => {
      if (this.#grid.hoveredX === null) {
        hoverEl.innerHTML = 'hover: &mdash;';
      } else {
        hoverEl.textContent =
          `hover: (${this.#grid.hoveredX}, ${this.#grid.hoveredY})  ` +
          (this.#grid.hoveredColor !== null ? this.#grid.hoveredColor : 'background');
      }
    });
    this.#editorEl.addEventListener('mouseleave', () => { hoverEl.innerHTML = 'hover: &mdash;'; });

    const previewSizes = document.querySelectorAll('#preview-sizes button');
    previewSizes.forEach(el => {
      el.addEventListener('click', () => {
        this.#previewEl.style.width = `${el.id.substring(5)}px`;
        this.#previewEl.style.height = `${el.id.substring(5)}px`;
      });
    });

    //-------- tabs -------------
    document.getElementById('editor-tabs').querySelectorAll('div.tabs label').forEach(label => {
      label.addEventListener('click', () => this.#switchTab(label, `editor-${label.textContent.toLowerCase()}`));
    });

    //=======================
    // Keyboard handlers

    window.addEventListener('keydown', (e) => { this.triggerHandler('keyDown', e.key, e.code); })
    window.addEventListener('keyup', (e) => { this.triggerHandler('keyUp', e.key, e.code); })
    window.addEventListener('keypress', (e) => { this.triggerHandler('keyPress', e.key, e.code); })
  }

  /**
   * Binds the grid changes to the preview to keep them in sync.
   */
  #bindPreview() {
    // Refresh preview whenever the grid changes (paint, load, resize).
    const origFill = this.#grid.fillCell.bind(this.#grid);
    const origClearCell = this.#grid.clearCell.bind(this.#grid);
    const origClear = this.#grid.clear.bind(this.#grid);
    const origLoad = this.#grid.loadContentsFromImage.bind(this.#grid);
    const origSetCells = this.#grid.setCells.bind(this.#grid);
    this.#grid.fillCell = (x, y, c) => { origFill(x, y, c); this.refreshPreview(); };
    this.#grid.clearCell = (x, y) => { origClearCell(x, y); this.refreshPreview(); };
    this.#grid.clear = () => { origClear(); this.refreshPreview(); };
    this.#grid.loadContentsFromImage = (src, doClear) => { origLoad(src, doClear); this.refreshPreview(); };
    this.#grid.setCells = (x, y) => { origSetCells(x, y); this.refreshPreview(); };
  }

};
