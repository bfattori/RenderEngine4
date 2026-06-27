/**
 * Base ColliderComponent class for collision detection between GameObjects.
 * This class provides the fundamental mechanism for interacting with the world collision model
 * that all collider component subclasses inherit from.
 */
import { COLLIDER_PRIORITY } from './../../constants';
import { GameComponent, GameComponentError } from '../GameComponent.js';

/**
 * @class CollisionData
 * The event information for when a collision occurs.
 * 
 * @param {number} timestamp - the world time the collision was detected at.
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
  constructor({ timestamp, initiator, collidedWith, separatingDistance, backoffVector, backoffDistance, collisionType, colliderModel }) {
    this.timestamp = timestamp;
    this.initiator = initiator;
    this.collidedWith = collidedWith;
    this.separatingDistance = separatingDistance;  // Calculated by SAT in real implementation
    this.backoffVector = backoffVector; // Calculated by collision model
    this.backoffDistance = backoffDistance;    // Penetration depth
    this.collisionType =  collisionType,
    this.colliderModel = colliderModel;
  }
};

/**
 * Creates a new ColliderComponent instance
 * @param {GameObject} gameObject - The game object this collider belongs to
 * @param {Engine|null} engine - Optional reference to the Engine for global event access
 */
class ColliderComponent extends GameComponent {
  /**
   * Creates a ColliderComponent with common collision detection functionality
   * @param {String} name - Optional name for this component
   * @param {Engine|null} engine - Optional engine reference
   */
  constructor(name = 'ColliderComponent', engine = null) {
    super(COLLIDER_PRIORITY, name, engine);
    
    this.setEngine(engine);
    this.worldCollisionModel = null; // Will be set by the world when needed
        
    /**
     * Flag indicating if collisions have been detected in the current frame
     * @type {boolean}
     */
    this._collided = false;
    
    /**
     * Array to store collision data for this frame
     * @type {Array}
     */
    this.collisions = [];
  }

  /**
   * Sets the world's collision model reference that this collider will use
   * @param {CollisionModel} collisionModel - The collision model from GameWorld
   */
  setCollisionModel(collisionModel) {
    this.worldCollisionModel = collisionModel;
  }

  /**
   * Gets the collision model from the world
   * @returns {CollisionModel|null} The active collision model or null if not set
   */
  get collisionModel() {
    return this.worldCollisionModel;
  }

  /**
   * Gets whether collisions have been detected in the current frame.
   * Can also be used to set the collision state for this frame.
   * @param {boolean|null} state - Optional state to set for this frame (true if collided, false if not)
   * @returns {boolean} True if collisions occurred
   */
  isCollided(state = null) {
    if (state != null)      
      this._collided = state;
    else
      return this._collided;
  }

  /**
   * Clears collision state for the next frame
   * Should be called at start of update or by derived classes
   */
  clearCollisions() {
    this.collisions = [];
    this._collided = false;
  }

  /**
   * Records a collision event with detailed data
   * @param {CollisionData} collisionData - The collision data to record
   */
  recordCollision(collisionData) {
    this.collisions.push(collisionData);
    this._collided = true;
    
    // Notify via local event if engine is available
    if (this.engine && this.engine._localEventContext) {
      const eventData = {
        timestamp: Date.now(),
        gameObject: this.getHost(),
        collisionData: collisionData
      };
      
      this.engine._localEventContext.emit('collision', eventData);
    }
  }

  /**
   * Helper method to check if two GameObjects intersect using the world's collision model
   * @param {GameObject} otherObject - The other game object to test for collision
   * @returns {boolean} True if objects are colliding, false otherwise
   */
  checkCollision(otherObject) {
    if (!this.worldCollisionModel) {
      throw new GameComponentError(this, 'ColliderComponent: world collision model not set');
    }
    
    const thisShape = this.getCollisionShape();
    const otherShape = otherObject.getComponent('Transform2dComponent') ? 
                        otherObject.getComponent('AABBColliderComponent') : 
                        otherObject.getComponent('Mover2dComponent') || 
                        otherObject.getComponent('GameObject');
    
    if (!thisShape || !otherShape) {
      return false;
    }
    
    return this.worldCollisionModel.testCollision(thisShape, otherShape);
  }

