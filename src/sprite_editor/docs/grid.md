# A Grid for Editing Pixel Data
Create JavaScript class that implements a grid. It should use the CanvasAPI for drawing, and use the mouse for interaction. The grid will represents a magnified view of whatever is being drawn, which are usually sprite images (pixel-based). Each cell in the grid represents 1 pixel in the final output image. The user can click on any cell to edit its color, and the changes will be reflected in the final output image. The grid should also have a feature to zoom in or out, allowing the user to see more or less detail in the final output image. The class should include methods to fill a cell in the current "foreground color", clear a cell using the current "background color", and draw the entire grid on the canvas.

## User Input
The user can position the mouse over an cell in the grid. When the mouse cursor is hovered over a cell, if it is filled with a non-background color, the grid will have a property that represents the color of that cell, and two others that represent which cell in X and Y. When the user left-clicks the cell will be filled with the current foreground color. When the user right-clicks the cell will be cleared using the current background color. The foreground and background colors will be provided to the Grid at runtime in properties of the grid.

## Grid Output
The grid should have a property that represents the current bitmap of whatever the grid shows at 1 pixel per grid cell. So, if the grid is 16 grid cells wide by 16 grid cells high, the grid will have a property containing an image 16x16 pixels with the pixels matching what is in the grid cells 1 for 1. This is the "preview image" whild the grid is the "editor".

## Coding It
The following is the skeleton of the Grid - fill in the missing pieces to make it functional. Add methods where necessary. Feel free to suggest changes as well.

```javascript
class Grid {
  static BACKGROUND_COLOR = -1;
  
  // default to 16x16
  #cellsX = 16;
  #cellsY = 16;

  #gridWidth = 500;
  #gridHeight = 500;

  #cellSizeX;
  #cellSizeY;

  #cellContents;
  #forgroundColor;
  #backgroundColor;

  #preview = null;

  /**
   * Create a new grid with the given width and height, and the number of cell divisions along x and y
   */
  constructor(gridWidth, gridHeight, cellsX, cellsY) {
    this.#gridWidth = gridWidth;
    this.#gridHeight = gridHeight;
    this.setCells(cellsX, cellsY);
  }

  /**
   * Get the preview image that represents what is being edited in the Grid
   */
  get previewImage() {
    return this.#preview.getImageData(0, 0, this.#cellsX, this.#cellsY);
  }

  /**
   * Set the cells of the grid - this can change at any time, but changing
   * it also clears the contents in the grid.
   */
  setCells(cX, cY) {
    this.#cellsX = cX;
    this.#cellsY = cY;
    this.#cellSizeX = this.#gridWidth / cX;
    this.#cellSizeY = this.#gridHeight / cY;
    this.initialize();
  }

  /**
   * Initialize the grid before use
   */
  initialize() {
    this.createPreview();
    this.clear();
  }

  /**
   * Load the contents of a grid from an image data object
   */
  loadContentsFromImage(imgData) {
    this.initialize();
    for (let x = 0; x < imgData.width; x++) {
      for (let y = 0; y < imageData.height; y++) {
        this.#cellContents[y][x] = imgData.data[x + (y * imgData.width)];
      }
    }

    // update the grid and preview with the new image
    this.drawContentsToGrid();
    this.updatePreview();
  }

  /**
   * Creates a new preview offscreen canvas
   */
  createPreview() {
    const previewCanvas = new OffscreenCanvas(this.#cellsX, this.#cellsY);
    this.#preview = previewCanvas.getContext('2d');
  }

  /**
   * Clear all of the cells back to the background color
   */
  clear() {
    this.#cellContents = new Array(this.#cellsY).fill(null);
    this.#cellContents.forEach(row => {
      row = new Array(this.#cellsX).fill(Grid.BACKGROUND_COLOR);
    });
    this.updatePreview();
  }

  /**
   * Fill a cell with the color given
   */
  fillCell(x, y, color) {
    this.#cellContents[y][x] = color;
    this.updatePreview();
  }

  /**
   * Set the cell to the background color
   */
  clearCell(x, y) {
    this.#cellContents[y][x] = Grid.BACKGROUND_COLOR;
    this.updatePreview();
  }

  /**
   * Draw the contents of the grid to the canvas display of the grid.
   */
  drawContentsToGrid() {
    this.#cellContents.forEach((row, y) => {
      row.forEach((content, x) => {
        if (content !== Grid.BACKGROUND_COLOR) {
          // fill the grid cell with color at position (x, y)
        } else {
          // clear the grid cell at position (x, y) with the background color
        }
      });
    });
  }

  /**
   * Redraws the preview image with the contents of the grid
   */
  updatePreview() {
    this.#preview.clearRect(0, 0, this.#cellsX, this.#cellsY);
    for (let y = 0; y < this.#cellsY; y++) {
      for (let x = 0; x < this.#cellsX; x++) {
        const fill = this.#cellContents[y][x];
        if (fill === Grid.BACKGROUND_COLOR) continue;
        
        // set the fill color to the current cell's color
        this.#preview.fillColor = this.#cellContents[y][x];
        this.#preview.fillRect(x, y, 1, 1); 
      }
    }
  }
}
```