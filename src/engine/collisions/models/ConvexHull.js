 /**

ConvexHull - Convex hull collision shape and model
This class represents convex polygon-based collision shapes using the Separating Axis
Theorem (SAT). It provides the most precise collision detection for irregularly-shaped
objects but at a higher computational cost than AABB or CABC models.
@module Collisions/models/ConvexHull 
*/
import Console from '../../core/Console.js';
import CollisionModel from '../CollisionModel.js';
import CollisionShape from '../CollisionShape.js';

/**
 * @class ConvexHullShape
 * Creates a new ConvexHull shape.
 * 
 * @param {Array} points - Array of polygon vertices: [[x, y], [x, y], ...]
 * @returns {ConvexHullShape} Convex hull shape 
*/ 
class ConvexHullShape extends CollisionShape {
    constructor(points = []) {
        super('ConvexHull');
        this.points = points;    
    }
};

/**
ConvexHull Collision Model - Convex polygon collision detection with SAT
This model uses convex hull algorithms combined with the Separating Axis Theorem
for precise collision detection. It's ideal for games requiring high accuracy
and irregularly-shaped objects. Supports raycasting against convex polygons.
@class ConvexHullCollisionModel
@extends CollisionModel 
*/ 
export default class ConvexHullCollisionModel extends CollisionModel { 
    /*
    Creates a new ConvexHullCollisionModel instance
    @param {GameObject} gameObject - Parent game object (optional)
    @param {Engine|null} engine - Engine instance for raycaster access */ 
    constructor(engine = null) { 
        super(engine);
        /**
        Type identifier for this collision model
        @type {'ConvexHull'} 
        */ 
        this.type = 'ConvexHull';
        /**
        Convex hull shape cache for performance optimization
        @type {ConvexHullShape|null} 
        */ 
        this.cacheShape = null;
        /**
        Whether to pre-calculate convex hull (vs calculate on-demand)
        @type {boolean} 
        */ 
        this.precomputeHull = true;
        /**
        Number of subdivisions for ray casting precision
        @type {number} 
        */ 
        this.subdivisions = 8; // More precise but slower 
    }

