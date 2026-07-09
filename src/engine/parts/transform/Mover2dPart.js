/**
 * Mover2d - Physics-based 2D movement component
 * 
 * Extends Transform2d to provide simple "physics-like" movement
 * using linear and angular momentum properties. Does not implement direct
 * position/rotation/setters since those are inherited from Transform2d.
 * 
 * @class Mover2d
 * @extends Transform2d
 */

import Transform2d from './Transform2d.js';
import Constants from '../../constants.js';

/**
 * Creates a new Mover2d instance
 * 
 * @constructor
 * @param {Object} options - Configuration options
 * @param {Vector} [options.velocity=null] - Initial linear velocity vector [vx, vy]
 * @param {number} [options.angularVelocity=0] - Initial angular velocity in radians/frame
 * @param {number} [options.mass=1] - Mass of the object for momentum calculations
 * @param {Object} [options.friction=null] - Friction properties: { linear: 0, angular: 0 }
 * @param {number} [options.maxSpeed=null] - Maximum speed cap (disabled if null)
 * @param {number} [options.drag=0] - Linear drag coefficient (0 = no drag)
 */
class Mover2dPart extends Transform2d {
    /**
     * Velocity vector for linear motion [x, y]
     * @private
     */
    _velocity = [0, 0];

    /**
     * Angular velocity in radians per frame
     * @private
     */
    _angularVelocity = 0;

    /**
     * Mass of the object for momentum calculations
     * @private
     */
    _mass = 1;

    /**
     * Friction properties (linear and angular)
     * @private
     */
    _friction = { linear: 0, angular: 0 };

    /**
     * Maximum speed cap (disabled if null/undefined)
     * @private
     */
    _maxSpeed = null;

    /**
     * Linear drag coefficient
     * @private
     */
    _drag = 0;

    /**
     * Acceleration vector for external forces [ax, ay]
     * @private
     */
    _acceleration = [0, 0];

    /**
     * Forces array to support multiple force sources
     * @private
     */
    _forces = [];

    /**
     * Impulse buffer for applying sudden forces
     * @private
     */
    _impulseBuffer = null;

    /**
     * Enables/disables velocity persistence (stops object when no forces)
     * @private
     */
    _persistVelocity = false;

    /**
     * Creates a new Mover2d instance
     * 
     * @param {number} [priority=TRANSFORM_PRIORITY] - Component update priority
     * @param {string} [name='Mover2d'] - Optional name for debugging
     * @param {Object} options - Configuration options
     * @param {Vector} [options.velocity=null] - Initial linear velocity vector [vx, vy]
     * @param {number} [options.angularVelocity=0] - Initial angular velocity in radians/frame
     * @param {number} [options.mass=1] - Mass of the object for momentum calculations
     * @param {Object} [options.friction=null] - Friction properties: { linear: 0, angular: 0 }
     * @param {number} [options.maxSpeed=null] - Maximum speed cap (disabled if null)
     * @param {number} [options.drag=0] - Linear drag coefficient (0 = no drag)
     */
    constructor(priority = Constants.TRANSFORM_PRIORITY.MOVER_2D, name = 'Mover2d', options = {}) {
        super(options);

        // Initialize with optional velocity
        this.velocity = options.velocity || [0, 0];

        this.angularVelocity = options.angularVelocity !== undefined ? 
            options.angularVelocity : 0;
        
        this.mass = options.mass || 1;
        
        this.friction = options.friction || { linear: 0, angular: 0 };
        
        this.maxSpeed = options.maxSpeed;
        
        this.drag = options.drag || 0;
    }

    //------------------------------------------------
    // Getters and Setters
    //-----------------------------------------------

    /**
     * Gets/set the velocity vector
     * 
     * @param {Vector} [vector] - Optional velocity vector [vx, vy]
     * @returns {Vector} Current or new velocity vector
     */
    get velocity() {
        return [...this._velocity];
    }

    set velocity([vx, vy]) {
        this._velocity = [vx || 0, vy || 0];
        this.x += vx; // Apply to position for smooth movement
        this.y += vy;
        return this;
    }
    
    /**
     * Sets only the X component of velocity
     * 
     * @param {number} vx - New X velocity
     */
    set velocityX(vx) {
        this._velocity[0] = vx || 0;
        return this;
    }

