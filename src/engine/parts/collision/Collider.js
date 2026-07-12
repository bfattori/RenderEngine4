/**
 * Base Collider class for collision detection between GameObjects.
 * This class provides the fundamental mechanism for interacting with the world collision model
 * that all collider component subclasses inherit from.
 */
import Constants from '../../Constants.js';
import ComponentPart from '../ComponentPart.js';
import { ComponentPartEvent, ComponentPartError } from '../ComponentPart.js';
import { PreTransformEvent } from '../transform/TransformPart.js';

class ColliderEvent extends ComponentPartEvent {
    #collisionData = null;
    constructor(gameObject, collisionData, time, deltaTime) {
        super(gameObject, time, deltaTime);
        this.#collisionData = collisionData;
    }

    consume(consumer) {
        super.consume(consumer);
        return this.#collisionData;
    }
}

/**
 * @class CollisionData
 * The event information for when a collision occurs.
 * 
 * @param {GameObject} initiator - The GameObject that initiated the collision.
 * @param {GameObject} collidedWith - The GameObject that was collided with.
 * @param {number} separatingDistance - The distance between the two GameObjects at which they are separating.
 * @param {Array} backoffVector - The vector that needs to be applied to the initiator to move them closer together. (x, y)
 * @param {number} backoffDistance - The distance that needs to be moved by the initiator to resolve the collision.
 * @param {string} collisionType - The type of collision model used (e.g., AxisAlignedBoundingBox).
 * @param {Object} colliderModel - An object containing the shape data for both GameObjects involved in the collision. 
 * @param {String} colliderModel.type - The collision model type
 * @param {CollisionShape} colliderModel.thisShape - The initiator collision shape (e.g. {@link })
 * @param {CollisionShape} colliderModel.otherShape - The shape of the object collided with
 * @returns {CollisionData} An object containing the collision data.
 */
class CollisionData {
  constructor({ initiator, collidedWith, 
                separatingDistance, backoffVector, backoffDistance, 
                collisionType, colliderModel, position, rotation, 
                scale, axis, side }) {
    this.initiator = initiator;
    this.collidedWith = collidedWith;
    this.separatingDistance = separatingDistance;  // Calculated by SAT in real implementation
    this.backoffVector = backoffVector; // Calculated by collision model
    this.backoffDistance = backoffDistance;    // Penetration depth
    this.collisionType =  collisionType;
    this.colliderModel = colliderModel;
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
    this.axis = axis;
    this.side = side;
  }
};

/**
 * Creates a new Collider instance
 * @param {GameObject} gameObject - The game object this collider belongs to
 * @param {Engine|null} engine - Optional reference to the Engine for global event access
 */
export default class ColliderPart extends ComponentPart {
  #collided = false;
  #collisions = [];
  #worldCollisionModel = null;
  #cachedTransform = null;
  
  /**
   * Creates a ColliderPart with common collision detection functionality
   * @param {String} name - Optional name for this component
   */
  constructor(name = 'ColliderPart') {
    super(Constants.COLLIDER_PRIORITY, name);
    this.on(PreTransformEvent);
  }

  /**
   * Sets the world's collision model reference that this collider will use
   * @param {CollisionModel} collisionModel - The collision model from GameWorld
   */
  set collisionModel(collisionModel) {
    this.#worldCollisionModel = collisionModel;
  }

  /**
   * Gets the collision model from the world
   * @returns {CollisionModel|null} The active collision model or null if not set
   */
  get collisionModel() {
    return this.#worldCollisionModel;
  }

  /**
   * Gets the collision shape for this game object
   * Must be implemented by subclasses
   * @returns {Object} The collision shape data (shape type and geometry)
   */
  get collisionShape() {
    throw new ComponentPartError(this, `${this.constructor.name}: getCollisionShape() must be implemented by subclass`);
  }

  /**
   * Returns a list of any collisions that have been detected by this part.
   * @return {Array<CollisionData>} An array of Collision objects representing detected collisions
   */
  get collisions() {
    return this.#collisions;
  }

  /**
   * Gets whether collisions have been detected in the current frame.
   * Can also be used to set the collision state for this frame.
   * @param {boolean|null} state - Optional state to set for this frame (true if collided, false if not)
   * @returns {boolean} True if collisions occurred
   */
  isCollided(state = null) {
    if (state != null)      
      this.#collided = state;
    else
      return this.#collided;
  }

  /**
   * Clears collision state for the next frame
   * Should be called at start of update or by derived classes
   */
  clearCollisions() {
    this.#collisions = [];
    this.#collided = false;
  }

