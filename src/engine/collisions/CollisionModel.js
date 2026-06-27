/**
 * CollisionModel - Base class for collision detection models
 * 
 * This abstract base class provides the interface and core functionality for
 * collision detection models used in the RenderEngine4 world. Each concrete
 * implementation supports broad-phase collision detection optimized for
 * performance, and optional raycasting for precise collision testing.
 * 
 * @abstract
 * @module Collisions/CollisionModel
 */

import Console from '../core/Console.js';
// import { AABBShape, AABBCollisionModel } from './models/AABB.js';
// import CABCCollisionModel from './models/CABC.js';
import RenderEngineError from '../core/RenderEngineError.js';

/**
 * Collision model error class for collision-related errors.
 * @param {CollisionModel} collisionModel - The collision model used for the test
 * @param {String} message - The error message
 * @param {Error} rootCause - Optional root cause Error instance
 * @extends RenderEngineError
 */
class CollisionModelError extends RenderEngineError {
  constructor(collisionModel, message, rootCause) {
    super(message, rootCause);
    this.collisionModel = collisionModel;
  }
};

/**
 * Creates a new CollisionModel instance
 * @abstract - Must be implemented by subclasses
 * @param {Object} gameObject - The game object this model is attached to
 * @param {Engine|null} engine - Optional Engine reference for raycaster access
 */
export default class CollisionModel {
  constructor(engine) {
    this.engine = engine;
    
    this.raycaster = new Raycaster(engine); // Will be initialized when needed
    
    /**
     * Collision model type identifier
     * @type {'AABB'|'CABC'|'ConvexHull'}
     */
    this.type = 'AABB'; // Default, will be overridden by subclasses
    
    /**
     * Whether raycasting is enabled for precise collision testing
     * @type {boolean}
     */
    this.enableRaycasting = true;
  }

  /**
   * Gets all collidable objects in the world for broad-phase culling
   * @returns {GameObject[]} Array of GameObjects that can participate in collisions
   */
  getCollidableObjects() {
    const objects = [];
    // Implement broad-phase culling based on model type
    return objects;
  }

  /**
   * Tests collision between two collision shapes
   * @param {Object} shape1 - First collision shape (must have 'type' and geometry)
   * @param {Object} shape2 - Second collision shape
   * @returns {boolean} True if shapes are colliding, false otherwise
   */
  testCollision(shape1, shape2) {
    // Abstract method - must be implemented by subclasses
    throw new CollisionModelError(this, `${this.constructor.name}: testCollision() must be implemented by subclass`);
  }

  /**
   * Calculates separating axis for collision response (SAT-based)
   * @param {Object} shape1 - First shape
   * @param {Object} shape2 - Second shape
   * @returns {Object|null} Separating axis info or null if colliding
   */
  calculateSeparatingAxis(shape1, shape2) {
    // Abstract method - must be implemented by subclasses
    throw new CollisionModelError(this, `${this.constructor.name}: calculateSeparatingAxis() must be implemented by subclass`);
  }

  /**
   * Creates an AABB shape from a GameObject for broad-phase testing
   * @param {GameObject} gameObject - The game object to get AABB for
   * @returns {AABBShape|null} AABB collision shape or null if unable to create
   */
  createAABB(gameObject) {
    return new AABBShape(null, null); // Default implementation returns empty AABB
  }

  /**
   * Tests ray casting against collidable objects in the world
   * @param {Vector2D} origin - Ray origin point
   * @param {Vector2D} direction - Ray direction vector (normalized)
   * @returns {Array<Object>} Array of collision results with intersection data
   */
  castRay(origin, direction) {
    if (!this.raycaster) {
      return [];
    }

    const hits = this.raycaster.cast(
      origin.x,
      origin.y,
      direction.x,
      direction.y
    );

    return hits.map(hit => ({
      point: hit.point || origin,
      normal: hit.normal || { x: 0, y: 1 },
      depth: hit.distance || 0,
      gameObject: hit.gameObject || null,
      collisionModel: this.type
    }));
  }

  /**
   * Destroys the collision model and cleans up resources
   */
  destroy() {
    this.raycaster = null;
    this.engine = null;
  }
};

/**
 * Raycaster class for precise ray-based collision testing
 * @private
 */
class Raycaster {
  /**
   * Creates a new Raycaster
   * @param {Engine} engine - The Engine instance
   */
  constructor(engine) {
    this.engine = engine;
    this.worldCollisionModel = null;
  }

  /**
   * Casts a ray against collidable objects
   * @param {number} originX - Ray origin X coordinate
   * @param {number} originY - Ray origin Y coordinate
   * @param {number} directionX - Ray direction X (normalized)
   * @param {number} directionY - Ray direction Y (normalized)
   * @returns {Array<Object>} Array of hit results
   */
  cast(originX, originY, directionX, directionY) {
    const hits = [];

    // Need world collision model reference for ray testing
    if (!this.worldCollisionModel || !this.engine.world) {
      return hits;
    }

    const collidables = this.worldCollisionModel.getCollidableObjects();

    for (const obj of collidables) {
      const collider = obj.getComponent('ColliderComponent');
      
      if (!collider || !(obj.getComponent('Transform2dComponent'))) {
        continue;
      }

      // Get collision shape
      const shape = collider.getCollisionShape();
      if (!shape) {
        continue;
      }

      // Test ray against this object's collision shape
      const hit = this._castRayToShape(
        originX,
        originY,
        directionX,
        directionY,
        shape
      );

      if (hit && !hits.some(h => h.gameObject === obj)) {
        hits.push(hit);
      }
    }

    return hits;
  }