    /**
     * Sets only the Y component of velocity
     * 
     * @param {number} vy - New Y velocity
     */
    set velocityY(vy) {
        this._velocity[1] = vy || 0;
        return this;
    }

    /**
     * Gets/set angular velocity (rotation speed in radians/frame)
     * 
     * @param {number} [rotationSpeed] - Optional new angular velocity
     * @returns {number} Current or new angular velocity in radians per frame
     */
    get angularVelocity() {
        return this._angularVelocity;
    }

    /**
     * Sets angular velocity and applies it to rotation immediately
      * 
      * @param {number} rotationSpeed - New angular velocity in radians/frame
     */
    set angularVelocity(rotationSpeed) {
        this._angularVelocity = rotationSpeed || 0;
        this.rotation += this._angularVelocity;
        // Normalize to 0-2π
        const normalized = this.rotation % (Math.PI * 2);
        this.rotation = Math.abs(normalized) <= Math.PI ? 
            normalized : normalized - Math.PI * 2;
        return this;
    }

    /**
     * Gets/set mass for momentum calculations
     * 
     * @param {number} [mass] - Optional new mass value
     * @returns {number} Current or new mass
     */
    get mass() {
        return this._mass;
    }

    /**
     * Sets mass and ensures it is not zero or negative to prevent physics issues
     * 
     * @param {number} mass - New mass value (must
     */
    set mass(mass) {
        this._mass = Math.max(0.1, mass || 1); // Prevent zero/negative mass
        return this;
    }

    /**
     * Gets/set drag coefficient (air resistance/medium friction)
     * 
     * @param {number} [drag] - Optional new drag value
     * @returns {number} Current or new drag coefficient
     */
    get drag() {
        return this._drag;
    }

    set drag(drag) {
        this._drag = Math.max(0, Math.min(1, drag || 0));
        return this;
    }

    /**
     * Gets/set the maximum speed cap
     * 
     * @param {number} [speed] - Optional new max speed value
     * @returns {number|null} Current or new max speed (null if disabled)
     */
    get maxSpeed() {
        return this._maxSpeed;
    }

    set maxSpeed(speed) {
        this._maxSpeed = speed !== undefined ? speed : null;
        if (this._maxSpeed !== null) {
            const currentVelocity = Math.sqrt(
                this._velocity[0] ** 2 + this._velocity[1] ** 2
            );
            if (currentVelocity > this._maxSpeed) {
                const scale = this._maxSpeed / currentVelocity;
                this._velocity[0] *= scale;
                this._velocity[1] *= scale;
            }
        }
        return this;
    }

    /**
     * Enables/disables velocity persistence
     * 
     * @param {boolean} enabled - Whether to persist velocity when no forces are applied
     */
    set persistVelocity(enabled) {
        this._persistVelocity = enabled;
        return this;
    }

    /**
     * Gets current speed (magnitude of velocity vector)
     * 
     * @returns {number} Current speed
     */
    get speed() {
        return Math.sqrt(this._velocity[0] ** 2 + this._velocity[1] ** 2);
    }

    //-------------------------------
    // Properties
    //-------------------------------

    /**
     * Gets all properties for serialization, including physics properties
      * 
      * @returns {Object} Properties object for serialization
     */
    get properties() {
        return {...super.properties, ...{
            velocity: this.velocity,
            angularVelocity: this.angularVelocity,
            mass: this.mass,
            friction: this.friction,
            maxSpeed: this.maxSpeed,
            drag: this.drag,
            persistVelocity: this._persistVelocity
        }};
    }

    //-------------------------------
    // Lifecycle & Movement Methods
    //--------------------------------

    /**
     * Override update to apply physics-based movement logic
     * 
     * @param {number} time - Current world time
     * @param {number} deltaTime - Time elapsed since last frame in milliseconds
     * @param {Object} [options] - Optional configuration
     * @param {Array} [options.events=[]] - Array to push movement events to
     */
    update(time, deltaTime, options = {}) {
        const events = options.events || [];

        // Apply forces if any exist
        this._applyForces(deltaTime);

        // Update velocity based on forces and drag
        this._updateVelocity(deltaTime);

        // Integrate velocity into position
        this._integratePosition(deltaTime);

        // Rotate object based on angular velocity
        this._rotateObject(deltaTime, time);

        // Check for high-speed boundary collisions
        if (this.world && this._worldWidth !== undefined && this._worldHeight !== undefined) {
            const result = this._checkBoundaryCollisions(time, deltaTime, events);
            if (result) {
                return result;
            }
        }

        // Reset forces for next frame
        this._clearForces();

        return super.update(time, deltaTime, options);
    }

