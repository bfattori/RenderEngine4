
export default class VectorShape {
  static DEFAULT_STATE = 'default';

  #points = [];

  constructor() {

  }

  get points() {
    return this.#points;
  }

  set points(points) {
    this.#points = points;
  }

  get boundingBox() {
    return [0,0,1,1];
  }
}