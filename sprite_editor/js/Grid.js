import ColorUtil from '../../src/engine/core/util/ColorUtil.js';

/**
 * Grid - a pixel-editor grid backed by the Canvas API.
 *
 * The Grid is a magnified view of a small image (typically a sprite).
 * Each grid cell represents exactly one pixel of the final output image.
 *
 * Interaction:
 *   - Hover over a cell: exposed via `hoveredX`, `hoveredY`, `hoveredColor`
 *     (hoveredColor is null when the cell is background).
 *   - Left click / left drag: fills the cell with the foreground color.
 *   - Right click / right drag: clears the cell (background color).
 *
 * Output:
 *   - `previewCanvas` / `previewImage`: a 1:1 image of the grid contents
 *     (cellsX x cellsY pixels, one pixel per cell).
 *
 * Colors are stored as any CSS color string (e.g. "#ff8800"). A cell that
 * has not been painted holds the sentinel Grid.BACKGROUND_COLOR.
 */
export default class Grid {
  /** Sentinel value stored in a cell that has not been painted. */
  static BACKGROUND_COLOR = -1;

  /** Smallest cell size (px) allowed when zooming out. */
  static MIN_CELL_SIZE = 2;

  /** Largest cell size (px) allowed when zooming in. */
  static MAX_CELL_SIZE = 512;

  static ACTIONS = {
    none: 0,
    painting: 1,
    erasing: 2,
    loading: 3,
    saving: 4,
    zoomIn: 5,
    zoomOut: 6
  };


  // ---- geometry -------------------------------------------------------
  #cellsX = 16;
  #cellsY = 16;
  #gridWidth = 500;
  #gridHeight = 500;
  #cellSizeX = 0;
  #cellSizeY = 0;

  // ---- contents & colors ---------------------------------------------
  #cellContents = [];
  #foregroundColor = '#ffffff';
  #foregroundAlpha = 1.0;
  #backgroundColor = '#000000';
  #backgroundAlpha = 0.0;

  // ---- canvas & preview -----------------------------------------------
  #canvas = null;
  #ctx = null;
  #preview = null; // 2d context of the offscreen preview canvas

  // ---- mouse state ------------------------------------------------------
  #hoverX = null;
  #hoverY = null;
  #hoverColor = null;
  #painting = null; // 'fill' | 'clear' | null (while a button is held down)

  #currentAction = Grid.ACTIONS.none;
  #editorInst;

  /**
   * Create a new grid with the given display size and the number of cell
   * divisions along x and y. Optionally attach a canvas immediately.
   */
  constructor(spriteEditor, gridWidth = 500, gridHeight = 500, cellsX = 16, cellsY = 16, canvas = null) {
    this.#editorInst = spriteEditor;
    this.#gridWidth = gridWidth;
    this.#gridHeight = gridHeight;
    this.setCells(cellsX, cellsY);
    if (canvas) this.attachCanvas(canvas);
  }

  /**
   * Get the SpriteEditor for this Grid
   */
  get editor() {
    return this.#editorInst;
  }

  // =====================================================================
  // Geometry
  // =====================================================================

  get cellsX() {
    return this.#cellsX;
  }

  get cellsY() {
    return this.#cellsY;
  }

  /**
   * Set the number of cells in the grid. Changing it also clears the
   * contents of the grid.
   */
  setCells(cX, cY) {
    this.#cellsX = Math.max(1, Math.floor(cX));
    this.#cellsY = Math.max(1, Math.floor(cY));
    this.#cellSizeX = this.#gridWidth / this.#cellsX;
    this.#cellSizeY = this.#gridHeight / this.#cellsY;
    this.initialize();
    this.draw();
  }

  // =====================================================================
  // Colors (settable at runtime)
  // =====================================================================

  /** The color used when a cell is filled (left click). */
  get foregroundColor() {
    return this.#foregroundColor;
  }

  set foregroundColor(value) {
    if (typeof value === 'string' && value.length > 0) {
      this.#foregroundColor = this.#mixAlpha(value, this.#foregroundAlpha);
      this.draw();
    }
  }

  /** The color shown in "cleared" cells (right click). */
  get backgroundColor() {
    return this.#backgroundColor;
  }

  set backgroundColor(value) {
    if (typeof value === 'string' && value.length > 0) {
      this.#backgroundColor = this.#mixAlpha(value, this.#backgroundAlpha);
      this.draw();
    }
  }

  get foreroundAlpha() {
    return this.#foregroundAlpha;
  }

  set foregroundAlpha(value) {
    this.#foregroundAlpha = value;  
  }

  get backgroundAlpha() {
    return this.#backgroundAlpha;
  }

