/**
 * CABCColliderComponent - Center-Aligned Bounding Circle collision detection
 * 
 * This collider component uses the Transform2dComponent's position and a radius to define
 * the bounding circle for collision detection between GameObject instances. It considers
 * the position and scale of the GameObject to calculate the bounding circle for collision.
 * 
 * @class CABCColliderComponent
 * @extends ColliderComponent
 */

import ColliderComponent from './ColliderComponent.js';
import CABCShape from '../../collisions/models/CABC.js';
import Console from '../../core/Console.js';

/**
 * Creates a new CABBColliderComponent instance
 * @param {GameObject} gameObject - The game object this collider belongs to
 * @param {Engine|null} engine - Optional reference to the Engine for global event access
 */
class CABCColliderComponent extends ColliderComponent {
  /**
   * Creates a CABCColliderComponent that detects collisions using center-aligned
   * bounding circles (CABC). It uses the Transform2dComponent's position and a 
   * radius to define the collision circle.
   * 
   * @constructor
   * @param {String} name - Optional name for this component
   * @param {Engine|null} engine - Optional engine reference
   */
  constructor(name = 'CABCColliderComponent', engine = null) {
    super(name, engine);
    
    /**
     * Radius of the bounding circle for collision detection
     * @type {number}
     */
    this.radius = 10; // Default radius
    
    /**
     * Whether to use uniform circular shape (radius applied equally to all axes)
     * @type {boolean}
     */
    this.uniformCircle = true;
        
    /**
     * Reference to the CABC collision model from the world
     * @type {CABCCollisionModel|null}
     */
    this.cabccollisionModel = null;
  }

  /**
   * Overrides setCollisionModel to validate CABCColliderComponent compatibility
   * and warn if an incompatible collision model is used.
   * 
   * @param {CollisionModel} collisionModel - The collision model from GameWorld
   */
  setCollisionModel(collisionModel) {
    super.setCollisionModel(collisionModel);
    
    // Validate that the collision model type matches the collider component type
    if (collisionModel && collisionModel.type !== 'CABC') {
      Console.warn(
        `CABCColliderComponent: Incompatible collision model detected. ` +
        `Expected CABCCollisionModel, got ${collisionModel.type || 'unknown'}.` +
        `This may cause unexpected collision behavior.`
      );
    }
  }

  /**
   * Gets the world's CABC collision model for this collider component
   * 
   * @returns {CABCCollisionModel|null} The active CABCCollisionModel or null if not set
   */
  getCABCCollisionModel() {
    return this.cabccollisionModel;
  }

  /**
   * Sets the CABC collision model from the world engine/world
   * 
   * @param {CABCCollisionModel} cabccollisionModel - The CABCCollisionModel to use
   */
  setCABCCollisionModel(cabccollisionModel) {
    this.cabccollisionModel = cabccollisionModel;
  }

  /**
   * Gets the collision shape for this game object (CABC)
   * 
   * @returns {Object} The CABC collision shape with center x/y and radius
   */
  getCollisionShape() {
    const position = this.getPosition();
    
    // Calculate radius based on object dimensions using Transform2dComponent
    let width, height;
    const transform = this.getHost().getComponent('Transform2dComponent');
    
    if (!transform) {
      return new CABCShape(position, 10);
    }
    
    const scaleX = transform.scale !== undefined ? transform.scale : 1;
    const scaleY = transform.scaleY || 1; // Allow different Y scale
    
    width = transform.width !== undefined ? transform.width * scaleX : 
           (scaleX * (transform.height || 50));
    height = transform.height !== undefined ? transform.height * scaleY : 
            (scaleY * (transform.width || 30));
    
    const radius = Math.min(width, height) / 2;
    
    return new CABCShape(position, radius);
  }

  /**
   * Checks collision with another object using the CABC collision model from the world
   * 
   * @param {GameObject} otherObject - The other game object to test for collision
   * @returns {boolean} True if colliding, false otherwise
   */
  checkCollision(otherObject) {
    // Check if we have a compatible CABC collision model set
    const collisionModel = this.cabccollisionModel;
    
    if (!collisionModel || !this.worldCollisionModel) {
      // No collision model - cannot perform collision detection using model
      return false;
    }
    
    // Get collision shapes for both objects
    const thisShape = this.getCollisionShape();
    const otherCollider = otherObject.getComponent('CABCColliderComponent');
    
    if (!otherCollider) {
      // No CABC collider on other object - cannot check collision
      return false;
    }
    
    const otherShape = otherCollider.getCollisionShape();
    
    // Use the CABC collision model for testing
    try {
      this.isCollided(this.cabccollisionModel.testCollision(thisShape, otherShape));
      return this.isCollided();
    } catch (error) {
      Console.error(
        `CABCColliderComponent: Error during collision detection. ` +
        `This may be due to incompatible collision model.`
      );
      return false;
    }
  }

  /**
   * Calculates the separating axis and penetration depth using CABC collision model
   * 
   * @param {GameObject} otherObject - The other game object to test for collision
   * @returns {Object|null} Collision info with penetration and normal, or null if no collision
   */
  calculateCollisionInfo(otherObject) {
    const collisionModel = this.cabccollisionModel;
    
    if (!collisionModel || !this.worldCollisionModel) {
      return null;
    }
    
    // Get collision shapes for both objects
    const thisShape = this.getCollisionShape();
    const otherCollider = otherObject.getComponent('CABCColliderComponent');
    
    if (!otherCollider) {
      return null;
    }
    
    const otherShape = otherCollider.getCollisionShape();
    
    // Use the CABC collision model for calculating separating axis
    try {
      return collisionModel.calculateSeparatingAxis(thisShape, otherShape);
    } catch (error) {
      Console.error(
        `CABCColliderComponent: Error calculating collision info.` +
        `This may be due to incompatible collision model.`
      );
      return null;
    }
  }

  /**
   * Removes this component from the game object
   */
  destroy() {
    if (this.getHost()) {
      this.getHost().removeComponent(this);
      this._gameObject = null;
      this.cabccollisionModel = null;
    }
  }
}

export default CABCColliderComponent;