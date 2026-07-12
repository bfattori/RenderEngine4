/**
 * AABB - Axis-Aligned Bounding Box collision shape and model
 * 
 * This class represents an axis-aligned bounding box for broad-phase collision detection.
 * It is optimized for performance and provides both static and raycasting-based testing.
 * 
 * @module Collisions/models/AABB
 */

import Console from '../../core/Console.js';
import CollisionModel from '../CollisionModel.js';
import CollisionShape from '../CollisionShape.js';

/**
 * @class AABBShape
 * Creates a new Axis-Aligned Bounding Box (AABB) shape.
 * 
 * @param {Object} position - Box position (x, y)
 * @param {number} width - Box width
 * @param {number} height - Box height
 * @returns {AABBShape} {@link AABBShape} collision shape with <code>x, y, width,</code> and <code>height</code> helper properties.
 */
class AABBShape extends CollisionShape {
  constructor(position = null, size = null) {
    super('AABB');
    this.position = position ? position : [0, 0];
    this.x = position ? position[0] : 0;
    this.y = position ? position[1] : 0;
    this.size = size ? size : [0, 0];
    this.width = size ? size[0] : 0;
    this.height = size ? size[1] : 0;
  }
};

/**
 * AABB Collision Model - Axis-Aligned Bounding Box collision detection
 * 
 * This model uses axis-aligned bounding boxes for efficient broad-phase collision
 * detection. It is the fastest and most commonly used model for simple games.
 * 
 * @class AABBCollisionModel
 * @extends CollisionModel
 */
export default class AABBCollisionModel extends CollisionModel {
  /**
   * Creates a new AABBCollisionModel instance
   * @param {Engine|null} engine - Engine instance for raycaster access
   */
  constructor(engine = null) {
    super(engine);
    
    /**
     * Type identifier for this collision model
     * @type {'AABB'}
     */
    this.type = 'AABB';
    
    /**
     * Whether to use simple overlap testing (faster but less precise)
     * @type {boolean}
     */
    this.simpleOverlap = false;
    
    /**
     * AABB shape cache for performance optimization
     * @type {Object|null}
     */
    this.cacheShape = null;
  }

  /**
   * Gets all collidable objects in the world for broad-phase culling
   * @returns {GameObject[]} Array of GameObjects with collider components
   */
  getCollidableObjects() {
    const collidables = [];
    
    // Get all GameObjects from the engine's world
    if (!this.engine || !this.engine.world) {
      return collidables;
    }

    const objects = this.engine.world.allObjects;
    for (const obj of objects) {
      const collider = obj.getComponent('ColliderComponent');
      
      // Only include objects with AABBColliderComponent or Transform2dComponent
      if (collider && collider instanceof AABBColliderComponent) {
        collidables.push(obj);
      } else {
        // Include any object that has a transform component for broad-phase
        const transform = obj.getComponent('Transform2dComponent');
        if (transform) {
          collidables.push(obj);
        }
      }
    }

    return collidables;
  }

  /**
   * Creates an AABB shape from a GameObject's position and scale
   * @param {GameObject} gameObject - The game object to create AABB for
   * @returns {AABBShape|null} {@link AABBShape} collision shape or null if unable to create
   */
  createAABB(gameObject) {
    const transform = gameObject.getComponent('Transform2dComponent');
    
    if (!transform) {
      return null;
    }

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

    return new AABBShape({ x, y }, { width, height });
  }

  /**
   * Tests collision between two AABB shapes using overlap test
   * @param {Object} shape1 - First AABB (must have x, y, width, height)
   * @param {Object} shape2 - Second AABB
   * @returns {boolean} True if boxes overlap, false otherwise
   */
  testCollision(shape1, shape2) {
    const s1 = shape1 || this.cacheShape;
    const s2 = shape2 || this.cacheShape;

    if (!s1 || !s2) {
      return false;
    }

    // Calculate boundaries
    const minX1 = s1.x;
    const maxX1 = s1.x + s1.width;
    const minY1 = s1.y;
    const maxY1 = s1.y + s1.height;

    const minX2 = s2.x;
    const maxX2 = s2.x + s2.width;
    const minY2 = s2.y;
    const maxY2 = s2.y + s2.height;

    // Check for overlap on X axis
    if (maxX1 < minX2 || maxX2 < minX1) {
      return false;
    }

    // Check for overlap on Y axis
    if (maxY1 < minY2 || maxY2 < minY1) {
      return false;
    }

    return true; // Overlap exists on both axes
  }

