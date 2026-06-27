/**
 * CABC - Center-Aligned Bounding Circle collision shape and model
 * 
 * This class represents a center-aligned bounding circle for efficient broad-phase
 * collision detection. It provides faster collision testing than AABB while still
 * being more precise than simple distance-based checks.
 * 
 * @module Collisions/models/CABC
 */

import Console from '../../core/Console.js';
import CollisionModel from '../CollisionModel.js';
import CollisionShape from '../CollisionShape.js';

/**
 * @class CABCShape
 * Creates a new Center-Aligned Bounding Circle (CABC) shape.
 * 
 * @param {Array} position - The center point of the circle (x, y)
 * @param {number} radius - The radius of the circle.
 * @returns {CABCShape} {@link CABCShape} collision shape with <code>x</code> and <code>y</code> helper properties.
 */
class CABCShape extends CollisionShape {
  constructor(position, radius) {
    super('CABC');
    this.position = position;
    /**
     * The X coordinate of the CABC center point
     * @type {number}
     */
    this.x = position[0];
    /**
     * The Y coordinate of the CABC center point
     * @type {number}
     */
    this.y = position[1];
    this.radius = radius;
  }
}

/**
 * CABC Collision Model - Center-Aligned Bounding Circle collision detection
 * 
 * This model uses center-aligned bounding circles for optimized collision detection.
 * It combines the precision of circle-based testing with computational efficiency.
 * Ideal for games with circular or oval-shaped objects, or when combined with AABB
 * for hybrid collision systems.
 * 
 * @class CABCCollisionModel
 * @extends CollisionModel
 */
class CABCCollisionModel extends CollisionModel {
  /**
   * Creates a new CABCCollisionModel instance
   * @param {Engine|null} engine - Engine instance for raycaster access
   */
  constructor(engine = null) {
    super(engine);
    
    /**
     * Type identifier for this collision model
     * @type {'CABC'}
     */
    this.type = 'CABC';
    
    /**
     * Whether to use uniform circular shape (single radius) or axis-aligned
     * @type {boolean}
     */
    this.uniformCircle = true;
    
    /**
     * CABC shape cache for performance optimization
     * @type {Object|null}
     */
    this.cacheShape = null;
    
    /**
     * Raycasting threshold for distance-based pre-filtering
     * @type {number}
     */
    this.raycastThreshold = 100; // pixels
  }

