/**
 * AABBCollider - Axis-Aligned Bounding Box collision detection
 * 
 * This collider component focuses on optimized box-to-box collisions regardless of 
 * rotation from the TransformComponent. It considers the position and scale of the
 * GameObject to calculate the world-axis aligned box for collision detection.
 * 
 * @class AABBCollider
 * @extends ColliderPart
 */

import ColliderPart from './ColliderPart.js';
import AABBShape from '../../collisions/CollisionModel.js'
import Console from '../../core/Console.js'; // Import Console for warnings

/**
 * Creates a new AABBCollider instance
 * @param {GameObject} gameObject - The game object this collider belongs to
 * @param {Engine|null} engine - Optional reference to the Engine for global event access
 */
class AABBCollider extends ColliderPart {
  /**
   * Creates an AABBCollider that detects collisions using axis-aligned 
   * bounding boxes (AABB) that ignore rotation from TransformComponent.
   * 
   * @constructor
   * @param {GameObject} gameObject - The parent game object
   * @param {Engine|null} engine - Optional engine reference
   */
  constructor(name = 'AABBCollider', engine = null) {
    super(name, engine);
        
    /**
     * Store the collision shape for use with the world's collision model
     * @private
     * @type {Object|null}
     */
    this._collisionShape = null;
  }

  /**
   * Gets the collision shape for this game object (AABB)
   * 
   * @returns {Object} The AABB collision shape with min/max X/Y coordinates
   */
  getCollisionShape() {
    const position = this.getPosition();
    const scale = this.getScale();
    
    // Calculate half-extents (half width/height)
    const halfWidth = scale.x / 2;
    const halfHeight = scale.y / 2;
    
    return new AABBShape(position, scale);
  }

  /**
   * Gets or creates the AABB shape for collision testing with the world model
   * 
   * @returns {Object|null} AABB data or null if no transform component exists
   */
  getAABB() {
    const transform = this.getHost().getComponent('Transform2dComponent');
    
    if (!transform) {
      return null;
    }
    
    // Get position and scale from transform
    const x = transform.x || 0;
    const y = transform.y || 0;
    let width, height;

    if (transform.scaleX && transform.scaleY) {
      // Use individual scales if available
      width = (transform.width !== undefined ? transform.width : 
               (transform.height * (transform.scaleX || 1))) || 50;
      height = (transform.height !== undefined ? transform.height :
                (transform.width * (transform.scaleY || 1))) || 50;
    } else if (transform.scale) {
      // Use single scale factor
      const defaultDim = transform.width !== undefined ? transform.width : 
                         (transform.height || 50);
      width = defaultDim * transform.scale;
      height = defaultDim * transform.scale;
    } else {
      // Default to 1x1 unit box
      width = 1;
      height = 1;
    }

    return createAABB({ x, y }, { width, height });
  }

  /**
   * Sets the world collision model for this collider component
   * @param {CollisionModel} model - The collision model to use (should be AABB for this component)
   */
  setCollisionModel(model) {
    super.setCollisionModel(model);
    
    // Validate that the collision model type matches the collider component type
    if (!this._validateCollisionModelCompatibility(model)) {
      Console.warn(`AABBCollider: Incompatible collision model detected. Expected AABB, got ${model.type || 'unknown'}.`);
      this.isCollided() = false;
    }
  }

  /**
   * Validates that the collision model is compatible with this collider component
   * @param {CollisionModel} model - The collision model to validate
   * @returns {boolean} True if models are compatible, false otherwise
   */
  _validateCollisionModelCompatibility(model) {
    // AABB collider should use AABB collision model
    return model && (model.type === 'AABB' || 
                     model.constructor?.name === 'AABBCollisionModel');
  }

  /**
   * Gets the world's collision model from the engine/world
   * 
   * @returns {CollisionModel|null} The active collision model or null if not available
   */
  getWorldCollisionModel() {
    return this.worldCollisionModel;
  }

