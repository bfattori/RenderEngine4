import SpriteEditor from './SpriteEditor.js';

export default class DefaultPlugin {
  #pluginName;
  #description;
  
  #loaded = false;
  #enabled = false;
  #editor;
  #button;
  
  constructor(name = 'Default Plugin', description = 'This is the default plugin') {
    this.#pluginName = name;
    this.#description = description;
  }

  get name() {
    return this.#pluginName;
  }

  get description() {
    return this.#description;
  }

  get icon() {
    return '/src/sprite_editor/img/icons/';
  }

  get isLoaded() {
    return this.#loaded;
  }

  get spriteEditor() {
    return this.#editor;
  }

  get toobarButton() {
    return this.#button;
  }

  get isEnabled() {
    return this.#enabled;
  }

  activate(editor) {
    // called when the plugin is added to the SpriteEditor
    this.#loaded = true;
    this.#editor = editor;
    this.#addToToolbar();
  }

  #addToToolbar() {
    this.#button = document.createElement('button');
    this.#button.classList.add('icon-btn');
    this.#button.title = this.name;
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


  action(grid) {
    console.log(`Action performed by ${this.name} :: ${x}, ${y}`);
  }

  enabled() {
    this.#button.classList.add('enabled');
    this.#enabled = true;
  }

  disabled() {
    this.#button.classList.remove('enabled');
    this.#enabled = false;
  }
}

class DefaultPaint extends DefaultPlugin {
  #painting = null;
  
  constructor() {
    super('PaintBrush', 'Use the paintbrush tool to shade cells');
  }
  
  get icon() {
    return super.icon + 'paintbrush.png';
  }

  activate(editor) {
    super.activate(editor);

    // register to handle events from the grid
    editor.addHandler(this, 'mouseDown', (button, x, y) => this.mouseDown(button, x, y));
    editor.addHandler(this, 'mouseUp', () => this.mouseUp());
    editor.addHandler(this, 'mouseMove', (x, y) => this.mouseMove(x, y));
    editor.addHandler(this, 'mouseLeave', () => this.mouseLeave());
  }

  //--------------------------------

  mouseDown(button, x, y) {
    if (button === 'left')
      this.#painting = 'fill';
    else
      this.#painting = null;
    this.#applyPaint(x, y);
  }

  mouseUp() {
    this.#painting = null;  
  }

  mouseMove(x, y) {
    // Continue painting while a button is held down.
    if (this.#painting !== null) {
      this.#applyPaint(x, y);
    }
  }

  mouseLeave() {
    this.#painting = null;
  }

  /**
   * Apply the current paint mode to the hovered cell.
   */
  #applyPaint(x, y) {
    if (this.spriteEditor.grid.hoveredX === null || this.#painting === null) return;
    this.spriteEditor.grid.paintCell(x, y);
  }
}

class DefaultErase extends DefaultPlugin {
  #painting = null;
  
  constructor() {
    super('Eraser', 'Use the paintbrush tool to clear cells');
  }
  
  get icon() {
    return super.icon + 'eraser.png';
  }

  activate(editor) {
    super.activate(editor);

    // register to handle events from the grid
    editor.addHandler(this, 'mouseDown', (button, x, y) => this.mouseDown(button, x, y));
    editor.addHandler(this, 'mouseUp', () => this.mouseUp());
    editor.addHandler(this, 'mouseMove', (x, y) => this.mouseMove(x, y));
    editor.addHandler(this, 'mouseLeave', () => this.mouseLeave());
  }

  //--------------------------------

  mouseDown(button, x, y) {
    if (button === 'left')
      this.#painting = 'clear';
    else 
      this.#painting = null;
    this.#applyPaint(x, y);
  }

  mouseUp() {
    this.#painting = null;  
  }

  mouseMove(x, y) {
    // Continue painting while a button is held down.
    if (this.#painting !== null) {
      this.#applyPaint(x, y);
    }
  }

  mouseLeave() {
    this.#painting = null;
  }

  /**
   * Apply the current paint mode to the hovered cell.
   */
  #applyPaint(x, y) {
    if (this.spriteEditor.grid.hoveredX === null || this.#painting === null) return;
    this.spriteEditor.grid.clearCell(x, y);
  }
}

// export default plugins
export {
  DefaultPaint,
  DefaultErase
};