/**
 * ConvexHullColliderComponent - Convex hull collision detection
 * 
 * This collider component uses the world's convex hull collision model for collision detection
 * instead of internal SAT logic. It considers the position and scale of the GameObject to 
 * calculate the convex hull based on render context type.
 * 
 * @class ConvexHullColliderComponent
 * @extends ColliderComponent
 */

import ColliderComponent from './ColliderComponent.js';
import Console from '../../core/Console.js';
import ConvexHullCollisionModel from '../../collisions/models/ConvexHull.js';

/**
 * Creates a new ConvexHullColliderComponent instance
 * @param {String|null} name - The name of the collider component
 * @param {Engine|null} engine - Optional reference to the Engine for global event access
 */
class ConvexHullColliderComponent extends ColliderComponent {
  /**
   * Creates a ConvexHullColliderComponent that detects collisions using convex hulls.
   * For vector objects, hull is based on points. For raster objects, hull is based on pixels.
   * 
   * @constructor
   * @param {String|null} name - The optional name of the collider component
   * @param {Engine|null} engine - Optional engine reference
   */
  constructor(name = 'ConvexHullColliderComponent', engine = null) {
    super(name, engine);
    
    /**
     * Flag indicating if object is currently colliding
     * @type {boolean}
     */
    this.isColliding = false;
    
    /**
     * Points defining the convex hull (vector objects) or pixel bounds (raster objects)
     * @type {Array|null}
     */
    this.hullPoints = null;
    
    /**
     * Reference to the render context type ('vector' or 'raster')
     * @type {string|null}
     */
    this.renderContextType = null;
        
    /**
     * Reference to the convex hull collision model from the world
     * @type {ConvexHullCollisionModel|null}
     */
    this.convexHullCollisionModel = null;
  }

  /**
   * Overrides setCollisionModel to validate ConvexHullColliderComponent compatibility
   * and warn if an incompatible collision model is used.
   * 
   * @param {CollisionModel} collisionModel - The collision model from GameWorld
   */
  setCollisionModel(collisionModel) {
    super.setCollisionModel(collisionModel);
    
    // Validate that the collision model type matches the collider component type
    if (collisionModel && collisionModel.type !== 'ConvexHull') {
      Console.warn(
        `ConvexHullColliderComponent: Incompatible collision model detected. ` +
        `Expected ConvexHullCollisionModel, got ${collisionModel.type || 'unknown'}.` +
        `This may cause unexpected collision behavior.`
      );
    }
  }

  /**
   * Gets the world's ConvexHull collision model for this collider component
   * 
   * @returns {ConvexHullCollisionModel|null} The active ConvexHullCollisionModel or null if not set
   */
  getConvexHullCollisionModel() {
    return this.convexHullCollisionModel;
  }

  /**
   * Sets the convex hull collision model from the world engine/world
   * 
   * @param {ConvexHullCollisionModel} convexHullCollisionModel - The ConvexHullCollisionModel to use
   */
  setConvexHullCollisionModel(convexHullCollisionModel) {
    this.convexHullCollisionModel = convexHullCollisionModel;
  }

  /**
   * Overrides getCollisionShape to calculate and return a convex hull based on 
   * object type (vector points or raster pixels)
   * 
   * @returns {Object} The convex hull collision shape with polygon points
   */
  getCollisionShape() {
    const position = this.getPosition();
    
    if (!this.hullPoints) {
      // Calculate hull based on render context type
      this.hullPoints = this._calculateHullFromContextType(position);
    }
    
    return {
      type: 'ConvexHull',
      points: this.hullPoints
    };
  }

  /**
   * Calculates convex hull from the appropriate data source based on render context type
   * 
   * @param {Object} position - Position of the object
   * @returns {Array} Array of points forming the convex hull
   */
  _calculateHullFromContextType(position) {
    if (!this.gameObject || !this.gameObject.engine) {
      return null;
    }
    
    const engine = this.gameObject.engine;
    
    // Check render context type from Engine configuration or default
    if (!this.renderContextType && engine) {
      this.renderContextType = engine.config?.renderContextType || 'raster';
    }
    
    let points;
    
    if (this.renderContextType === 'vector') {
      // For vector objects, use transform scale and position to create hull
      const transform = this.gameObject.getComponent('Transform2dComponent');
      
      if (!transform) {
        return null;
      }
      
      const scale = transform.scale || 1;
      const width = scale * (transform.width || 50); // Default to 50 units
      const height = scale * (transform.height || 30); // Default to 30 units
      
      // Create a convex hull based on bounding box corners
      points = [
        { x: position.x, y: position.y - height / 2 },     // Top center
        { x: position.x + width / 2, y: position.y },      // Right center
        { x: position.x, y: position.y + height / 2 },     // Bottom center
        { x: position.x - width / 2, y: position.y }       // Left center
      ];
      
    } else {
      // For raster objects, use pixel boundaries for hull calculation
      points = this._calculateRasterHull(position);
    }
    
    return points;
  }

