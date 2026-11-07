/**
 * @class CollisionData
 * The event information for a collision.
 * 
 * @param {GameObject} initiator - The GameObject that initiated the collision.
 * @param {GameObject} target - The GameObject that was collided with.
 * @param {number} separatingDistance - The distance between the two GameObjects at which they are separating.
 * @param {Array} backoffVector - The vector that needs to be applied to the initiator to move them closer together. (x, y)
 * @param {number} backoffDistance - The distance that needs to be moved by the initiator to resolve the collision.
 * @param {NarrowbandModel#TYPE} collisionType - The type of collision model used (e.g., AABB, CABC, ConvexHull).
 * @param {NarrowbandModel} narrowbandModel - The narrowband collision model used
 * @param {Array<Number>} position - The position of the ??
 * @param {number} rotation - The rotation of the ??
 * @param {Array<Number>} scale - The scale of the ??
 * @param {String} axis - The axis of the collision
 * @param {String} side - The side on which the collision occurred
 */
export default class CollisionData {
  constructor({ initiator, target, 
                separatingDistance, backoffVector, backoffDistance, 
                collisionType, narrowbandModel, position, rotation, 
                scale, axis, side }) {
    this.initiator = initiator;
    this.target = target;
    this.separatingDistance = separatingDistance;  // Calculated by SAT in real implementation
    this.backoffVector = backoffVector; // Calculated by collision model
    this.backoffDistance = backoffDistance;    // Penetration depth
    this.collisionType =  collisionType;
    this.narrowbandModel = narrowbandModel;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.axis = axis;
    this.side = side;
  }
};