  /**
   * Records a collision event with detailed data
   * @param {CollisionData} collisionData - The collision data to record
   */
  recordCollision(time, deltaTime, collisionData) {
    this.#collisions.push(collisionData);
    this.#collided = true;
    
    // Notify via local event
    this.emit(new ColliderEvent(this.host, collisionData, time, deltaTime));
  }

  /**
   * Helper method to check if two GameObjects intersect using the world's collision model
   * @param {GameObject} otherObject - The other game object to test for collision
   * @returns {boolean} True if objects are colliding, false otherwise
   */
  checkCollision(otherObject) {
    if (!this.collisionModel) {
      throw new ComponentPartError(this, 'ColliderPart: world collision model not set');
    }
    
    const thisShape = this.getCollisionShape();
    const otherShape = otherObject.getCollisionShape();
    
    if (!thisShape || !otherShape) {
      return false;
    }
    
    return this.collisionModel.testCollision(thisShape, otherShape);
  }

  //-------------------------------
  // Event Handler
  //-------------------------------
    
  /**
   * Event handler responds to {@link PreTransformEvent}.
   * This occurs when the transform intended for rendering is updated, allowing this part to compensate.
   * 
   * @param {Event} eventObject - The event object
   */
 onEvent(eventObject) {
    switch (eventObject.type) {
      case PreTransformEvent:
        this.transformUpdated(eventObject);
        break;
    }
  }

  transformUpdate(eventObject) {
    this.#cachedTransform = eventObject.consume(this);
  }

  /**
   * Updates the collider state based on collision detection results
   * @param {number} time - Current world time
   * @param {number} deltaTime - Time elapsed since last update
   */
  update(time, deltaTime) {
    // Clear previous collisions
    this.clearCollisions();
    
    // Perform collision detection if collider model is set and we have a transform
    if (this.collisionModel && this.host.getComponent('Transform2d')) {
      const transform = this.#cachedTransform;
      
      // Check against all other objects in the world that are collidable
      const otherObjects = this.collisionModel.getCollidableObjects();
      
      for (const otherObject of otherObjects) {
        if (otherObject !== this.host) {
          // Get or create a collider component for the other object
          let otherCollider;
          
          // Check if the other object already has a collider
          const otherColliders = otherObject.getComponentsByType(ColliderPart);
          if (otherColliders.length > 0) {
            otherCollider = otherColliders[0];
          }
          
          if (otherCollider) {
            // Use the other object's collider for detection
            const thisShape = this.getCollisionShape();
            const otherShape = otherCollider.getCollisionShape();
            
            if (this.collisionModel.testCollision(thisShape, otherShape)) {
              // Determine collision type based on collider types
              const thisType = this.constructor.name;
              const otherType = otherCollider.constructor.name;
              let collisionType = '';
              
              if (thisType === 'AABBCollider' || otherType === 'AABBCollider') {
                collisionType = 'AxisAlignedBoundingBox';
              } else if (thisType === 'ConvexHullCollider' || otherType === 'ConvexHullCollider') {
                collisionType = 'ConvexHull';
              } else if (thisType === 'CABCCollider' || otherType === 'CABCCollider') {
                collisionType = 'CenterAlignedBoundaryCircle';
              }
              
              this.recordCollision(time, deltaTime, new CollisionData({
                initiator: this.getHost(),
                collidedWith: otherObject,
                separatingDistance: 0, // Would be calculated by SAT in real implementation
                backoffVector: [0, 0], // Would be calculated by collision model
                backoffDistance: 0,    // Would be set based on penetration depth
                collisionType: collisionType || 'AxisAlignedBoundingBox',
                colliderModel: {
                  type: collisionType,
                  thisShape: thisShape,
                  otherShape: otherShape
                }
              }));
            }
          } else {
            // Create a temporary AABB for objects without dedicated colliders
            const tempShape = this.collisionModel.createAABB(otherObject);
            
            // Check collision between our shape and the other object's bounding box
            if (this.collisionModel.testCollision(this.getCollisionShape(), tempShape)) {
              // Record collision with basic data
              const collisionType = 'BasicBoundingBox';
              this.recordCollision(time, deltaTime, new CollisionData({
                initiator: this.getHost(),
                collidedWith: otherObject,
                separatingDistance: 0,
                backoffVector: [0, 0],
                backoffDistance: 0,
                collisionType: collisionType
              }));
            }
          }
        }
      }
    }
  }

  /**
   * Removes this component from the game object
   */
  destroy() {
    if (this.host) {
      this.host.removeComponent(this);
      this.worldCollisionModel = null;
    }
  }
}

export {
  CollisionData,
  ColliderEvent
}