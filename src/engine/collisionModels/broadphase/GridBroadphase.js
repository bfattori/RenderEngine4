import RenderEngineError from '../../core/RenderEngineError.js';
import BroadphaseModel, { PotentialCollisionList } from '../BroadphaseModel.js';

export default class GridBroadphase extends BroadphaseModel {
  #width;
  #height;
  #divisions;

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
    
    this.#initializeModel(xDivisions, yDivisions);
  }

  /**
   * Returns `true` if the game object is located within the grid model. Otherwise, returns `false`.
   * @param {GameObject} gameObject - The game object to locate
   * @returns {boolean} 
   */
  inModel(gameObject) {
    return this.#model.filter(row => row.find(cell => cell.includes(gameObject))).length !== 0;
  }

  /**
   * Returns the cell [x, y] at which the game object is found in the grid. Otherwise, `null`.
   * @param {GameObject} gameObject - The game object to locate
   * @returns {Array<number>|null}
   */
  atCell(gameObject) {
    let x,y;
    for (let i = 0; i < this.#divisions[1]; i++) {
      for (let j = 0; j < this.#divisions[0]; j++) {
        if (this.#model[i][j].includes(gameObject)) {
          x = j;
          y = i;
          return [x, y];
        }
      }
    }
    return null;
  }

  /**
   * Update the broadphase model - place the object into the grid and update its position.
   * @param {GameObject} gameObject - The game object being updated
   * @param {Matrix2d} matrix - A matrix representing the object's world transformation.
   */
  updateModel(gameObject, matrix) {
    const xDiv = Math.round((matrix.e / this.#width) * this.#divisions[0]);
    const yDiv = Math.round((matrix.f / this.#height) * this.#divisions[1]);
    const current = this.atCell(gameObject);

    if (current !== null && (current[0] !== xDiv || current[1] !== yDiv)) {
      // the gameObject is in the model and has changed cells,
      // remove it from the existing cell before placing it in a new cell
      let cell = this.#model[current[1]][current[0]];
      const objIdx = cell.indexOf(gameObject);
      cell.splice(objIdx, 1);
    } else if (current !== null && (current[0] === xDiv && current[1] === yDiv)) {
      // same cell - no change
      return;
    }

    this.#addObjectToCell(gameObject, xDiv, yDiv);
  }

  /**
   * Returns an array of objects that could potentially be colliding given
   * the coordinates provided. Depending on accuracy, the number of cells included is
   * between 1 and 9, increasing the number of collision checks to perform.
   * 
   * @param {number} x - X position in world coordinates 
   * @param {number} y - Y position in world coordinates
   * @returns {PotentialCollisionList} An object containing the test point and the possible collision objects around that point
   */
  getPotentialCollisionList(x, y) {
    const xDiv = Math.floor(x / this.#divisions[0]);
    const yDiv = Math.floor(y / this.#divisions[1]);

    // the cell x,y is in
    const collisionSet = [].concat(this.#model[yDiv][xDiv]);

    if (this.accuracy === BroadphaseModel.ACCURACY.MEDIUM) {
      // add polar cells
      if (yDiv - 1 >= 0) {  // north
        collisionSet = collisionSet.concat(this.#model[yDiv - 1][xDiv]);
      }
      if (yDiv + 1 < this.#divisions[1]) {  // south
        collisionSet = collisionSet.concat(this.#model[yDiv + 1][xDiv]);
      }
      if (xDiv - 1 >= 0) {  // west
        collisionSet = collisionSet.concat(this.#model[yDiv][xDiv - 1]);
      }
      if (xDiv + 1 < this.#divisions[0]) {  // east
        collisionSet = collisionSet.concat(this.#model[yDiv][xDiv + 1]);
      }
    } else if (this.accuracy === BroadphaseModel.ACCURACY.HIGH) {
      // add cubic cells
      if (yDiv - 1 >= 0 && xDiv - 1 >= 0) { // nw
        collisionSet = collisionSet.concat(this.#model[yDiv - 1][xDiv - 1]);
      }
      if (yDiv - 1 >= 0 && xDiv + 1 < this.#divisions[0]) { // ne
        collisionSet = collisionSet.concat(this.#model[yDiv - 1][xDiv + 1]);
      }
      if (yDiv + 1 < this.#divisions[1] && xDiv - 1 >= 0) { // sw
        collisionSet = collisionSet.concat(this.#model[yDiv + 1][xDiv - 1]);
      }
      if (yDiv + 1 < this.#divisions[1] && xDiv + 1 < this.#divisions[0]) { // se
        collisionSet = collisionSet.concat(this.#model[yDiv + 1][xDiv + 1]);
      }
    }

    return new PotentialCollisionList(x, y, collisionSet);
  }

  /**
   * Add the game object to the grid.
   * @param {GameObject} gameObject - The game object to insert 
   * @param {number} x - The X cell division
   * @param {number} y - The Y cell division
   */
  #addObjectToCell(gameObject, x, y) {
    if (x > this.#divisions[0] || y > this.#divisions[1]) {
      throw new RenderEngineError('GridBroadphase: Attempted to add an object outside of the grid boundaries');
    }
    
    // Place the object into the cell if it isn't already there
    if (!this.#model[y][x].includes(gameObject)) {
      this.#model[y][x].push(gameObject);
    }
  }

  #initializeModel(xDivisions, yDivisions) {
    // Initialize grid data structure to empty arrays
    this.#model = [];
    for (let i = 0; i < yDivisions; i++) {
      this.#model[i] = [];
      for (let j = 0; j < xDivisions; j++) {
        this.#model[i][j] = [];
      }
    }
  }
}