/**
 * Base class for collision shapes representing an object's boundaries.
 * @param {String} type - The type of collision shape ('AABB', 'CABC', 'ConvexHull')
 */
export default class CollisionShape {
  constructor(type) {
    this.type = type;
  }
};
