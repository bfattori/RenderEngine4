import SpriteEditor from './SpriteEditor.js';
import Grid from './Grid.js';

export default class DefaultToolbarButton {
  #pluginName;
  #description;
  
  #loaded = false;
  #enabled = false;
  #editor;
  #button;
  
  constructor(name = 'Default Button', description = 'This is the default toolbar button') {
    this.#pluginName = name;
    this.#description = description;
  }

  /**
   * Adds the button to the toolbar and wires the event
   */
  #addToToolbar() {
    this.#button = document.createElement('button');
    this.#button.classList.add('icon-btn');
    this.#button.title = this.description;
    const img = document.createElement('img');
    img.src=`${this.icon}`;
    img.alt=`${this.name}`; 
    img.width='24';
    img.height='24';
    this.#button.appendChild(img);
    this.#button.addEventListener('click', () => {
      this.spriteEditor.enablePlugin(this);
    });
    
    this.#editor.pluginToolbar.appendChild(this.#button);
  }

  /**
   * Returns the name of the button
   * @returns {String}
   */
  get name() {
    return this.#pluginName;
  }

  /**
   * Returns the description of the button
   * @return {String}
   */
  get description() {
    return this.#description;
  }

  /**
   * Returns the name of the icon for the button
   * @return {String}
   */
  get icon() {
    return '/sprite_editor/img/icons/';
  }

  /**
   * The action the button will perform when enabled
   * @return {Grid.ACTIONS} - The action to be performed
   */
  get action() {
    return Grid.ACTIONS.none;
  }

  /**
   * Returns `true` if the button was loaded
   */
  get isLoaded() {
    return this.#loaded;
  }

  /**
   * Returns the `SpriteEditor` instance associated with the button
   * @returns {SpriteEditor}
   */
  get spriteEditor() {
    return this.#editor;
  }

  /**
   * Generates the button in the toolbar
   * @returns {HTMLButtonElement}
   */
  get toobarButton() {
    return this.#button;
  }

  /**
   * Returns `true` if the button is enabled
   * @returns {boolean}
   */
  get isEnabled() {
    return this.#enabled;
  }

  /**
   * Returns an object with options to configure the behavior of SpriteEditor
   * and Grid.
   * @returns {Object}
   */
  get options() {
    return {};
  }

  /**
   * Activate the toolbar button and add it to the toolbar
   * @param {SpriteEditor} editor - The sprite editor that owns the toolbar
   */
  activate(editor) {
    this.#loaded = true;
    this.#editor = editor;
    this.#addToToolbar();
  }

  /**
   * Called when the plugin is enabled (selected in the toolbar)
   */
  enabled() {
    this.#button.classList.add('enabled');
    this.#enabled = true;
  }

  /**
   * Called when the toolbar button is no longer the selected one.
   */
  disabled() {
    this.#button.classList.remove('enabled');
    this.#enabled = false;
  }
}

class DefaultPaint extends DefaultToolbarButton {
  #painting = null;
  
  constructor() {
    super('PaintBrush', 'Paint cells with the foreground color');
  }
  
  get icon() {
    return super.icon + 'paintbrush.png';
  }

  activate(editor) {
    super.activate(editor);

    // register to handle events from the grid
    editor.addHandler(this, 'mouseDown', (button, x, y) => this.start(button, x, y));
    editor.addHandler(this, 'mouseUp', () => this.stop());
    editor.addHandler(this, 'mouseMove', (x, y) => this.paint(x, y));
    editor.addHandler(this, 'mouseLeave', () => this.stop());
  }

  //--------------------------------

  start(button, x, y) {
    if (button === 'left') {
      this.#painting = 'fill';
      this.spriteEditor.grid.action = Grid.ACTIONS.painting;
    } else {
      this.#painting = null;
      this.spriteEditor.grid.action = Grid.ACTIONS.none;
    }
    this.#applyPaint(x, y);
  }

  stop() {
    this.#painting = null;  
    this.spriteEditor.grid.action = Grid.ACTIONS.none;
  }

  paint(x, y) {
    // Continue painting while a button is held down.
    if (this.#painting !== null)
      this.#applyPaint(x, y);
  }

  /**
   * Apply the current paint mode to the hovered cell.
   */
  #applyPaint(x, y) {
    if (this.spriteEditor.grid.hoveredX === null || this.#painting === null) return;
    this.spriteEditor.grid.paintCell(x, y);
  }
}

class DefaultErase extends DefaultToolbarButton {
  #painting = null;
  
  constructor() {
    super('Eraser', 'Erase cells with the background color');
  }
  
  get icon() {
    return super.icon + 'eraser.png';
  }

  activate(editor) {
    super.activate(editor);

    // register to handle events from the grid
    editor.addHandler(this, 'mouseDown', (button, x, y) => this.start(button, x, y));
    editor.addHandler(this, 'mouseUp', () => this.stop());
    editor.addHandler(this, 'mouseMove', (x, y) => this.erase(x, y));
    editor.addHandler(this, 'mouseLeave', () => this.stop());
  }