  /**
   * Performs collision detection using the world's collision model
   * 
   * @param {GameObject} otherObject - The other game object to test for collision
   * @returns {boolean} True if objects are colliding, false otherwise
   */
  checkCollision(otherObject) {
    const thisShape = this.getCollisionShape();
    
    if (!thisShape) {
      return false;
    }

    // Get the other object's AABB shape
    const otherShape = this.getOtherObjectAABB(otherObject);
    
    if (!otherShape) {
      return false;
    }

    // Use the world's collision model for testing
    const collisionModel = this.getWorldCollisionModel();
    
    if (collisionModel && collisionModel.testCollision) {
      this.isCollided(collisionModel.testCollision(thisShape, otherShape));
    } else {
      // Fallback to simple AABB overlap check if no collision model available
      this.isCollided(this._simpleAABBOverlap(otherObject));
    }

    return this.isCollided();    
  }

  /**
   * Gets the other object's AABB shape for collision testing
   * @param {GameObject} otherObject - The game object to create AABB for
   * @returns {Object|null} AABB collision shape or null if unable to create
   */
  getOtherObjectAABB(otherObject) {
    // Try to get the collider component first
    const otherColliders = otherObject.getComponentsByType('ColliderPart');
    
    for (const collider of otherColliders) {
      const shape = collider.getCollisionShape();
      if (shape && shape.type === 'AABB') {
        return shape;
      }
    }
    
    // If no collider found, try to create AABB directly from transform
    const tempCollider = this.getHost().getComponent('Transform2dComponent');
    return this.getWorldCollisionModel()?.createAABB(otherObject) || null;
  }

  /**
   * Fallback simple AABB overlap check if collision model not available
   * @param {GameObject} otherObject - The other game object to test
   * @returns {boolean} True if overlapping, false otherwise
   */
  _simpleAABBOverlap(otherObject) {
    const otherTransform = otherObject.getComponent('Transform2dComponent');
    
    if (!otherTransform) {
      return false;
    }

    const thisShape = this.getCollisionShape();
    
    // Get the other object's AABB shape using transform data
    const otherShape = {
      x: otherTransform.x || 0,
      y: otherTransform.y || 0,
      width: otherTransform.scale ? 
             (otherTransform.width !== undefined ? otherTransform.width : 
              (otherTransform.height || 50)) * otherTransform.scale : 50,
      height: otherTransform.scale ? 
              (otherTransform.height !== undefined ? otherTransform.height :
               (otherTransform.width || 50)) * otherTransform.scale : 50
    };

    // Simple AABB overlap check
    const minX1 = thisShape.x;
    const maxX1 = thisShape.x + thisShape.width;
    const minY1 = thisShape.y;
    const maxY1 = thisShape.y + thisShape.height;

    const minX2 = otherShape.x;
    const maxX2 = otherShape.x + otherShape.width;
    const minY2 = otherShape.y;
    const maxY2 = otherShape.y + otherShape.height;

    return !(maxX1 < minX2 || maxX2 < minX1 || 
             maxY1 < minY2 || maxY2 < minY1);
  }

  /**
   * Calculates penetration depth and collision normal using the world's collision model
   * 
   * @param {GameObject} otherObject - The other game object to test for collision
   * @returns {Object|null} Collision info with penetration and normal, or null if no collision
   */
  calculateCollisionInfo(otherObject) {
    const thisShape = this.getCollisionShape();
    const otherShape = this.getOtherObjectAABB(otherObject);
    
    if (!thisShape || !otherShape) {
      return null;
    }

    // Use the world's collision model for calculating separating axis
    const collisionModel = this.getWorldCollisionModel();
    
    if (collisionModel && collisionModel.calculateSeparatingAxis) {
      return collisionModel.calculateSeparatingAxis(thisShape, otherShape);
    }
    
    // Return null to indicate no collision info available
    return null;
  }

  /**
   * Updates the collider state based on collision detection results using the world model
   * @param {number} time - Current world time
   * @param {number} deltaTime - Time elapsed since last update
   */
  update(time, deltaTime) {
    super.update(time, deltaTime);
    
    // Clear any stored shape from previous frame
    this._collisionShape = null;
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

export default AABBCollider;