    /**
     * Adds velocity delta (for acceleration/force application)
     * 
     * @param {number} dx - Delta X velocity
     * @param {number} dy - Delta Y velocity
     */
    addVelocity(dx, dy) {
        this._velocity[0] += dx;
        this._velocity[1] += dy;
        return this;
    }

    /**
     * Adds angular velocity delta
     * 
     * @param {number} dRotationSpeed - Delta to angular velocity
     */
    addAngularVelocity(dRotationSpeed) {
        this._angularVelocity += dRotationSpeed;
        return this;
    }

    /**
     * Applies a force vector to the object (F=ma)
     * 
     * @param {Vector} [force] - Optional force vector [fx, fy]
     */
    applyForce([fx, fy]) {
        const magnitude = Math.sqrt(fx * fx + fy * fy);
        if (magnitude === 0) return this;

        // F = ma → a = F/m
        const accelerationX = (fx || 0) / this._mass;
        const accelerationY = (fy || 0) / this._mass;

        // Add to acceleration buffer for next frame's velocity update
        this._acceleration[0] += accelerationX;
        this._acceleration[1] += accelerationY;

        return this;
    }

    /**
     * Applies an impulse (instantaneous force) for sudden movement changes
     * 
     * @param {Vector} [impulse] - Impulse vector [ix, iy]
     */
    applyImpulse([ix, iy]) {
        const magnitude = Math.sqrt(ix * ix + iy * iy);
        if (magnitude === 0) return this;

        // Impulse = m × Δv → Δv = J/m
        const velocityChangeX = (ix || 0) / this._mass;
        const velocityChangeY = (iy || 0) / this._mass;

        // Add to velocity directly for immediate effect
        this._velocity[0] += velocityChangeX;
        this._velocity[1] += velocityChangeY;

        return this;
    }
   

    /**
     * Applies linear drag to velocity each frame
     * 
     * @param {number} deltaTime - Time delta in seconds
     */
    _applyDrag(deltaTime) {
        if (this._drag === 0) return;

        const dt = deltaTime / 1000; // Convert ms to seconds
        
        // Apply drag: v = v × e^(-k×t)
        const decay = Math.pow(1 - this._drag, dt);
        
        if (decay !== 0) {
            this._velocity[0] *= decay;
            this._velocity[1] *= decay;
        }
    }

    /**
     * Applies friction based on configured values
     * 
     * @param {number} deltaTime - Time delta in milliseconds
     */
    _applyFriction(deltaTime) {
        const dt = deltaTime / 1000; // Convert ms to seconds

        // Linear friction: v = v - μ × g (simplified for games)
        if (this._friction.linear !== 0) {
            this._velocity[0] -= this._friction.linear * 9.8 * dt; // gravity factor
            this._velocity[1] -= this._friction.linear * 9.8 * dt;
        }

        // Angular friction
        if (this._friction.angular !== 0) {
            this._angularVelocity *= (1 - this._friction.angular);
        }
    }

    /**
     * Updates velocity based on accumulated forces, drag, and friction
     * 
     * @param {number} deltaTime - Time delta in milliseconds
     */
    _updateVelocity(deltaTime) {
        // Apply drag first (always active)
        this._applyDrag(deltaTime);

        // Apply friction (ground/contact friction)
        this._applyFriction(deltaTime);

        // Integrate acceleration into velocity
        if (this._acceleration[0] !== 0 || this._acceleration[1] !== 0) {
            const dt = deltaTime / 1000;
            this._velocity[0] += this._acceleration[0] * dt;
            this._velocity[1] += this._acceleration[1] * dt;

            // Reset acceleration after integration
            this._acceleration[0] = 0;
            this._acceleration[1] = 0;
        }

        // Apply max speed cap if configured
        this._enforceMaxSpeed();

        return this;
    }

    /**
     * Integrates velocity into position (position = position + velocity × dt)
     * 
     * @param {number} deltaTime - Time delta in milliseconds
     */
    _integratePosition(deltaTime) {
        const dt = deltaTime / 1000; // Convert to seconds for physics calculations

        this.x += this._velocity[0] * dt;
        this.y += this._velocity[1] * dt;

        return this;
    }

