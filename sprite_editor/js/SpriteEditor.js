import Grid from './Grid.js';
import DefaultPlugin, { DefaultPaint, DefaultErase } from './Default.js';

export default class SpriteEditor {
  static #instance = null;

  #previewCtx;
  #previewEl;
  #editorEl;
  #grid;

  #plugins = new Map();
  #enabledPlugin;

  #actionHandlers = new Map();

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
    this.#previewCtx = previewEl.getContext('2d');
    this.#previewCtx.imageSmoothingEnabled = false;
    this.#grid = new Grid(this, editorEl.width, editorEl.height, 16, 16, editorEl);
    
    this.#setupEvents();

    // add the default plugins
    this.addPlugin(new DefaultPaint());
    this.addPlugin(new DefaultErase());

    // get everything ready
    this.#wireUI();
    this.#bindPreview();
    this.refreshPreview();
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
    ['mouseDown', 'mouseUp', 'mouseLeave', 'mouseMove', 'contextMenu'].forEach(e => {
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

  addPlugin(plugin) {
    this.#plugins.set(plugin.name, plugin);
    plugin.activate(this);
  }

  enablePlugin(plugin) {
    this.#enabledPlugin?.disabled();
    this.#enabledPlugin = plugin;
    plugin.enabled();
  }

  addHandler(plugin, handlerName, fn) {
    this.#actionHandlers.get(handlerName).push({ p: plugin, f: fn });
  }

  triggerHandler(handlerName, ... args) {
    this.#actionHandlers.get(handlerName).forEach(h => { if (h.p.isEnabled) h.f(...args); });
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

  /**
   * Wire up the user interface elements.
   */
  #wireUI() {
        // ---- colors ----
    const fgInput = document.getElementById('fg');
    const bgInput = document.getElementById('bg');
    fgInput.addEventListener('input', () => { this.#grid.foregroundColor = fgInput.value; });
    bgInput.addEventListener('input', () => { this.#grid.backgroundColor = bgInput.value; });

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