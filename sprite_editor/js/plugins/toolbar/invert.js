import DefaultToolbarButton from '../../Buttons.js';

/**
 * Example toolbar plugin showing a simple pixel color inversion
 * for all of the non-background pixels in the grid.
 */
export default class InvertGridButton extends DefaultToolbarButton {
  constructor() {
    // name identifies the plugin uniquely 
    // description is shown at the tooltip for the button
    super('InvertGrid', 'Invert the colors of each pixel in the grid');
  }
  
  /**
   * The icon for the button to display in the toolbar.
   */
  get icon() {
    return super.icon + 'invert.png';
  }

  /**
   * Configuration options for the toolbar button tells the SpriteEditor
   * how this plugin behaves.
   */
  get options() {
    return {
      momentary: true       // never becomes "active" tool, expected to disable itself after performing the action
    };
  }

  /**
   * Called when the button is clicked
   */
  enabled() {
    super.enabled();
    this.#doInvert();
    this.disabled();
  }

  //--------------------------------

  /**
   * Invert the color of each cell in the grid
   */
  #doInvert() {
    const cX = this.spriteEditor.grid.cellsX,
      cY = this.spriteEditor.grid.cellsY;

    let cells = this.spriteEditor.grid.contentArray;
    let temp;

    // invert each pixel in the grid (excluding background option?)

    // update the grid & refresh the preview
    this.spriteEditor.grid.contentArray = cells;
    this.spriteEditor.refreshPreview();
  }
}