    /**
     * Rotates object based on angular velocity and handles high-speed boundary checks
     * 
     * @param {number} deltaTime - Time delta in milliseconds
     * @param {number} time - Current world time for event emission
     */
    _rotateObject(deltaTime, time) {
        if (Math.abs(this._angularVelocity) === 0) return this;

        const dt = deltaTime / 1000; // Convert ms to radians/frame equivalent

        // Update rotation based on angular velocity
        this.rotation += this._angularVelocity * dt;
        
        // Normalize to prevent unwinding
        let normalized = this.rotation % (Math.PI * 2);
        this.rotation = Math.abs(normalized) <= Math.PI ? 
            normalized : normalized - Math.PI * 2;

        return this;
    }

    /**
     * Applies forces from force sources if any exist
     * 
     * @param {number} deltaTime - Time delta in milliseconds
     */
    _applyForces(deltaTime) {
        for (const force of this._forces) {
            const [fx, fy] = force;
            this.applyForce([fx, fy]);
        }
    }

    /**
     * Enforces maximum speed limit if configured
     */
    _enforceMaxSpeed() {
        if (this._maxSpeed === null) return this;

        const velocityMagnitude = Math.sqrt(
            this._velocity[0] ** 2 + this._velocity[1] ** 2
        );

        if (velocityMagnitude > this._maxSpeed) {
            // Scale down velocity to max speed
            const scale = this._maxSpeed / velocityMagnitude;
            this._velocity[0] *= scale;
            this._velocity[1] *= scale;
        }

        return this;
    }

    /**
     * Clears all accumulated forces for next frame
     */
    _clearForces() {
        this._forces = [];
        this._acceleration = [0, 0];
        if (this._impulseBuffer) {
            this._impulseBuffer = null;
        }
        return this;
    }

    /**
     * Registers a force source for continuous application each frame
     * 
     * @param {Vector} [force] - Optional force vector [fx, fy]
     */
    addForce([fx, fy]) {
        if (!this._forces.includes([fx, fy])) {
            this._forces.push([fx || 0, fy || 0]);
        }
        return this;
    }

    /**
     * Removes a force source
     * 
     * @param {Vector} [force] - Force vector to remove [fx, fy]
     */
    removeForce([fx, fy]) {
        const index = this._forces.findIndex(f => 
            Math.abs(f[0] - (fx || 0)) < 0.0001 && 
            Math.abs(f[1] - (fy || 0)) < 0.0001
        );
        
        if (index !== -1) {
            this._forces.splice(index, 1);
        }
        return this;
    }

    /**
     * Sets up an impulse buffer for multiple impulses over time
     * 
     * @param {Array} [impulses] - Array of impulse vectors to buffer
     */
    setImpulseBuffer(impulses) {
        if (Array.isArray(impulses)) {
            this._impulseBuffer = [...impulses];
        } else {
            this._impulseBuffer = null;
        }
        return this;
    }

    /**
     * Processes all buffered impulses
     */
    _processImpulseBuffer() {
        if (!this._impulseBuffer) return this;

        for (const impulse of this._impulseBuffer) {
            this.applyImpulse(impulse);
        }
        
        this._impulseBuffer = null; // Processed
        return this;
    }