  set backgroundAlpha(value) {
    this.#backgroundAlpha = value;
  }

  #mixAlpha(hexColor, alpha) {
    return ColorUtil.setAlpha(alpha, hexColor);
  }

  // =====================================================================
  // Hover state (updated on mousemove)
  // =====================================================================

  /** X coordinate (column) of the cell under the cursor, or null. */
  get hoveredX() {
    return this.#hoverX;
  }

  /** Y coordinate (row) of the cell under the cursor, or null. */
  get hoveredY() {
    return this.#hoverY;
  }

  /**
   * Color of the cell under the cursor, or null when the cell is
   * background (or the cursor is outside the grid).
   */
  get hoveredColor() {
    return this.#hoverColor;
  }

  // =====================================================================
  // Actions
  // =====================================================================
  set action(action) {
    this.#currentAction = action;
  }

  get action() {
    return this.#currentAction;
  }

  // =====================================================================
  // Contents
  // =====================================================================

  /**
   * Get the stored color of a cell. Returns Grid.BACKGROUND_COLOR for
   * unpainted cells, and null for out-of-bounds coordinates.
   */
  getCellColor(x, y) {
    if (!this.#inBounds(x, y)) return null;
    return this.#cellContents[y][x];
  }

  /**
   * Fill a cell with the given color. Out-of-bounds calls are ignored.
   */
  fillCell(x, y, color) {
    if (!this.#inBounds(x, y)) return;
    if (color === Grid.BACKGROUND_COLOR) {
      this.clearCell(x, y);
      return;
    }
    this.#cellContents[y][x] = color;
    this.#redraw();
  }

  /**
   * Fill a cell with the current foreground color.
   */
  paintCell(x, y) {
    this.fillCell(x, y, this.#foregroundColor);
  }

  /**
   * Set the cell to the background color.
   */
  clearCell(x, y) {
    if (!this.#inBounds(x, y)) return;
    this.#cellContents[y][x] = Grid.BACKGROUND_COLOR;
    this.#redraw();
  }

  /**
   * Clear all of the cells back to the background color.
   */
  clear() {
    this.#cellContents = Array.from({ length: this.#cellsY }, () =>
      new Array(this.#cellsX).fill(Grid.BACKGROUND_COLOR)
    );
    this.editor.triggerHandler('clearGrid');
    this.#redraw();
  }

  /**
   * Load the contents of the grid from image data (an ImageData object, or
   * any canvas element). Pixels outside the grid are ignored, and fully
   * transparent pixels are treated as background.
   */
  loadContentsFromImage(source) {
    let imgData = source;
    if (!imgData || !imgData.data) {
      // Accept a canvas element as well as a raw ImageData object.
      imgData = source.getContext('2d').getImageData(0, 0, source.width, source.height);
    }

    this.editor.triggerHandler('loadSprite', source, imgData);

    this.clear();

    const w = Math.min(imgData.width, this.#cellsX);
    const h = Math.min(imgData.height, this.#cellsY);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * imgData.width + x) * 4;
        this.#cellContents[y][x] = this.#rgbaToHex(
          imgData.data[i],
          imgData.data[i + 1],
          imgData.data[i + 2],
          imgData.data[i + 3]
        );
      }
    }

    this.editor.triggerHandler('spriteLoaded');

    // Update the grid and preview with the new image.
    this.#redraw();
  }

  // =====================================================================
  // Preview (the 1:1 "output image")
  // =====================================================================

  /** The offscreen canvas holding the 1:1 preview image. */
  get previewCanvas() {
    return this.#preview ? this.#preview.canvas : null;
  }

  /**
   * The preview image that represents what is being edited in the Grid:
   * cellsX x cellsY ImageData, one pixel per grid cell.
   */
  get previewImage() {
    return this.#preview.getImageData(0, 0, this.#cellsX, this.#cellsY);
  }

  /**
   * Export the preview as a data URL (e.g. for a PNG download link).
   */
  toDataURL(type = 'image/png') {
    this.editor.triggerHandler('saveSprite');

    const out = document.createElement('canvas');
    out.width = this.#cellsX;
    out.height = this.#cellsY;
    out.getContext('2d').putImageData(this.previewImage, 0, 0);
    const dataUrl = out.toDataURL(type);

    this.editor.triggerHandler('spriteSaved');
    return dataUrl;
  }

  // =====================================================================
  // Drawing
  // =====================================================================

  /**
   * Initialize the grid before use.
   */
  initialize() {
    this.createPreview();
    this.clear();
  }

  /**
   * Create a new preview offscreen canvas.
   */
  createPreview() {
    let previewCanvas;
    if (typeof OffscreenCanvas !== 'undefined') {
      previewCanvas = new OffscreenCanvas(this.#cellsX, this.#cellsY);
    } else {
      previewCanvas = document.createElement('canvas');
      previewCanvas.width = this.#cellsX;
      previewCanvas.height = this.#cellsY;
    }
    this.#preview = previewCanvas.getContext('2d', {
        alpha: false,
        colorType: 'float16',
        willReadFrequently: true
      });
  }

  /**
   * Draw the entire grid on its canvas: cell contents, grid lines, and the
   * hover highlight.
   */
  draw() {
    if (!this.#ctx) return;
    const ctx = this.#ctx;
    const canvas = this.#canvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawContentsToGrid();

    // Grid lines.
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= this.#cellsX; x++) {
      const px = Math.round(x * this.#cellSizeX) + 0.5;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, this.#gridHeight);
    }
    for (let y = 0; y <= this.#cellsY; y++) {
      const py = Math.round(y * this.#cellSizeY) + 0.5;
      ctx.moveTo(0, py);
      ctx.lineTo(this.#gridWidth, py);
    }
    ctx.stroke();

    // Hover highlight: a high-contrast double outline.
    if (this.#hoverX !== null) {
      const hx = this.#hoverX * this.#cellSizeX;
      const hy = this.#hoverY * this.#cellSizeY;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.strokeRect(hx + 1.5, hy + 1.5, this.#cellSizeX - 3, this.#cellSizeY - 3);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeRect(hx + 1.5, hy + 1.5, this.#cellSizeX - 3, this.#cellSizeY - 3);
    }
    ctx.restore();
  }

  /**
   * Draw the contents of the grid to the canvas display of the grid.
   */
  drawContentsToGrid() {
    if (!this.#ctx) return;
    const ctx = this.#ctx;

    // Overdraw by 1px so anti-aliased gaps never show between cells.
    const w = Math.ceil(this.#cellSizeX);
    const h = Math.ceil(this.#cellSizeY);

    ctx.save();
    for (let y = 0; y < this.#cellsY; y++) {
      for (let x = 0; x < this.#cellsX; x++) {
        const content = this.#cellContents[y][x];
        ctx.fillStyle = content === Grid.BACKGROUND_COLOR
          ? this.#backgroundColor
          : content;
        ctx.fillRect(x * this.#cellSizeX, y * this.#cellSizeY, w, h);
      }
    }
    ctx.restore();
  }

  /**
   * Redraw the preview image with the contents of the grid (1px per cell).
   */
  updatePreview() {
    if (!this.#preview) return;
    this.#preview.clearRect(0, 0, this.#cellsX, this.#cellsY);
    for (let y = 0; y < this.#cellsY; y++) {
      for (let x = 0; x < this.#cellsX; x++) {
        const fill = this.#cellContents[y][x];
        if (fill === Grid.BACKGROUND_COLOR) continue;

        this.#preview.fillStyle = fill;
        this.#preview.fillRect(x, y, 1, 1);
      }
    }
  }

  /** Redraw both the on-screen grid and the 1:1 preview. */
  #redraw() {
    this.updatePreview();
    this.draw();
  }

  // =====================================================================
  // Zoom
  // =====================================================================

  /**
   * Zoom by a factor. factor > 1 zooms in (bigger cells, more detail),
   * factor < 1 zooms out. The cell count (and therefore the size of the
   * output image) does not change. Returns true if the zoom was applied.
   */
  zoom(factor = 1) {
    if (!(factor > 0)) return false;

    const maxW = Math.min(this.#cellsX * Grid.MAX_CELL_SIZE, this.#canvas ? this.#canvas.width : Infinity);
    const maxH = Math.min(this.#cellsY * Grid.MAX_CELL_SIZE, this.#canvas ? this.#canvas.height : Infinity);
    const minW = this.#cellsX * Grid.MIN_CELL_SIZE;
    const minH = this.#cellsY * Grid.MIN_CELL_SIZE;

    this.#gridWidth = Math.min(maxW, Math.max(minW, this.#gridWidth * factor));
    this.#gridHeight = Math.min(maxH, Math.max(minH, this.#gridHeight * factor));
    this.#cellSizeX = this.#gridWidth / this.#cellsX;
    this.#cellSizeY = this.#gridHeight / this.#cellsY;

    this.draw();
    return true;
  }

  /** Zoom in by 25%. */
  zoomIn(factor = 1.25) {
    this.editor.triggerHandler('zoomIn', factor);
    return this.zoom(factor);
  }

  /** Zoom out by 20%. */
  zoomOut(factor = 0.8) {
    this.editor.triggerHandler('zoomOut', factor);
    return this.zoom(factor);
  }

  /** Reset the zoom so the grid fills the attached canvas again. */
  resetZoom() {
    if (!this.#canvas) return false;
    this.#gridWidth = this.#canvas.width;
    this.#gridHeight = this.#canvas.height;
    this.#cellSizeX = this.#gridWidth / this.#cellsX;
    this.#cellSizeY = this.#gridHeight / this.#cellsY;

    this.editor.triggerHandler('zoomReset');

    this.draw();
    return true;
  }

  // =====================================================================
  // Canvas attachment & mouse handling
  // =====================================================================

  /**
   * Attach the grid to a canvas element and enable mouse interaction.
   */
  attachCanvas(canvas) {
    this.detachCanvas();
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');

    canvas.addEventListener('mousemove', this.#onMouseMove);
    canvas.addEventListener('mousedown', this.#onMouseDown);
    canvas.addEventListener('mouseleave', this.#onMouseLeave);
    canvas.addEventListener('contextmenu', this.#onContextMenu);
    window.addEventListener('mouseup', this.#onMouseUp);

    // Never let the grid display larger than the canvas itself.
    this.#gridWidth = Math.min(this.#gridWidth, canvas.width);
    this.#gridHeight = Math.min(this.#gridHeight, canvas.height);
    this.#cellSizeX = this.#gridWidth / this.#cellsX;
    this.#cellSizeY = this.#gridHeight / this.#cellsY;

    this.draw();
  }

  /**
   * Detach from the canvas and remove all mouse listeners.
   */
  detachCanvas() {
    if (!this.#canvas) return;
    const canvas = this.#canvas;
    canvas.removeEventListener('mousemove', this.#onMouseMove);
    canvas.removeEventListener('mousedown', this.#onMouseDown);
    canvas.removeEventListener('mouseleave', this.#onMouseLeave);
    canvas.removeEventListener('contextmenu', this.#onContextMenu);
    window.removeEventListener('mouseup', this.#onMouseUp);
    this.#canvas = null;
    this.#ctx = null;
  }

  /**
   * Map a mouse event to a grid cell. Returns {x, y} or null when the
   * cursor is outside the grid (also accounts for CSS-scaled canvases).
   */
  #cellAtEvent(e) {
    if (!this.#canvas) return null;
    const rect = this.#canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const scaleX = this.#canvas.width / rect.width;
    const scaleY = this.#canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    if (px < 0 || py < 0 || px >= this.#gridWidth || py >= this.#gridHeight) {
      return null;
    }

    const x = Math.floor(px / this.#cellSizeX);
    const y = Math.floor(py / this.#cellSizeY);
    return this.#inBounds(x, y) ? { x, y } : null;
  }

  #onMouseMove = (e) => {
    const cell = this.#cellAtEvent(e);
    if (!cell) {
      this.#hoverX = null;
      this.#hoverY = null;
      this.#hoverColor = null;
    } else {
      this.#hoverX = cell.x;
      this.#hoverY = cell.y;
      const content = this.#cellContents[cell.y][cell.x];
      this.#hoverColor = content === Grid.BACKGROUND_COLOR ? null : content;
    }

    this.editor.triggerHandler('mouseMove', this.hoveredX, this.hoveredY);
    this.draw();
  };

  #onMouseDown = (e) => {
    const cell = this.#cellAtEvent(e);
    if (!cell) return;
    if (e.button === 0) {
      this.editor.triggerHandler('mouseDown', 'left', this.#hoverX, this.#hoverY);
    } else if (e.button === 2) {
      this.editor.triggerHandler('mouseDown', 'right', this.#hoverX, this.#hoverY);
    } else {
      return;
    }
  };

  #onMouseUp = () => {
    this.editor.triggerHandler('mouseUp');
  };

  #onMouseLeave = () => {
    this.#hoverX = null;
    this.#hoverY = null;
    this.#hoverColor = null;

    this.editor.triggerHandler('mouseLeave');
    this.draw();
  };

  #onContextMenu = (e) => {
    e.preventDefault();
    this.editor.triggerHandler('contextMenu', e);
  };

  // =====================================================================
  // Helpers
  // =====================================================================

  #inBounds(x, y) {
    return Number.isInteger(x) && Number.isInteger(y) &&
      x >= 0 && y >= 0 && x < this.#cellsX && y < this.#cellsY;
  }

  /**
   * Convert RGBA bytes to a hex color string. Fully transparent pixels
   * become the background sentinel.
   */
  #rgbaToHex(r, g, b, a) {
    if (a === 0) return Grid.BACKGROUND_COLOR;
    const h = (v) => v.toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`;
  }
}