  /**
   * Calculates separating axis for AABB-AABB collision response
   * @param {Object} shape1 - First AABB
   * @param {Object} shape2 - Second AABB
   * @returns {Object|null} Collision info with penetration and normal, or null if no collision
   */
  calculateSeparatingAxis(shape1, shape2) {
    const thisShape = shape1 || this.cacheShape;
    const otherShape = shape2 || this.cacheShape;

    if (!thisShape || !otherShape) {
      return null;
    }

    // Calculate boundaries
    const thisBounds = {
      minX: thisShape.x,
      maxX: thisShape.x + thisShape.width,
      minY: thisShape.y,
      maxY: thisShape.y + thisShape.height
    };

    const otherBounds = {
      minX: otherShape.x,
      maxX: otherShape.x + otherShape.width,
      minY: otherShape.y,
      maxY: otherShape.y + otherShape.height
    };

    // Calculate overlap on X axis
    let xOverlap;
    if (thisBounds.maxX < otherBounds.minX) {
      xOverlap = otherBounds.minX - thisBounds.maxX;
    } else if (otherBounds.maxX < thisBounds.minX) {
      xOverlap = thisBounds.minX - otherBounds.maxX;
    } else {
      xOverlap = 0;
    }

    // Calculate overlap on Y axis
    let yOverlap;
    if (thisBounds.maxY < otherBounds.minY) {
      yOverlap = otherBounds.minY - thisBounds.maxY;
    } else if (otherBounds.maxY < thisBounds.minY) {
      yOverlap = thisBounds.minY - otherBounds.maxY;
    } else {
      yOverlap = 0;
    }

    // Determine collision normal and penetration depth
    let penetrationDepth = 0;
    const normal = { x: 0, y: 0 };

    if (xOverlap === 0) {
      // X-axis penetration is minimal - collision from X direction
      normal.x = xOverlap < 0 ? 1 : -1;
      normal.y = 0;
      penetrationDepth = Math.abs(xOverlap);
    } else if (yOverlap === 0) {
      // Y-axis penetration is minimal - collision from Y direction
      normal.x = 0;
      normal.y = yOverlap < 0 ? 1 : -1;
      penetrationDepth = Math.abs(yOverlap);
    } else {
      // Corner overlap - use minimum penetration axis
      if (Math.abs(xOverlap) < Math.abs(yOverlap)) {
        normal.x = xOverlap < 0 ? 1 : -1;
        normal.y = 0;
      } else {
        normal.x = 0;
        normal.y = yOverlap < 0 ? 1 : -1;
      }
      penetrationDepth = Math.min(Math.abs(xOverlap), Math.abs(yOverlap));
    }

    return {
      penetration: penetrationDepth,
      normal: normal
    };
  }

