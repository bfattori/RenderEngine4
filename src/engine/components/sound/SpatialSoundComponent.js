 /**
@fileoverview SpatialSoundComponent - Advanced spatialized sound component
Uses position and orientation data for 3D audio positioning 
*/
import Console from '../../core/Console.js';
import SoundComponent from './SoundComponent.js';
import { SOUND_PRIORITY } from '../../constants.js';

/**
 * @typedef {Object} PositionData - 2D or 3D position coordinates
 * @property {number} x - X position in world space
 * @property {number} y - Y position in world space
 * @property {number} z - Z position (optional for 3D)
 */

/**
 * SpatialSoundComponent provides advanced spatialized audio playback with 
 * position, orientation, and distance-based volume attenuation.
 */
class SpatialSoundComponent extends SoundComponent {
    constructor(priority = SOUND_PRIORITY, name = 'SpatialSoundComponent', soundSystem = null, positionData = null) {
        super(priority, name, soundSystem);
        
        // Position tracking for spatialization
        this._position = [0,0];
        this._previousPosition = [0,0];
        this._velocity = [0,0]; // For Doppler effect calculations
        
        // Orientation/rotation
        this._rotation = 0; // In radians
        
        // Initial position setup
        if (positionData) {
            this.setWorldPosition(positionData[0], positionData[1]);
            if (positionData[2]) {
                this._position[2] = positionData[2]; // Optional Z for 3D audio
            }
        }
        
        // Spatial audio settings
        this._distanceRollOff = true;
        this._minDistance = 1.0;
        this._maxDistance = 50.0;
        
        // Event handlers for spatial events
        this.onPositionChanged = null;
        this.onOrientationChanged = null;
    }

    //--------------------------------
    // Getters and Setters
    //--------------------------------

    /**
     * Set the position change event handler
     */
    set positionChangeEvent(handler) {
        this.onPositionChanged = handler
    }

    /**
     * Set the orientation event handler
     */
    set orientationChangeEvent(handler) {
        this.onOrientationChanged = handler;
    }

    /**
     * Sets the world position of the sound source
     * @param {Array} position - [x, y] position in world space
     * @returns {void}
     */
    set worldPosition([x, y]) {
        this._position[0] = x || 0;
        this._position[1] = y !== undefined ? y : this._position[0] * 0.5; // Default to half X value

        // Update spatial audio if active
        if (this.audioSystem && this.isPlaying) {
            const positionData = [this.position[0], this.position[1], this.position[2] || 0 ];
            
            // Try to update position on audio system
            try {
                if (this.audioSystem.updatePosition) {
                    this.audioSystem.updatePosition(this.sourcePath, positionData);
                } else if (this.audioSystem.playAtPosition) {
                    // Fallback: reposition and continue playing
                    this.audioSystem.playAtPosition(
                        this.sourcePath, 
                        positionData, 
                        null // Keep current volume
                    );
                }
            } catch (error) {
                Console.error('Error updating sound position:', error);
            }
        }
    }

    /**
     * Gets the current world position of the sound source
     * @returns {Array[number, number, number]} Position coordinates
     */
    get worldPosition() {
        return this._position;
    }

    get previousPosition() {
        return this._previousPosition;
    }

    /**
     * Gets the current orientation of the sound source
     * @returns {number} Rotation angle in radians
     */
    get orientation() {
        return this.rotation;
    }

    /**
     * Gets the velocity for Doppler effect calculation
     * @returns {{x: number, y: number}} Velocity vector (units/second)
     */
    get velocity() {
        return this._velocity;
    }

    /**
     * Sets distance roll-off behavior for the sound
     * @param {boolean} enabled - True to enable distance-based attenuation
     * @returns {void}
     */
    set distanceRollOff(enabled) {
        this.distanceRollOff = enabled;
        
        if (enabled && this.audioSystem && this.isPlaying) {
            const currentDistance = this.getWorldPosition().y || 0;
            this.adjustDistance(currentDistance);
        }
    }

    /**
     * Sets minimum and maximum distances for volume attenuation
     * @param {number} min - Minimum distance (no attenuation)
     * @param {number} max - Maximum distance (fully attenuated)
     * @returns {void}
     */
    set distanceRange(min, max) {
        this._minDistance = Math.max(0, min || 1.0);
        this._maxDistance = Math.max(this._minDistance, max || 50.0);
    }

    /**
     * Set the minimum rolloff distance for volume attenuation
     * @param minDist {number} The minimum distance
     */
    set minRollOffDistance(minDist) {
        this.distanceRange = [minDist, this._maxDistance];
    }

    /**
     * Set the maximum rolloff distance for volume attenuation
     * @param maxDist {number} The maximum distance
     */
    set maxRollOffDistance(maxDist) {
        this.distanceRance = [this._minDistance, maxDist];
    }

