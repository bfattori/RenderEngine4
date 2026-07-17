
import Constants from '../../Constants.js';
import ColliderPart from './Collider.js';
import { ColliderEvent } from './Collider.js';

export default class WorldBoundaryCollider extends ColliderPart {
    #stopOnCollision = true;
    #testingBoundaries = {
        top: true,
        left: true,
        right: true,
        bottom: true
    }

    /**
     * Creates a WorldBoundaryCollider that detects collisions based on events
     * from a {@link TransformPart}
     * 
     * @constructor
     * @param {number} priority - Priority of execution (0.0 to 1.0, implying order of execution, with 0.0 being first and 1.0 being last)
     * @param {String} name - An optional name for the component part
     */
    constructor(priority = Constants.COLLIDER_PRIORITY, name = 'WorldBoundaryCollider') {
        super(priority, name);
    }

    get stopOnCollision() {
        return this.#stopOnCollision;
    }

    set stopOnCollision(state) {
        this.#stopOnCollision = state;
    }

    get leftBoundaryEnabled() {
        return this.#testingBoundaries.left;
    }

    set leftBoundaryEnabled(state) {
        this.#testingBoundaries.left = state;
    }

    get topBoundaryEnabled() {
        return this.#testingBoundaries.top;
    }

    set topBoundaryEnabled(state) {
        this.#testingBoundaries.top = state;
    }

    get rightBoundaryEnabled() {
        return this.#testingBoundaries.right;
    }

    set rightBoundaryEnabled(state) {
        this.#testingBoundaries.right = state;
    }

    get bottomBoundaryEnabled() {
        return this.#testingBoundaries.bottom;
    }

    set bottomBoundaryEnabled(state) {
        this.#testingBoundaries.bottom = state;
    }

    setCollisionBoundaries({ left, top, right, bottom }) {
        this.#testingBoundaries.left = left ? left : this.#testingBoundaries.left;
        this.#testingBoundaries.top = top ? top : this.#testingBoundaries.top;
        this.#testingBoundaries.right = right ? right : this.#testingBoundaries.right;
        this.#testingBoundaries.bottom = bottom ? bottom : this.#testingBoundaries.bottom;
    }

    /**
     * Updates the transform based on current state and world bounds
     * Emits an event to the internal queue that a transform has been updated
     *
     * @param {number} time - Current world time (Unix timestamp or frame count)
     * @param {number} deltaTime - Time elapsed since last frame in milliseconds
     * @param {Object} [options] - Optional configuration for the update
     */
    update(time, deltaTime, options = {}) {
        // Check boundaries if world is available
        if (this.world && this.#worldWidth !== undefined && this.#worldHeight !== undefined) {
            this.#checkBoundaries(time, deltaTime);
        }

        return this;
    }

    /**
     * Checks boundaries and handles boundary collisions
     * 
     * @param {number} time - Current world time
     * @param {number} deltaTime - Time elapsed since last frame in milliseconds
     */
    #checkBoundaries(time, deltaTime) {
        const t = this.cachedTransform;
        
        // X-axis boundary check
        if (t.e <= 0 && this.world.dimensions[0] > 0) {
            if (this.stopOnCollision && this.#testingBoundaries.left) {
                t.e = 0;
                this.#emitBoundaryEvent('x', 'left', time);
            }
        } else if (t.e >= this.world.dimensions[0] && this.world.dimensions[0] > 0) {
            if (this.stopOnCollision && this.#testingBoundaries.right) {
                t.e = this.world.dimensions[0];
                this.#emitBoundaryEvent('x', 'right', time);
            }
        }

        // Y-axis boundary check
        if (t.f <= 0 && this.world.dimensions[1] > 0) {
            if (this.stopOnCollision && this.#testingBoundaries.top) {
                t.f = 0;
                this.#emitBoundaryEvent('y', 'top', time);
            }
        } else if (t.f >= this.world.dimensions[1] && this.world.dimensions[1] > 0) {
            if (this.stopOnCollision && this.#testingBoundaries.top) {
                tf = this.world.dimensions[1];
                this.#emitBoundaryEvent( 'y', 'bottom', time);
            }
        }

        // Corner collision check (diagonal boundaries)
        if (t.e < 0 && t.f < 0) {
            if (this.stopOnCollision && this.#testingBoundaries.top && this.#testingBoundaries.left) {
                t.e = 0;
                t.f = 0;
                this.#emitBoundaryEvent('corner', 'top-left', time);
            }
        } else if (t.e > this.world.dimensions[0] && t.f < 0) {
            if (this.stopOnCollision && this.#testingBoundaries.top && this.#testingBoundaries.right) {
                t.e = this.world.dimensions[0];
                t.f = 0;
                this.#emitBoundaryEvent('corner', 'top-right', time);
            }
        } else if (t.e > this.world.dimensions[0] && t.f > this.world.dimensions[1]) {
            if (this.stopOnCollision && this.#testingBoundaries.bottom && this.#testingBoundaries.right) {
                t.e = this.world.dimensions[0];
                t.f = this.world.dimensions[1];
                this.#emitBoundaryEvent('corner', 'bottom-right', time);
            }
        } else if (t.e < 0 && t.f > this.world.dimensions[1]) {
            t.e = 0;
            t.f = this.world.dimensions[1];
            this._emitBoundaryEvent('corner', 'bottom-left', time);
        }

        return this;
    }

    /**
     * Emits a boundary collision event
     * 
     * @param {string} axis - Axis of collision ('x' or 'y')
     * @param {string} side - Side of collision ('left', 'right', 'top', 'bottom', 'corner')
     * @param {number} time - Time of the collision event
     * @param {number} deltaTime - Delta since the last frame and current time
     */
    #emitBoundaryEvent(events, axis, side, time, deltaTime) {
        const t = this.cachedTransform;
        const collisionData = new CollisionData({
            initiator: this,
            collidedWith: this.world,
            collisionType: 'WorldBoundary',
            position: t.position,
            rotation: t.rotation,
            scale: t.scaling,
            axis: axis,
            side: side
        });

        this.emit(new ColliderEvent(this, collisionData, time, deltaTime));
    }

    /**
     * Checks if the object is within world boundaries
     * 
     * @returns {boolean} True if within bounds, false otherwise
     */
    get inBounds() {
        if (!this.world || !this.world.dimensions[0] || !this.world.dimensions[1]) {
            return true; // No bounds to check
        }

        const t = this.cachedTransform;
        return (
            t.e >= 0 &&
            t.e <= this.world.dimensions[0] &&
            t.f >= 0 &&
            t.f <= this.world.dimensions[1]
        );
    }
    
}