    /**
    Gets all collidable objects in the world for broad-phase culling
    @returns {GameObject[]} Array of GameObjects with collider components 
    */ 
    getCollidableObjects() { 
        const collidables = [];

        if (!this.engine || !this.engine.world) {
            return collidables;
        }

        const objects = this.engine.world.allObjects;
        for (const obj of objects) {
        const collider = obj.getComponent('ColliderComponent');
        
        // Only include objects with ConvexHullColliderComponent or Transform2dComponent
        if (collider && collider instanceof ConvexHullColliderComponent) {
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
    Creates a convex hull shape from a GameObject's points/bounds
    @param {GameObject} gameObject - The game object to create ConvexHull for
    @returns {ConvexHullShape|null} {@link ConvexHullShape} collision shape or null if unable to create 
    */ 
    createConvexHull(gameObject) { 
        const transform = gameObject.getComponent('Transform2dComponent');

        if (!transform) {
        return null;
        }

        let points;

        // Get points from render component or calculate from bounds
        const renderComponent = gameObject.getComponent('RenderComponent');
        if (renderComponent && renderComponent.getPoints) {
        // Use provided points
        points = renderComponent.getPoints();
        } else if (transform.width !== undefined && transform.height !== undefined) {
        // Calculate hull from object dimensions
        const width = transform.width * transform.scale;
        const height = transform.height * transform.scaleY || transform.scale;
        const centerX = transform.x;
        const centerY = transform.y;
        
        points = [
            { x: centerX - width / 2, y: centerY - height / 2 },   // Bottom-left
            { x: centerX + width / 2, y: centerY - height / 2 },   // Bottom-right
            { x: centerX + width / 2, y: centerY + height / 2 },   // Top-right
            { x: centerX - width / 2, y: centerY + height / 2 }    // Top-left
        ];
        } else {
        // Default to simple square hull
        points = [
            { x: transform.x - 25, y: transform.y - 25 },
            { x: transform.x + 25, y: transform.y - 25 },
            { x: transform.x + 25, y: transform.y + 25 },
            { x: transform.x - 25, y: transform.y + 25 }
        ];
        }

        return new ConvexHullShape(points);
    }

    /**

    Tests collision between two convex hulls using Separating Axis Theorem (SAT)
    @param {ConvexHullShape} shape1 - First ConvexHull (must have 'type' and 'points')
    @param {ConvexHullShape} shape2 - Second ConvexHull
    @returns {boolean} True if hulls intersect, false otherwise */ 
    testCollision(shape1, shape2) { 
        const s1 = shape1 || this.cacheShape; const s2 = shape2 || this.cacheShape;

        if (!s1 || !s2) {
         return false;
        }

        // Test each edge of both polygons as a separating axis
        const allAxes = [];

        // Get axes from first polygon edges
        for (let i = 0; i < s1.points.length; i++) {
            const p1 = s1.points[i];
            const p2 = s1.points[(i + 1) % s1.points.length];
            allAxes.push({ x: p2.x - p1.x, y: p2.y - p1.y });
        }

        // Get axes from second polygon edges
        for (let i = 0; i < s2.points.length; i++) {
            const p1 = s2.points[i];
            const p2 = s2.points[(i + 1) % s2.points.length];
            allAxes.push({ x: p2.x - p1.x, y: p2.y - p1.y });
        }

        // For each axis, project both polygons and check for separation
        for (const axis of allAxes) {
            if (!this._projectAndCheck(s1.points, s2.points, axis)) {
                return false; // Found a separating axis - no collision
            }
        }

        return true; // No separating axis found - polygons intersect
    }

    /**

    Projects both polygons onto an axis and checks for overlap
    @param {Array} polygon1 - First polygon points
    @param {Array} polygon2 - Second polygon points
    @param {Object} axis - Projection axis (x, y)
    @returns {boolean} True if projections overlap, false otherwise */ 
    _projectAndCheck(polygon1, polygon2, axis) { 
        let min1 = Infinity, max1 = -Infinity; let min2 = Infinity, max2 = -Infinity;

        // Project polygon1 onto axis
        for (const point of polygon1) {
        const projection = this._dotProduct(point.x, point.y, axis.x, axis.y);
        min1 = Math.min(min1, projection);
        max1 = Math.max(max1, projection);
        }

        // Project polygon2 onto axis
        for (const point of polygon2) {
        const projection = this._dotProduct(point.x, point.y, axis.x, axis.y);
        min2 = Math.min(min2, projection);
        max2 = Math.max(max2, projection);
        }

        // Check for separation
        if (max1 < min2 || max2 < min1) {
        return false; // Separated on this axis
        }

        return true; // Overlapping on this axis
    }

    /**
    Calculates dot product of two vectors
    @param {number} x1 - First vector X
    @param {number} y1 - First vector Y
    @param {number} x2 - Second vector X
    @param {number} y2 - Second vector Y
    @returns {number} Dot product */ 
    _dotProduct(x1, y1, x2, y2) { 
        return x1 * x2 + y1 * y2; 
    }

    /**

    Calculates separating axis for ConvexHull collision response
    @param {Object} shape1 - First ConvexHull
    @param {Object} shape2 - Second ConvexHull
    @returns {Object|null} Collision info with penetration and normal, or null if no collision */ 
    calculateSeparatingAxis(shape1, shape2) { 
        const thisPolygon = shape1 || this.cacheShape; const otherPolygon = shape2 || this.cacheShape;

        if (!thisPolygon || !otherPolygon) {
            return null;
        }

        let minPenetration = Infinity;
        let collisionNormal = { x: 0, y: 0 };
        let collisionAxis = null;

        // Test each edge as potential separating axis
        const allEdges = [];

        for (const polygon of [thisPolygon, otherPolygon]) {
            for (let i = 0; i < polygon.points.length; i++) {
                const p1 = polygon.points[i];
                const p2 = polygon.points[(i + 1) % polygon.points.length];
                allEdges.push({ x: p2.x - p1.x, y: p2.y - p1.y });
            }
        }

        // Normalize edges to use as axes
        for (const edge of allEdges) {
            const length = Math.sqrt(edge.x * edge.x + edge.y * edge.y);
            if (length > 0.0001) {
                edge.x /= length;
                edge.y /= length;
            }
        }

        for (const axis of allEdges) {
            const projection = this._projectBothAndFindSeparation(
                thisPolygon.points, otherPolygon.points, axis
            );
            
            if (projection.separated) {
                // This is a separating axis with penetration depth
                const penetration = projection.penetration;
                const normal = { x: axis.x, y: axis.y };
                
                if (Math.abs(penetration) < Math.abs(minPenetration)) {
                minPenetration = penetration;
                collisionNormal = normal;
                collisionAxis = axis;
                }
            }
        }

        // Normalize the collision normal
        const magnitude = Math.sqrt(collisionNormal.x ** 2 + collisionNormal.y ** 2);
        if (magnitude > 0.0001) {
            collisionNormal.x /= magnitude;
            collisionNormal.y /= magnitude;
            }

        return minPenetration < Infinity ? {
            penetration: Math.abs(minPenetration),
            normal: collisionNormal,
            separatingAxis: collisionAxis || collisionNormal
        } : null;
    }

    /**

    Projects both polygons onto an axis and finds separation information
    @param {Array} polygon1 - First polygon
    @param {Array} polygon2 - Second polygon
    @param {Object} axis - Projection axis
    @returns {Object} Separation info */ 
    _projectBothAndFindSeparation(polygon1, polygon2, axis) { 
        let min1 = Infinity, max1 = -Infinity; let min2 = Infinity, max2 = -Infinity;


        for (const point of polygon1) {
            const proj = this._dotProduct(point.x, point.y, axis.x, axis.y);
            min1 = Math.min(min1, proj);
            max1 = Math.max(max1, proj);
        }

        for (const point of polygon2) {
            const proj = this._dotProduct(point.x, point.y, axis.x, axis.y);
            min2 = Math.min(min2, proj);
            max2 = Math.max(max2, proj);
        }

        const penetration = Math.max(-max1 + min2, -max2 + min1);

        return {
            separated: penetration > 0,
            penetration: penetration,
            overlapStart: Math.min(min1, min2),
            overlapEnd: Math.max(max1, max2)
        };
    }

    /**

    Casts a ray against ConvexHull shapes for precise collision testing
    Uses SAT-based ray shooting against convex polygons
    @param {number} originX - Ray origin X coordinate
    @param {number} originY - Ray origin Y coordinate
    @param {number} directionX - Ray direction X (normalized)
    @param {number} directionY - Ray direction Y (normalized)
    @param {Object} shape - ConvexHull shape with 'points' array
    @returns {Object|null} Hit result or null if no intersection */ 
    static castRay(originX, originY, directionX, directionY, shape) { 
        const ox = originX; const oy = originY; const dx = directionX; const dy = directionY;

        // For convex polygons, find closest intersection point on edges
        let minIntersection = null;
        let minDistance = Infinity;

        for (let i = 0; i < shape.points.length; i++) {
            const p1 = shape.points[i];
            const p2 = shape.points[(i + 1) % shape.points.length];
            
            const hit = this._intersectRayWithLineSegment(
                ox, oy, dx, dy, p1.x, p1.y, p2.x, p2.y
            );
            
            if (hit && hit.distance < minDistance) {
                minDistance = hit.distance;
                minIntersection = hit;
            }
        }

        // Return closest intersection if inside polygon
        if (!minIntersection) {
            return null;
        }

        // Calculate normal for the intersected edge
        const p1 = shape.points[minIntersection.index];
        const p2 = shape.points[(minIntersection.index + 1) % shape.points.length];

        let normal = this._calculateEdgeNormal(p2.x - p1.x, p2.y - p1.y);

        // Ensure normal faces the ray direction
        const dotProduct = normal.x * dx + normal.y * dy;
        if (dotProduct < 0) {
            normal.x = -normal.x;
            normal.y = -normal.y;
        }

        return {
            point: { x: minIntersection.point.x, y: minIntersection.point.y },
            normal: normal,
            distance: minIntersection.distance
        };
    }

    /**

    Finds intersection between ray and line segment using parametric representation
    @param {number} ox - Ray origin X
    @param {number} oy - Ray origin Y
    @param {number} dx - Ray direction X (normalized)
    @param {number} dy - Ray direction Y (normalized)
    @param {number} lx1 - Line segment point 1 X
    @param {number} ly1 - Line segment point 1 Y
    @param {number} lx2 - Line segment point 2 X
    @param {number} ly2 - Line segment point 2 Y
    @returns {Object|null} Intersection data or null */ 
    static _intersectRayWithLineSegment(ox, oy, dx, dy, lx1, ly1, lx2, ly2) { 
        const ax = ox; const ay = oy; const bx = lx2 - lx1; const by = ly2 - ly1;

        const rx = dx;
        const ry = dy;

        // Solve for intersection using cross product method
        const denom = by * dx - bx * dy;

        if (Math.abs(denom) < 0.00001) {
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

    /** Calculates normal vector for an edge */ 
    static _calculateEdgeNormal(edgeX, edgeY) { 
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
    ConvexHullShape
} 
