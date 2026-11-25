import Grid from './Grid.js';
import DefaultToolbarButton, { DefaultPaint, DefaultErase, DefaultUndo } from './Default.js';
import ColorUtil from '../../src/engine/core/util/ColorUtil.js';
export default class SpriteEditor {
  static #instance = null;

  #previewCtx;
  #previewEl;
  #editorEl;
  #grid;

  #plugins = new Map();
  #enabledPlugin;

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
    const firstPlugin = new DefaultPaint();
    this.addPlugins(firstPlugin, new DefaultErase(), new DefaultUndo());

    // get everything ready
    this.#wireUI();
    this.#bindPreview();
    this.refreshPreview();
    this.enablePlugin(firstPlugin);
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
    return this.#enabledPlugin;
  }

  #setupEvents() {
    ['mouseDown', 'mouseUp', 'mouseLeave', 'mouseMove', 'contextMenu', 
      'clearGrid', 'loadSprite', 'spriteLoaded', 'saveSprite', 'spriteSaved',
      'zoomIn', 'zoomOut', 'zoomReset']
     .forEach(e => {
      this.#actionHandlers.set(e, []);
    })
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
    const pluginClass = await import(new URL(`./plugins/${pluginFile}`, import.meta.url));
    const plugin = new pluginClass.default();
    this.addPlugin(plugin);
  }

  addPlugins(...plugins) {
    plugins.forEach(plugin => this.addPlugin(plugin));
  }

  addPlugin(plugin) {
    this.#plugins.set(plugin.name, plugin);
    plugin.activate(this);
  }

  enablePlugin(plugin) {
    if (!plugin.options.momentary) {
      // if the plugin should stay on, replace the previous plugin
      this.#enabledPlugin?.disabled();
      this.#enabledPlugin = plugin;
    }

    // only change action when not "none"
    if (plugin.action !== Grid.ACTIONS.none)
      this.grid.action = plugin.action;

    plugin.enabled();
  }

  addHandler(plugin, handlerName, fn) {
    const handlers = this.#actionHandlers.get(handlerName);
    handlers.push({ p: plugin, f: fn });
    this.#actionHandlers.set(handlerName, handlers.sort((a, b) => (b.p.options.priority || 0.5) - (a.p.options.priority || 0.5)));
  }

  triggerHandler(handlerName, ... args) {
    const handlers = this.#actionHandlers.get(handlerName);
    if (handlers) {
      handlers.forEach(h => { 
        if (h.p.isEnabled || (h.p.options.always && h.p.options.always.includes(handlerName))) 
          h.f(...args); 
      });
    }
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
    if (color !== this.#grid.foregroundColor)
      this.#makePreviousColorBox(this.#grid.foregroundColor);

    this.#grid.foregroundColor = color;
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
    this.#grid.loadContentsFromImage = (src) => { origLoad(src); this.refreshPreview(); };
    this.#grid.setCells = (x, y) => { origSetCells(x, y); this.refreshPreview(); };
  }

};