  /**
   * Gets the collision shape for this game object
   * Must be implemented by subclasses
   * @returns {Object} The collision shape data (shape type and geometry)
   */
  getCollisionShape() {
    throw new GameComponentError(this, `${this.constructor.name}: getCollisionShape() must be implemented by subclass`);
  }

  /**
   * Gets the position of this game object from its transform component
   * @returns {Object|null} Position data or null if no transform component exists
   */
  getPosition() {
    const transform = this.getHost().getComponent('Transform2dComponent');
    if (!transform) {
      // Fall back to GameObject properties if available
      return { x: 0, y: 0 };
    }
    
    return {
      x: transform.x,
      y: transform.y,
      z: transform.z !== undefined ? transform.z : 0
    };
  }

  /**
   * Gets the scale of this game object from its transform component
   * @returns {Object|null} Scale data or null if no transform component exists
   */
  getScale() {
    const transform = this.getHost().getComponent('Transform2dComponent');
    if (!transform) {
      return { x: 1, y: 1, z: 1 };
    }
    
    return {
      x: transform.scaleX !== undefined ? transform.scaleX : 1,
      y: transform.scaleY !== undefined ? transform.scaleY : 1,
      z: transform.scaleZ !== undefined ? transform.scaleZ : 1
    };
  }

  /**
   * Gets the rotation of this game object from its transform component
   * @returns {number|null} Rotation in radians or null if no transform component exists
   */
  getRotation() {
    const transform = this.getHost().getComponent('Transform2dComponent');
    return transform ? (transform.rotation !== undefined ? transform.rotation : 0) : null;
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
    if (this.collisionModel && this.getHost().getComponent('Transform2dComponent')) {
      const transform = this.getHost().getComponent('Transform2dComponent');
      
      // Check against all other objects in the world that are collidable
      const otherObjects = this.worldCollisionModel.getCollidableObjects();
      
      for (const otherObject of otherObjects) {
        if (otherObject !== this.getHost()) {
          // Get or create a collider component for the other object
          let otherCollider;
          
          // Check if the other object already has a collider
          const otherColliders = otherObject.getComponentsByType('ColliderComponent');
          if (otherColliders.length > 0) {
            otherCollider = otherColliders[0];
          } else if (otherCollider) {
            // Use the other object's collider for detection
            const thisShape = this.getCollisionShape();
            const otherShape = otherCollider.getCollisionShape();
            
            if (this.collisionModel.testCollision(thisShape, otherShape)) {
              // Determine collision type based on collider types
              const thisType = this.constructor.name;
              const otherType = otherCollider.constructor.name;
              let collisionType = '';
              
              if (thisType === 'AABBColliderComponent' || otherType === 'AABBColliderComponent') {
                collisionType = 'AxisAlignedBoundingBox';
              } else if (thisType === 'ConvexHullColliderComponent' || otherType === 'ConvexHullColliderComponent') {
                collisionType = 'ConvexHull';
              } else if (thisType === 'CABCColliderComponent' || otherType === 'CABCColliderComponent') {
                collisionType = 'CenterAlignedBoundaryCircle';
              }
              
              this.recordCollision(new CollisionData({
                timestamp: time,
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
            const tempShape = this.worldCollisionModel.createAABB(otherObject);
            
            // Check collision between our shape and the other object's bounding box
            if (this.collisionModel.testCollision(this.getCollisionShape(), tempShape)) {
              // Record collision with basic data
              const collisionType = 'BasicBoundingBox';
              this.recordCollision(new CollisionData({
                timestamp: time,
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
    if (this.getHost()) {
      this.getHost().removeComponent(this);
      this._gameObject = null;
      this.worldCollisionModel = null;
    }
  }
}

export default {
  ColliderComponent,
  CollisionData
};