    /**
     * Checks boundary collisions and handles bounce behavior
     * 
     * @param {number} time - Current world time
     * @param {number} deltaTime - Time elapsed since last frame in milliseconds
     * @param {Array} events - Array to push collision events to
     * @returns {Transform2d|null} This or boundary if collision handled
     */
    _checkBoundaryCollisions(time, deltaTime, events) {
        let collided = false;

        // X-axis boundary check
        if (this.x <= 0 && this._worldWidth > 0) {
            this.x = 0;
            collided = true;
            this._handleBounce('x', 'left', time, deltaTime, events);
        } else if (this.x >= this._worldWidth) {            
            this.x = this._worldWidth - this.scale;
            collided = true;
            this._handleBounce('x', 'right', time, deltaTime, events);
        }

        // Y-axis boundary check
        if (this.y <= 0 && this._worldHeight > 0) {
            this.y = 0;
            collided = true;
            this._handleBounce('y', 'bottom', time, deltaTime, events);
        } else if (this.y >= this._worldHeight - this.scale && this._worldHeight > 0) {
            this.y = this._worldHeight - this.scale;
            collided = true;
            this._handleBounce('y', 'top', time, deltaTime, events);
        }

        // Corner collision check (diagonal boundaries)
        if (this.x < 0 && this.y < 0) {
            this.x = 0;
            this.y = 0;
            collided = true;
            this._handleBounce('corner', 'bottom-left', time, deltaTime, events);
        } else if (this.x > this._worldWidth - this.scale && this.y < 0) {
            this.x = this._worldWidth - this.scale;
            this.y = 0;
            collided = true;
            this._handleBounce('corner', 'top-right', time, deltaTime, events);
        } else if (this.x > this._worldWidth - this.scale && this.y > this._worldHeight - this.scale) {
            this.x = this._worldWidth - this.scale;
            this.y = this._worldHeight - this.scale;
            collided = true;
            this._handleBounce('corner', 'top-right', time, deltaTime, events);
        } else if (this.x < 0 && this.y > this._worldHeight - this.scale) {
            this.x = 0;
            this.y = this._worldHeight - this.scale;
            collided = true;
            this._handleBounce('corner', 'bottom-left', time, deltaTime, events);
        }

        if (collided && events) {
            this._emitBoundaryEvent(events, 'x', 'left', time);
        }

        return null;
    }

    /**
     * Handles bounce behavior when colliding with boundaries
     * 
     * @param {string} axis - Axis of collision ('x' or 'y')
     * @param {string} side - Side of collision ('left', 'right', 'top', 'bottom', 'corner')
     * @param {number} time - Timestamp of the collision event
     * @param {number} deltaTime - Time elapsed since last frame in milliseconds
     * @param {Array} events - Array to push collision events to
     */
    _handleBounce(axis, side, time, deltaTime, events) {
        // Bounce velocity based on friction (rebound with energy loss)
        const bounceFactor = 0.6 + this.friction.linear * 0.4; // 0.6 to 1.0
        
        if (axis === 'x') {
            this._velocity[0] *= -bounceFactor;
        } else if (axis === 'y') {
            this._velocity[1] *= -bounceFactor;
        }

        // Emit boundary event
        const event = {
            type: 'boundary',
            timestamp: time,
            deltaTime: deltaTime,
            position: this.position,
            rotation: this.rotation,
            scale: this.scale,
            axis: axis,
            side: side,
            collisionType: 'WorldBoundaryBounce',
            bounceFactor: bounceFactor
        };

        if (events) {
            events.push(event);
        }

        return this;
    }

    /**
     * Emits a movement event (velocity changes, etc.)
     * 
     * @param {Array} events - Array of event objects to push collision data to
     * @param {string} eventType - Type of movement event
     * @param {Object} eventData - Event data object
     */
    _emitMovementEvent(events, eventType, eventData) {
        const event = {
            type: 'movement',
            subType: eventType,
            timestamp: Date.now(),
            deltaTime: 0.016, // Default delta if not available
            velocity: [...this.velocity],
            angularVelocity: this.angularVelocity,
            position: this.position,
            rotation: this.rotation,
            collisionType: 'MovementEvent',
            ...eventData
        };

        if (events) {
            events.push(event);
        }
    }

    /**
     * Checks if the object is currently moving
     * 
     * @param {number} [threshold=0.01] - Velocity threshold for "stopped" state
     * @returns {boolean} True if object is moving, false otherwise
     */
    isMoving(threshold = 0.01) {
        const speed = this.getSpeed();
        return speed > threshold;
    }

    /**
     * Stops the object's movement (sets velocity to zero)
     */
    stop() {
        this._velocity = [0, 0];
        this.rotation = 0; // Optional: stop rotation too
        this._angularVelocity = 0;
        
        if (this.world && this.world.eventEngine) {
            this.world.eventEngine.publish('stopped', {
                position: { x: this.x, y: this.y },
                timestamp: Date.now()
            });
        }
        
        return this;
    }

    /**
     * Deserializes a Mover2d from saved state
     * 
     * @param {Object} data - Serialized data object
     */
    deserialize(data) {
        super.deserialize(data);
        
        this.velocity = data.velocity;
        this.angularVelocity = data.angularVelocity;
        this.mass = data.mass;
        this.friction = data.friction;
        this.maxSpeed = data.maxSpeed;
        this.drag = data.drag;
        this.persistVelocity = data.persistVelocity;
    }
}

export default Mover2dPart;