  /**
   * Gets all collidable objects in the world for broad-phase culling
   * @returns {GameObject[]} Array of GameObjects with collider components
   */
  getCollidableObjects() {
    const collidables = [];
    
    if (!this.engine || !this.engine._world) {
      return collidables;
    }

    const objects = this.engine._world.objects;
    for (const obj of objects) {
      const collider = obj.getComponent('ColliderComponent');
      
      // Only include objects with CABCColliderComponent or Transform2dComponent
      if (collider && collider instanceof CABCColliderComponent) {
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
   * Creates a CABC shape from a GameObject's position and scale/geometry
   * @param {GameObject} gameObject - The game object to create CABC for
   * @returns {CABCShape|null} {@link CABCShape} collision shape or null if unable to create
   */
  createCABC(gameObject) {
    const transform = gameObject.getComponent('Transform2dComponent');
    
    if (!transform) {
      return null;
    }

    let radius;

    if (this.uniformCircle) {
      // Uniform circular bounding - use minimum dimension for conservative collision
      let width, height;
      
      if (transform.width !== undefined && transform.height !== undefined) {
        width = transform.width * transform.scale;
        height = transform.height * transform.scaleY;
      } else if (transform.scale) {
        const defaultDim = transform.width !== undefined ? transform.width : 
                           (transform.height || 50);
        width = defaultDim * transform.scale;
        height = defaultDim * transform.scale;
      } else {
        width = 50; // Default dimension
        height = 50;
      }
      
      const minDim = Math.min(width, height);
      radius = minDim / 2;
    } else {
      // Axis-aligned bounding circle - different radii per axis
      let scaleX = transform.scaleX || transform.scale || 1;
      let scaleY = transform.scaleY || 1;

      let width, height;
      
      if (transform.width !== undefined && transform.height !== undefined) {
        width = transform.width * scaleX;
        height = transform.height * scaleY;
      } else {
        const defaultDim = transform.width !== undefined ? transform.width : 
                           (transform.height || 50);
        width = defaultDim * scaleX;
        height = defaultDim * scaleY;
      }
      
      radiusX = width / 2;
      radiusY = height / 2;
    }

    return new CABCShape({ x: transform.x, y: transform.y }, radius);
  }

  /**
   * Tests collision between two CABC shapes using circle-circle intersection
   * @param {Object} shape1 - First CABC (must have x, y, and radius)
   * @param {Object} shape2 - Second CABC
   * @returns {boolean} True if circles intersect, false otherwise
   */
  testCollision(shape1, shape2) {
    const s1 = shape1 || this.cacheShape;
    const s2 = shape2 || this.cacheShape;

    if (!s1 || !s2) {
      return false;
    }

    // Calculate distance between centers
    const dx = s1.x - s2.x;
    const dy = s1.y - s2.y;
    const distanceSquared = dx * dx + dy * dy;

    // For uniform circles, check if distance < sum of radii
    const r1 = s1.radius || 0;
    const r2 = s2.radius || 0;

    return distanceSquared < (r1 + r2) * (r1 + r2);
  }

  /**
   * Calculates separating axis for CABC collision response
   * For circles, the separating axis is always along the line connecting centers
   * @param {Object} shape1 - First CABC
   * @param {Object} shape2 - Second CABC
   * @returns {Object|null} Collision info with penetration and normal, or null if no collision
   */
  calculateSeparatingAxis(shape1, shape2) {
    const thisShape = shape1 || this.cacheShape;
    const otherShape = shape2 || this.cacheShape;

    if (!thisShape || !otherShape) {
      return null;
    }

    // Calculate radii (handle both uniform and non-uniform)
    let thisRadius = thisShape.radius || 
                     (thisShape.radiusX !== undefined ? 
                      Math.min(thisShape.radiusX, thisShape.radiusY) : 0);
    
    let otherRadius = otherShape.radius ||
                      (otherShape.radiusX !== undefined ? 
                       Math.min(otherShape.radiusX, otherShape.radiusY) : 0);

    if (!thisRadius || !otherRadius) {
      return null;
    }

    // Calculate distance between centers
    const dx = thisShape.x - otherShape.x;
    const dy = thisShape.y - otherShape.y;
    const distanceSquared = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSquared);

    // Check for overlap
    if (distance >= thisRadius + otherRadius) {
      return null; // No collision
    }

    // Calculate penetration depth
    const penetrationDepth = (thisRadius + otherRadius) - distance;

    // Calculate collision normal (direction from one circle center to the other)
    let normal;
    if (distance > 0.0001) {
      normal = {
        x: dx / distance,
        y: dy / distance
      };
    } else {
      // Circles are concentric - use arbitrary normal
      normal = { x: 1, y: 0 };
    }

    return {
      penetration: penetrationDepth,
      normal: normal
    };
  }

  /**
   * Casts a ray against CABC shapes for precise collision testing
   * @param {number} originX - Ray origin X coordinate
   * @param {number} originY - Ray origin Y coordinate
   * @param {number} directionX - Ray direction X (normalized)
   * @param {number} directionY - Ray direction Y (normalized)
   * @param {number} shapeX - CABC center X
   * @param {number} shapeY - CABC center Y
   * @param {number} radius - CABC radius
   * @returns {Object|null} Hit result or null if no intersection
   */
  static castRay(originX, originY, directionX, directionY, 
                 shapeX, shapeY, radius) {
    // Ray-circle intersection using quadratic equation
    
    const ox = originX;
    const oy = originY;
    const dx = directionX;
    const dy = directionY;
    
    const cx = shapeX;
    const cy = shapeY;

    // Vector from circle center to ray origin
    const vcx = ox - cx;
    const vcy = oy - cy;

    // Calculate quadratic equation coefficients
    // t^2*(dx^2 + dy^2) + 2*t*dx*vcx + vcx^2 + vcy^2 - r^2 = 0
    
    const a = dx * dx + dy * dy;
    const b = 2 * dx * vcx + 2 * dy * vcy;
    const c = vcx * vcx + vcy * vcy - radius * radius;

    // Discriminant
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return null; // No intersection
    }

    // Calculate hit points
    const sqrtDiscriminant = Math.sqrt(discriminant);
    
    let t1 = (-b - sqrtDiscriminant) / (2 * a);
    let t2 = (-b + sqrtDiscriminant) / (2 * a);

    // Return the first valid hit (closest intersection)
    if (t1 >= 0) {
      const hitX = ox + t1 * dx;
      const hitY = oy + t1 * dy;
      
      // Calculate normal at hit point
      let normalX, normalY;
      const dist = Math.sqrt((hitX - cx) ** 2 + (hitY - cy) ** 2);
      
      if (dist > 0.0001) {
        normalX = (hitX - cx) / dist;
        normalY = (hitY - cy) / dist;
      } else {
        normalX = dx;
        normalY = dy;
      }

      // Ensure normal points towards ray direction
      const dotProduct = normalX * dx + normalY * dy;
      if (dotProduct < 0) {
        normalX = -normalX;
        normalY = -normalY;
      }

      return {
        point: { x: hitX, y: hitY },
        normal: { x: normalX, y: normalY },
        distance: t1,
        entry: true
      };
    }

    // Try second intersection if first was behind the ray origin
    if (t2 >= 0) {
      const hitX = ox + t2 * dx;
      const hitY = oy + t2 * dy;
      
      // Calculate normal at hit point
      let normalX, normalY;
      const dist = Math.sqrt((hitX - cx) ** 2 + (hitY - cy) ** 2);
      
      if (dist > 0.0001) {
        normalX = (hitX - cx) / dist;
        normalY = (hitY - cy) / dist;
      } else {
        normalX = dx;
        normalY = dy;
      }

      return {
        point: { x: hitX, y: hitY },
        normal: { x: normalX, y: normalY },
        distance: t2,
        entry: true
      };
    }

    // Ray starts inside the circle - return ray direction as initial normal
    return {
      point: { x: ox, y: oy },
      normal: { x: dx, y: dy },
      distance: 0,
      entry: false
    };
  }
}

export default CABCCollisionModel;

export {
  CABCShape
};