  /**
   * Casts a ray against AABB shapes for precise collision testing
   * @param {number} originX - Ray origin X coordinate
   * @param {number} originY - Ray origin Y coordinate
   * @param {number} directionX - Ray direction X (normalized)
   * @param {number} directionY - Ray direction Y (normalized)
   * @param {number} shapeX - AABB X position
   * @param {number} shapeY - AABB Y position
   * @param {number} shapeWidth - AABB width
   * @param {number} shapeHeight - AABB height
   * @returns {Object|null} Hit result or null if no intersection
   */
  static castRay(originX, originY, directionX, directionY, 
                 shapeX, shapeY, shapeWidth, shapeHeight) {
    // Use Slab Method for ray-AABB intersection
    
    // Calculate min/max slab boundaries for the AABB
    const minX = shapeX;
    const maxX = shapeX + shapeWidth;
    const minY = shapeY;
    const maxY = shapeY + shapeHeight;

    // Ray equation: P(t) = O + t*D where O=(originX, originY), D=(dx, dy)
    const ox = originX;
    const oy = originY;
    const dx = directionX;
    const dy = directionY;

    // Slab method - calculate entry and exit times for each pair of slabs
    let tmin1, tmax1, tmin2, tmax2;

    if (Math.abs(dx) < 0.00001) {
      // Ray parallel to X axis - check if ray passes through slab in Y
      if (oy <= minY || oy >= maxY) {
        return null; // No intersection
      }
      tmin1 = Number.NEGATIVE_INFINITY;
      tmax1 = Number.POSITIVE_INFINITY;
    } else {
      const t1 = (minX - ox) / dx;
      const t2 = (maxX - ox) / dx;
      
      tmin1 = Math.max(tmin1, Math.min(t1, t2));
      tmax1 = Math.min(tmax1, Math.max(t1, t2));
    }

    if (Math.abs(dy) < 0.00001) {
      // Ray parallel to Y axis - check if ray passes through slab in X
      if (ox <= minX || ox >= maxX) {
        return null; // No intersection
      }
      tmin2 = Number.NEGATIVE_INFINITY;
      tmax2 = Number.POSITIVE_INFINITY;
    } else {
      const t1 = (minY - oy) / dy;
      const t2 = (maxY - oy) / dy;
      
      tmin2 = Math.max(tmin2, Math.min(t1, t2));
      tmax2 = Math.min(tmax2, Math.max(t1, t2));
    }

    // Calculate intersection interval
    let t0 = Math.max(tmin1, tmin2);
    let t1 = Math.min(tmax1, tmax2);

    // Check for intersection (t0 <= t1 and t0 >= 0 for ray direction)
    if (t1 < t0 || t0 < 0) {
      return null;
    }

    // Calculate hit point
    const hitX = ox + t0 * dx;
    const hitY = oy + t0 * dy;

    // Determine which face was hit for normal calculation
    let faceNormal = { x: 1, y: 0 }; // Default

    if (tmin1 === tmax1 && Math.abs(dx) > 0.00001) {
      faceNormal.x = dx < 0 ? -1 : 1;
      faceNormal.y = 0;
    } else if (tmin2 === tmax2 && Math.abs(dy) > 0.00001) {
      faceNormal.y = dy < 0 ? -1 : 1;
      faceNormal.x = 0;
    }

    return {
      point: { x: hitX, y: hitY },
      normal: faceNormal,
      distance: t0,
      face: this._getHitFace(hitX, hitY, minX, maxX, minY, maxY)
    };
  }

  /**
   * Determines which face of the AABB was hit by the ray
   * @param {number} hitX - Hit point X coordinate
   * @param {number} hitY - Hit point Y coordinate
   * @param {number} minX - AABB min X
   * @param {number} maxX - AABB max X
   * @param {number} minY - AABB min Y
   * @param {number} maxY - AABB max Y
   * @returns {string} Face name ('left', 'right', 'top', 'bottom')
   */
  static _getHitFace(hitX, hitY, minX, maxX, minY, maxY) {
    const tolerance = 0.0001;
    
    // Check left face first (smallest x value on surface)
    if (Math.abs(hitX - minX) < tolerance && hitY >= minY && hitY <= maxY) {
      return 'left';
    }

    // Check right face
    if (Math.abs(hitX - maxX) < tolerance && hitY >= minY && hitY <= maxY) {
      return 'right';
    }

    // Check bottom face
    if (Math.abs(hitY - minY) < tolerance && hitX >= minX && hitX <= maxX) {
      return 'bottom';
    }

    // Check top face
    if (Math.abs(hitY - maxY) < tolerance && hitX >= minX && hitX <= maxX) {
      return 'top';
    }

    return 'unknown';
  }
}

export {
  AABBShape
};