  /**
   * Casts ray against a single collision shape
   * @param {number} ox - Origin X
   * @param {number} oy - Origin Y  
   * @param {number} dx - Direction X (normalized)
   * @param {number} dy - Direction Y (normalized)
   * @param {Object} shape - Collision shape to test against
   * @returns {Object|null} Hit result or null if no intersection
   */
  _castRayToShape(ox, oy, dx, dy, shape) {
    const type = shape.type;

    switch (type) {
      case 'AABB':
        return AABBCollisionModel.castRay(ox, oy, dx, dy, shape.x, shape.y, shape.width, shape.height);
      
      case 'CABC':
        if (!shape.radius) {
          return null;
        }
        return CABCCollisionModel.castRay(ox, oy, dx, dy, shape.x, shape.y, shape.radius);
      
      case 'ConvexHull':
        // For convex hulls, use ray casting against each edge
        if (!shape.points || shape.points.length < 3) {
          return null;
        }
        return this._castRayToPolygon(ox, oy, dx, dy, shape.points);

      default:
        return null;
    }
  }

  /**
   * Casts ray against a polygon using SAT-based ray shooting
   * @param {number} ox - Origin X
   * @param {number} oy - Origin Y
   * @param {number} dx - Direction X (normalized)
   * @param {number} dy - Direction Y (normalized)
   * @param {Array<Object>} points - Polygon vertices
   * @returns {Object|null} Hit result or null
   */
  _castRayToPolygon(ox, oy, dx, dy, points) {
    // Find all ray-polygon edge intersections
    const intersections = [];

    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];

      const hit = this._intersectRayWithLineSegment(
        ox, oy, dx, dy,
        p1.x, p1.y, p2.x, p2.y
      );

      if (hit) {
        intersections.push(hit);
      }
    }

    // Return closest intersection inside polygon
    if (intersections.length === 0) {
      return null;
    }

    const minHit = intersections.reduce((min, hit) => 
      hit.distance < minHit.distance ? hit : minHit
    );

    // Calculate normal for the intersected edge
    const p1 = points[minHit.index];
    const p2 = points[(minHit.index + 1) % points.length];

    return {
      point: { x: minHit.point.x, y: minHit.point.y },
      normal: this._calculateEdgeNormal(p1.x - p2.x, p2.y - p1.y),
      distance: minHit.distance,
      index: minHit.index
    };
  }

  /**
   * Finds intersection between ray and line segment using parametric representation
   * @param {number} ox - Ray origin X
   * @param {number} oy - Ray origin Y
   * @param {number} dx - Ray direction X (normalized)
   * @param {number} dy - Ray direction Y (normalized)
   * @param {number} lx1 - Line segment point 1 X
   * @param {number} ly1 - Line segment point 1 Y
   * @param {number} lx2 - Line segment point 2 X
   * @param {number} ly2 - Line segment point 2 Y
   * @returns {Object|null} Intersection data or null
   */
  _intersectRayWithLineSegment(ox, oy, dx, dy, lx1, ly1, lx2, ly2) {
    // Ray: P = O + t*D where O=(ox,oy), D=(dx,dy), t>=0
    // Line: P = A + u*B where A=(lx1,ly1), B=(lx2-lx1, ly2-ly1), 0<=u<=1
    
    const ax = ox;
    const ay = oy;
    const bx = lx2 - lx1;
    const by = ly2 - ly1;
    
    // Ray direction normalized (dx, dy)
    const rx = dx;
    const ry = dy;

    // Solve for intersection using cross product method
    const denom = by * dx - bx * dy;

    if (Math.abs(denom) < 0.0001) {
      return null; // Lines are parallel
    }

    const t = ((lx1 - ox) * by - (ly1 - oy) * bx) / denom;
    const u = ((ly1 - oy) * dx - (lx1 - ox) * dy) / denom;

    // Check if intersection is valid (t >= 0 and 0 <= u <= 1)
    if (t >= 0 && u >= 0 && u <= 1) {
      return {
        point: {
          x: ox + t * dx,
          y: oy + t * dy
        },
        distance: t,
        index: 0
      };
    }

    return null;
  }

  /**
   * Calculates normal vector for an edge
   * @param {number} edgeX - Edge vector X (lx2 - lx1)
   * @param {number} edgeY - Edge vector Y (ly2 - ly1)
   * @returns {Object} Normalized normal vector
   */
  _calculateEdgeNormal(edgeX, edgeY) {
    // Normal is perpendicular to edge: (-dy, dx) for counter-clockwise winding
    const length = Math.sqrt(edgeX * edgeX + edgeY * edgeY);

    if (length < 0.0001) {
      return { x: 0, y: 1 }; // Default upward normal
    }

    return {
      x: -edgeY / length,
      y: edgeX / length
    };
  }
}

export {
  CollisionModelError,
  Raycaster
};