    /**
     * Updates the rotation/orientation of the sound source
     * @param {number} radians - Rotation angle in radians
     * @returns {void}
     */
    set orientation(radians) {
        this.rotation = radians;
        
        if (this.audioSystem && this.isPlaying) {
            try {
                if (this.audioSystem.updateOrientation) {
                    this.audioSystem.updateOrientation(this.sourcePath, radians);
                }
            } catch (error) {
                Console.error('Error updating sound orientation:', error);
            }
        }
    }

    //-------------------------------
    // Properties
    //-------------------------------

    get properties() {
        return {...super.properties, ...{
            worldPosition: this.worldPosition,
            _previousPosition: this.previousPosition,
            velocity: this.velocity,
            rotation: this.rotation,
            minRollOffDistance: this.minRollOffDistance,
            maxRollOffDistance: this.maxRollOffDistance,
            onPositionChanged: this.onPositionChanged,
            onOrientationChanged: this.onOrientationChanged
        }};
    }

    //-------------------------------
    // Lifecycle Methods
    //--------------------------------

    /**
     * Updates the component (called every frame)
     * @param {number} time - Current world time
     * @param {number} delta - Time since last update in seconds
     * @returns {void}
     */
    update(time, delta) {
        // Update position if available from GameObject transform
        const transform = this.getHost().getTransform(this.gameObject);
        
        if (transform && transform.position) {
            const newPosX = transform.position[0];
            const newPosY = transform.position[1];
            
            // Check if position changed
            if (newPosX !== this._previousPosition[0] || newPosY !== this._previousPosition[1]) {
                this.setWorldPosition(newPosX, newPosY);
                
                // Update velocity for Doppler effect (if supported by audio system)
                const velX = newPosX - this._previousPosition[0];
                const velY = newPosY - this._previousPosition[1];
                this._velocity = [velX * 60, velY * 60 ]; // Scale to per-second
                
                if (this.onPositionChanged) {
                    this.onPositionChanged({ 
                        position: this.position, 
                        velocity: this.velocity 
                    });
                }
            }
        }
        
        this._previousPosition = transform ? [transform.position[0], transform.position[1]] : [0, 0];
    }

    /**
     * Adjusts distance-based volume attenuation for spatial sounds
     * @param {number} distance - Distance from listener in world units
     * @returns {void}
     */
    adjustDistance(distance) {
        if (!this.audioSystem || !this.distanceRollOff) return;
        
        try {
            this.audioSystem.adjustDistanceVolume(
                this.sourcePath, 
                Math.max(this.minDistance, distance)
            );
        } catch (error) {
            Console.error('Error adjusting sound distance:', error);
        }
    }

    /**
     * Handles audio events including spatial position changes
     * @param {string} eventType - Type of event ('ended', 'error', or 'position')
     * @param {Event|Object} event - The event object
     * @returns {void}
     */
    handleSpatialEvent(eventType, event) {
        if (eventType === 'position' && this.onPositionChanged) {
            this.onPositionChanged({
                position: this.getWorldPosition(),
                velocity: this.getVelocity()
            });
        } else if (eventType === 'orientation' && this.onOrientationChanged) {
            this.onOrientationChanged(this.rotation);
        } else {
            super.handleAudioEvent(eventType, event);
        }
    }

    /**
     * Cleans up and releases spatial audio resources
     * @returns {Promise} Promise that resolves when cleanup is complete
     */
    async cleanup() {
        if (this.audioSystem) {
            // Reset position tracking
            this.position = [0, 0];
            this.velocity = [0, 0];
            
            await super.cleanup();
        }
        
        return Promise.resolve(true);
    }

    /**
     * Destroys the spatial sound component and releases all resources
     * @returns {void}
     */
    destroy() {
        this.cleanup();
        this.audioSystem = null;
        this.sourcePath = null;
        this.position = null;
        this.velocity = null;
        this.rotation = 0;
    }

    //-------------------------------
    // Sound Control Methods
    //--------------------------------

    /**
     * Plays a spatialized sound with position and optional orientation
     * @param {string} source - Path or URL to the audio file
     * @param {number} volume - Optional volume level (0.0 to 1.0)
     * @param {number} pan - Optional initial pan value (-1.0 to 1.0)
     * @returns {Promise<Object>} Promise that resolves when sound is ready
     */
    async playWithPosition(source, volume = null, pan = null) {
        // Use position-based spatial playback if available
        const result = await super.play(source, volume, pan);
        
        // Update spatial state for this source
        if (this.audioSystem && result.sourcePath) {
            try {
                if (this.audioSystem.updatePosition) {
                    this.audioSystem.updatePosition(
                        result.sourcePath, 
                        this.getWorldPosition()
                    );
                }
            } catch (error) {
                Console.error('Error setting sound position:', error);
            }
        }
        
        return Promise.resolve(result);
    }
}

export default SpatialSoundComponent;