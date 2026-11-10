import BroadphaseModel, { PotentialCollisionList, BroadphaseModelError } from './BroadphaseModel.js';

export default class GridBroadphase extends BroadphaseModel {
  #width;
  #height;
  #divisions;
  #segSize;
  #supportMulti = false;

  #model = null;

  /**
   * A spatial grid is a simple method of representing the world as a grid of cells. The grid is used to quickly 
   * determine which objects are in collision by checking the cells that an object occupies. Increasing the accuracy
   * includes more adjacent cells, allowing for more precision when looking for collisions. Medium accuracy includes 
   * the poles, while high accuracy includes the corners. By default, the area is divided into a 5x5 grid. 
   *
   * @param {String} name - The name of the model
   * @param {number} width - The width of the world space to subdivide
   * @param {number} height - The height of the world space to subdivide
   * @param {number} xDivisions - Number of cell divisions (default: 5)
   * @param {number} yDivisions - Number of cell divisions (default: 5)
   * @param {BroadphaseModel#ACCURACY} accuracy - The accuracy of the model 
   */
  constructor(name = 'bpGrid', width, height, xDivisions = 5, yDivisions = 5, accuracy = BroadphaseModel.ACCURACY.LOW) {
    super(name, accuracy);
    this.#width = width;
    this.#height = height;
    this.#divisions = [xDivisions, yDivisions];
    this.#segSize = [Math.floor(this.#width / xDivisions), Math.floor(this.#height / yDivisions)]
    
    this.#initializeModel(xDivisions, yDivisions);
  }