  //--------------------------------

  start(button, x, y) {
    if (button === 'left') {
      this.#painting = 'clear';
      this.spriteEditor.grid.action = Grid.ACTIONS.erasing;
    } else {
      this.#painting = null;
      this.spriteEditor.grid.action = Grid.ACTIONS.none;
    }
    this.#applyErase(x, y);
  }

  stop() {
    this.#painting = null;  
  }

  erase(x, y) {
    // Continue erasing while a button is held down.
    if (this.#painting !== null) {
      this.#applyErase(x, y);
    }
  }

  /**
   * Erase the hovered cell.
   */
  #applyErase(x, y) {
    if (this.spriteEditor.grid.hoveredX === null || this.#painting === null) return;
    this.spriteEditor.grid.clearCell(x, y);
  }
}

class DefaultUndo extends DefaultToolbarButton {
  #capturing = false;
  #maxDepth = 10;
  #captures;
  #undoBuffer = [];
  #lastPoint = [-1, -1];

  #firstPoint = [0, 0];
  #firstColor = null;

  constructor() {
    super('Undo', 'Undo the last operation');
    this.#captures = [];
  }
  
  get icon() {
    return super.icon + 'undo.png';
  }
  
  get buffer() {
    return this.#undoBuffer;
  }

  set capturing(value) {
    this.#storeCurrentCapture(value);
  }

  get options() {
    return {
      priority: 1.0,
      momentary: true,
      always: ['mouseDown', 'mouseUp', 'mouseMove', 'mouseLeave', 'clearGrid']
    };
  }

  activate(editor) {
    super.activate(editor);

    // register to handle events from the grid
    editor.addHandler(this, 'mouseDown', (button, x, y) => { 
      if (button === 'left') { 
        this.capturing = true;
        this.#capture(x, y); 
      }
    });
    editor.addHandler(this, 'mouseMove', (x, y) => { this.#capture(x, y); });
    editor.addHandler(this, 'mouseUp', () => { this.capturing = false; });
    editor.addHandler(this, 'mouseLeave', () => { this.capturing = false; });
    editor.addHandler(this, 'clearGrid', () => { this.#undoBuffer.length = 0; this.#captures.length = 0; })
  }

  enabled() {
    super.enabled();
    this.#doUndo();
    this.disabled();
  }

  //--------------------------------

  #capture(x, y) {
    if (this.#lastPoint[0] === x && this.#lastPoint[1] === y)
      return;

    if (!this.#capturing) return;

    this.#lastPoint = [x, y];
    this.#capturing = true;

    if (!this.#firstColor) {
      this.#firstPoint = [x, y];
      this.#firstColor = this.spriteEditor.grid.getCellColor(x, y);
    }

    if (![Grid.ACTIONS.painting, Grid.ACTIONS.erasing].includes(this.spriteEditor.grid.action)) return;

    // capture the first point
    if (this.#firstColor) {
      const fExist = this.#undoBuffer.filter(p => p.pt[0] === this.#firstPoint[0] && p.pt[1] === this.#firstPoint[1]);
      if (fExist.length === 0) {
        this.#undoBuffer.push({
          pt: [].concat(this.#firstPoint),
          c: this.#firstColor
        });
        this.#firstColor = null;
      }
    }

    // don't overwrite
    const exists = this.#undoBuffer.filter(p => p.pt[0] === x && p.pt[1] === y);
    if (exists.length === 0)
      this.#undoBuffer.push({
        pt: [x, y],
        c: this.spriteEditor.grid.getCellColor(x, y)  // the priority of this plugin will capture the color *before* other operations
      });
  }

  #storeCurrentCapture(value) {
    if (this.#capturing && !value && this.#undoBuffer.length !== 0) {
      this.#captures.push([].concat(this.#undoBuffer));
      this.#undoBuffer.length = 0;
    }
    this.#capturing = value;
  }

  #doUndo() {
    if (this.#captures.length > 0) {
      const capture = this.#captures.pop();
      for (const undo of capture)
        this.spriteEditor.grid.fillCell(undo.pt[0], undo.pt[1], undo.c);
    }
  }
}

class DefaultShift extends DefaultToolbarButton {
  static LEFT = 0;
  static UP = 1;
  static RIGHT = 2;
  static DOWN = 3;

  #direction = DefaultShift.LEFT;

  constructor() {
    super('Shift', 'Shift the pixels in the grid left, right, up or down');
  }
  
  get icon() {
    return super.icon + 'shift.png';
  }

  get options() {
    return {
      momentary: true,
      always: ['keyDown']
    };
  }