  /**
   * Calculates convex hull based on raster/pixel data
   * Uses the bounding box of all visible pixels as the hull approximation
   * 
   * @param {Object} position - Position of the raster object
   * @returns {Array} Array of pixel boundary points
   */
  _calculateRasterHull(position) {
    // For raster objects, we use a simplified approach:
    // Calculate bounding box from visible pixels (or use sprite dimensions if available)
    
    const sprite = this.gameObject.getComponent('RasterRenderComponent');
    
    if (!sprite || !sprite.width || !sprite.height) {
      // Default to simple square hull if no sprite data
      return [
        { x: position.x - 25, y: position.y - 25 },
        { x: position.x + 25, y: position.y - 25 },
        { x: position.x + 25, y: position.y + 25 },
        { x: position.x - 25, y: position.y + 25 }
      ];
    }
    
    // Use sprite dimensions for hull calculation
    const halfWidth = sprite.width / 2;
    const halfHeight = sprite.height / 2;
    
    return [
      { x: position.x - halfWidth, y: position.y - halfHeight },   // Top-left
      { x: position.x + halfWidth, y: position.y - halfHeight },   // Top-right
      { x: position.x + halfWidth, y: position.y + halfHeight },   // Bottom-right
      { x: position.x - halfWidth, y: position.y + halfHeight }    // Bottom-left
    ];
  }

  /**
   * Checks collision with another object using the ConvexHull collision model from the world
   * 
   * @param {GameObject} otherObject - The other game object to test for collision
   * @returns {boolean} True if colliding, false otherwise
   */
  checkCollision(otherObject) {
    // Check if we have a compatible ConvexHull collision model set
    const collisionModel = this.convexHullCollisionModel;
    
    if (!collisionModel || !this.worldCollisionModel) {
      // No collision model - cannot perform collision detection using model
      return false;
    }
    
    // Get collision shapes for both objects
    const thisShape = this.getCollisionShape();
    const otherColliders = otherObject.getComponentsByType('ConvexHullColliderComponent');
    
    if (otherColliders.length === 0) {
      // No ConvexHull collider on other object - cannot check collision
      return false;
    }
    
    const otherShape = otherColliders[0].getCollisionShape();
    
    // Use the ConvexHull collision model for testing
    try {
      this.isCollided(collisionModel.testCollision(thisShape, otherShape));
      return this.isCollided();
    } catch (error) {
      Console.error(
        `ConvexHullColliderComponent: Error during collision detection. ` +
        `This may be due to incompatible collision model.`
      );
      return false;
    }
  }

  /**
   * Calculates the separating axis and penetration depth using ConvexHull collision model
   * 
   * @param {GameObject} otherObject - The other game object to test for collision
   * @returns {Object|null} Collision info with penetration and normal, or null if no collision
   */
  calculateCollisionInfo(otherObject) {
    const collisionModel = this.convexHullCollisionModel;
    
    if (!collisionModel || !this.worldCollisionModel) {
      return null;
    }
    
    // Get collision shapes for both objects
    const thisShape = this.getCollisionShape();
    const otherColliders = otherObject.getComponentsByType('ConvexHullColliderComponent');
    
    if (otherColliders.length === 0) {
      return null;
    }
    
    const otherShape = otherColliders[0].getCollisionShape();
    
    // Use the ConvexHull collision model for calculating separating axis
    try {
      return collisionModel.calculateSeparatingAxis(thisShape, otherShape);
    } catch (error) {
      Console.error(
        `ConvexHullColliderComponent: Error calculating collision info.` +
        `This may be due to incompatible collision model.`
      );
      return null;
    }
  }

  /**
   * Removes this component from the game object
   */
  destroy() {
    if (this.gameObject) {
      this.gameObject.removeComponent(this);
      this._gameObject = null;
      this.hullPoints = null;
      this.convexHullCollisionModel = null;
    }
  }
}

export default ConvexHullColliderComponent;