  /**
   * Initialize the model by filling the cells with empty arrays.
   * The model is in row-major format.
   * @param {number} xDivisions 
   * @param {number} yDivisions 
   */
  #initializeModel(xDivisions, yDivisions) {
    // Initialize grid data structure to empty arrays
    this.#model = [];
    for (let i = 0; i < yDivisions; i++) {
      this.#model[i] = [];
      for (let j = 0; j < xDivisions; j++) {
        this.#model[i][j] = {
          coords: [j, i],
          objects: []
        };
      }
    }
  }

  /**
   * Returns an array with the dimensions of a cell in X and Y
   * @return {Array<number>} [xSize, ySize]
   */
  get cellSize() {
    return this.#segSize;
  }

  /**
   * Returns `true` if the model supports the same object in multiple cells.
   * @returns {boolean}
   */
  get supportMulti() {
    return this.#supportMulti;
  }

  /**
   * Support multiple instances of the same object in the grid.
   * @param {boolean} state - `true` to enable multiple instances
   */
  set supportMulti(state) {
    this.#supportMulti = state;
  }

  /**
   * Returns `true` if the game object is located anywhere in the grid model. Otherwise, returns `false`.
   * @param {GameObject} gameObject - The game object to locate
   * @returns {boolean} 
   */
  inModel(gameObject) {
    return this.#model.filter(row => row.find(cell => cell.objects.includes(gameObject))).length !== 0;
  }

  /**
   * Returns the cell coordinates [x, y] at which the game object is found in the grid. Otherwise, `null`.
   * If `supportMulti` option is used, this method returns `null` - use {@link allCells} instead.
   * @param {Object} object - The game object to locate
   * @returns {Array<number>|null} Returns `null` if the object isn't in the grid
   */
  atCell(object) {
    if (this.#supportMulti) return null;

    const cell = this.#model.filter(row => row.find(cell => cell.objects.includes(object)));
    if (cell.length > 1)
      throw new BroadphaseModelError(this, `The GameObject "${object.name}" cannot be in multiple cells without 'supportMulti'. (${cell.length})`);
    
    if (cell.length !== 0) 
      return cell[0].coords;

    return null;
  }

  /**
   * Returns all cells where the object exists in the grid.
   * @param {Object} object - The object to find in the grid
   * @returns {Array<Array>} An array of the cells where the object exists
   */
  allCells(object) {
    const cells = [];
    this.#model.forEach(row => {
      row.filter(cell => cell.objects.includes(object)).forEach(cell => cells.push(cell));
    })
    return cells;
  }

  /**
   * Returns the grid cell [x, y] for the given world coordinates
   * @returns {Array<number>} [xCell, yCell]
   */
  cellFor(x, y) {
    return [Math.min(this.#divisions[0] - 1, Math.floor(x / this.#segSize[0])), Math.min(this.#divisions[1] - 1, Math.floor(y / this.#segSize[1]))];
  }

  /**
   * Get the list of objects in the grid at the given world coordinates.
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   * @returns {Array<Object>} The objects at the world coordinates
   */
  getObjectsAt(x, y) {
    if (x < 0 || y < 0 || x > this.#width || y > this.#height) return null;
    const cell = this.cellFor(x, y);
    return this.#model[cell[1]][cell[0]].objects;
  }

  /**
   * Update the broadphase model - place the object into the grid and update its position. When an object can exist in
   * multiple cells, the option is to remove it from all existing cells before adding it again.
   * @param {Object} object - The game object being updated
   * @param {Matrix2d|number} matrix - A matrix representing the object's world transformation, or the X coordinate
   * @param {number} y - If `matrix` is the X coordinate, this is the Y coordinate
   * @param {boolean} clearCells - When the `supportMulti` option is used, this will clear all cells where the object exists
   */
  updateModel(object, matrix, y, clearCells = false) {
    let div;
    if (!isNaN(matrix)) {
      div = this.cellFor(matrix, y);
    } else {
      div = this.cellFor(matrix.e, matrix.f);
    }

    // out of bounds
    if (div[0] < 0 || div[0] > this.#divisions[0] || div[1] < 0 || div[1] > this.#divisions[1]) {
      this.removeObjectFromModel(object);
      return;
    }

    const current = this.#supportMulti ? this.inModel(object) : this.atCell(object);

    if (current && current.length && current.length === 1) {
      // if the object is in a cell
      if (current[0].coords[0] !== div[0] || current[0].coords[1] !== div[1]) {
        // the gameObject has changed cells,
        // remove it from the existing cell before placing it in a new cell
        let objects = this.#model[current[0].coords[0]][current[0].coords[1]].objects;
        objects.splice(objects.indexOf(object), 1);
      } else if (current[0].coords[0] === div[0] && current[0].coords[1] === div[1]) {
        // it's in the same cell
        return;
      }
    } else if (clearCells) {
      // remove the repulsor from the model
      this.removeObjectFromModel(object);
    }

    // add the gameobject to the new cell
    this.#addObjectToCell(object, div[0], div[1]);
  }

  /**
   * Add the game object to the grid.
   * @param {Object} object - The object to insert 
   * @param {number} x - The X cell
   * @param {number} y - The Y cell
   * @private
   */
  #addObjectToCell(object, x, y) {
    if (x > this.#divisions[0] || y > this.#divisions[1] || x < 0 || y < 0) {
      throw new BroadphaseModelError(this, `Range error: ${x}, ${y} is outside the model boundaries [${this.#divisions[0]}, ${this.#divisions[1]}]`);
    }
    
    // Place the object into the cell if it isn't already there
    if (!this.#model[y][x].objects.includes(object)) {
      this.#model[y][x].objects.push(object);
    }
  }

  /**
   * Remove an object from the collision model. For `supportMulti`, removes it from
   * all cells where it exists.
   * @param {Object} object - Object to remove
   */
  removeObjectFromModel(object) {
    const cells = this.allCells(object);
    cells.forEach(cell => {
      let objects = this.#model[cell.coords[1]][cell.coords[0]].objects;
      if (objects.includes(object)) {
        // remove it from the cell
        objects.splice(objects.indexOf(object), 1);
      }
    })
  }

  /**
   * Returns an array of objects that could potentially be colliding given
   * the coordinates provided. Depending on accuracy, the number of cells included is
   * between 1 and 9, increasing the number of collision checks to perform. At accuracy
   * `LOW` only the cell that contains the x,y coordinate is returned. `MEDIUM` adds the
   * cells at north, east, south, and west. And accuracy `HIGH` provides all 9 cells.
   * 
   * @example
   * +--------+--------+--------+
   * |  HIGH  | MEDIUM |  HIGH  |
   * +--------+--------+--------+
   * | MEDIUM |  LOW   | MEDIUM |
   * +--------+--------+--------+
   * |  HIGH  | MEDIMU |  HIGH  |
   * +--------+--------+--------+
   * 
   * @param {number} x - X position in world coordinates 
   * @param {number} y - Y position in world coordinates
   * @returns {PotentialCollisionList} An object containing the test point and the possible collision objects around that point
   */
  getPotentialCollisionList(x, y) {
    const div = this.cellFor(x, y);

    // the cell x, y is in
    const collisionSet = [].concat(this.#model[div[1]][div[0]]);

    if (this.accuracy === BroadphaseModel.ACCURACY.MEDIUM) {
      // add polar cells
      if (div[1] - 1 >= 0) {  // north
        collisionSet = collisionSet.concat(this.#model[div[1] - 1][div[0]]);
      }
      if (div[1] + 1 < this.#divisions[1]) {  // south
        collisionSet = collisionSet.concat(this.#model[div[1] + 1][div[0]]);
      }
      if (div[0] - 1 >= 0) {  // west
        collisionSet = collisionSet.concat(this.#model[div[1]][div[0] - 1]);
      }
      if (div[0] + 1 < this.#divisions[0]) {  // east
        collisionSet = collisionSet.concat(this.#model[div[1]][div[0] + 1]);
      }
    } 
    
    if (this.accuracy === BroadphaseModel.ACCURACY.HIGH) {
      // add cubic cells
      if (div[1] - 1 >= 0 && div[0] - 1 >= 0) { // nw
        collisionSet = collisionSet.concat(this.#model[div[1] - 1][div[0] - 1]);
      }
      if (div[1] - 1 >= 0 && div[0] + 1 < this.#divisions[0]) { // ne
        collisionSet = collisionSet.concat(this.#model[div[1] - 1][div[0] + 1]);
      }
      if (div[1] + 1 < this.#divisions[1] && div[0] - 1 >= 0) { // sw
        collisionSet = collisionSet.concat(this.#model[div[1] + 1][div[0] - 1]);
      }
      if (div[1] + 1 < this.#divisions[1] && div[0] + 1 < this.#divisions[0]) { // se
        collisionSet = collisionSet.concat(this.#model[div[1] + 1][div[0] + 1]);
      }
    }

    return new PotentialCollisionList(x, y, collisionSet);
  }
}