  activate(editor) {
    super.activate(editor);

    // register to handle events
    editor.addHandler(this, 'keyDown', (key) => { this.#pressedKey(key); });
  }


  enabled() {
    super.enabled();
    this.#doShift();
    this.disabled();
  }

  //--------------------------------

  #pressedKey(key) {
    switch (key) {
      case 'ArrowLeft': this.#direction = DefaultShift.LEFT; break;
      case 'ArrowRight': this.#direction = DefaultShift.RIGHT; break;
      case 'ArrowDown': this.#direction = DefaultShift.DOWN; break;
      case 'ArrowUp': this.#direction = DefaultShift.UP; break;
    }
  }

  #doShift() {
    const cX = this.spriteEditor.grid.cellsX,
          cY = this.spriteEditor.grid.cellsY;

    let cells = this.spriteEditor.grid.contentArray;
    let temp;

    switch (this.#direction) {
      case DefaultShift.LEFT:
        for (let i = 0; i < cY; i++) {
          const row = cells[i];
          temp = row.shift();
          row.push(temp);
        }
        break;
      case DefaultShift.RIGHT:
        for (let i = 0; i < cY; i++) {
          const row = cells[i];
          temp = row[cX - 1];
          row.unshift(temp);
          row.length = cX;
        }
        break;
      case DefaultShift.UP:
        const topRow = cells[0];
        for (let i = 1; i < cY; i++) {
          cells[i - 1] = cells[i];
        }
        cells[cY - 1] = topRow;
        break;
      case DefaultShift.DOWN:
        const bottomRow = cells[cY - 1];
        for (let i = cY - 2; i >= 0; i--) {
          cells[i + 1] = cells[i];
        }
        cells[0] = bottomRow;
        break;
    }
    this.spriteEditor.grid.contentArray = cells;
    this.spriteEditor.refreshPreview();
  }  
}

class DefaultFlip extends DefaultToolbarButton {
  static LEFT_RIGHT = 0;
  static UP_DOWN = 1;

  #direction = DefaultFlip.LEFT_RIGHT;

  constructor() {
    super('Flip', 'Mirror the pixels of the grid horizontally or vertically along the centerline');
  }
  
  get icon() {
    return super.icon + 'flip.png';
  }

  get options() {
    return {
      always: ['keyDown'],
      momentary: true
    };
  }

  activate(editor) {
    super.activate(editor);

    // register to handle events
    editor.addHandler(this, 'keyDown', (key) => { this.#pressedKey(key); });
  }

  enabled() {
    super.enabled();
    this.#doFlip();
    this.disabled();
  }

  //--------------------------------

  #pressedKey(key) {
    switch (key) {
      case 'Shift': this.#direction = DefaultFlip.LEFT_RIGHT; break;
      case 'Control': this.#direction = DefaultFlip.UP_DOWN; break;
    }
  }

  #doFlip() {
    const cX = this.spriteEditor.grid.cellsX,
          cY = this.spriteEditor.grid.cellsY;

    let cells = this.spriteEditor.grid.contentArray;
    let temp;

    switch (this.#direction) {
      case DefaultFlip.LEFT_RIGHT:
        for (let i = 0; i < cY; i++) {
          let row = cells[i];
          row = row.reverse();
        }
        break;
      case DefaultFlip.UP_DOWN:
        cells = cells.reverse();
        break;
    }
    this.spriteEditor.grid.contentArray = cells;
    this.spriteEditor.refreshPreview();
  }  
}

class DefaultRotate extends DefaultToolbarButton {
  static LEFT = 0;
  static RIGHT = 1;

  #direction = DefaultRotate.RIGHT;

  constructor() {
    super('Rotate', 'Rotate the pixels in the grid left or right');
  }
  
  get icon() {
    return super.icon + 'rotate.png';
  }

  get options() {
    return {
      always: ['keyDown'],
      momentary: true
    };
  }

  activate(editor) {
    super.activate(editor);

    // register to handle events
    editor.addHandler(this, 'keyDown', (key) => { this.#pressedKey(key); });
  }

  enabled() {
    super.enabled();
    this.#doRotate();
    this.disabled();
  }

  //--------------------------------

  #pressedKey(key) {
    switch (key) {
      case 'ArrowLeft': this.#direction = DefaultRotate.LEFT; break;
      case 'ArrowRight': this.#direction = DefaultRotate.RIGHT; break;
    }
  }

  #doRotate() {
    const cX = this.spriteEditor.grid.cellsX,
          cY = this.spriteEditor.grid.cellsY;

    let cells = this.spriteEditor.grid.contentArray;
    let temp;

    switch (this.#direction) {
      case DefaultFlip.LEFT_RIGHT:
        for (let i = 0; i < cY; i++) {
          let row = cells[i];
          row = row.reverse();
        }
        break;
      case DefaultFlip.UP_DOWN:
        cells = cells.reverse();
        break;
    }
    this.spriteEditor.grid.contentArray = cells;
    this.spriteEditor.refreshPreview();
  }  

}

// export default plugins
export {
  DefaultPaint,
  DefaultErase,
  DefaultUndo,
  DefaultShift,
  DefaultFlip,
  DefaultRotate
};