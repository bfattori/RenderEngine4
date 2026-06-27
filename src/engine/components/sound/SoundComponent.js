 /**
@fileoverview GameComponent subclass for Sound functionality
Provides a way for game objects to playback sound effects with simple methods 
*/
import Console from './../../core/Console.js';
import { SOUND_PRIORITY } from './../../constants';
import GameComponent from '../GameComponent.js';
import SoundSystemError from '../../sound/SoundSystem.js';

/**
 * @typedef {Object} AudioSource - Represents an active audio source
 * @property {string} sourcePath - Path or URL to the audio file
 * @property {number} volume - Current volume level (0.0 to 1.0)
 * @property {boolean} isPlaying - True if currently playing
 * @property {number} pan - Pan value (-1.0 left to 1.0 right)
 */

class SoundComponent extends GameComponent {
    constructor(priority = SOUND_PRIORITY, name = 'SoundComponent', soundSystem = null) {
        super(priority, name);
        this._audioSystem = soundSystem || null;
        
        // Initialize volume and pan defaults
        this._volume = 1.0;
        this._pan = 0; // Center: 0, Left: -1, Right: 1
        
        // Event handlers (optional)
        this.onEnded = function(event) {};
        this.onError = function(event) {};
        
        this._isPlaying = false;
        this._looping = false;
    }

    //--------------------------------
    // Getters and Setters
    //--------------------------------
    
    /**
     * Checks if the audio system is initialized and ready
     * @returns {boolean} True if ready
     */
    get isReady() {
        if (!this._audioSystem) {
            Console.warn('SoundComponent: Audio system not initialized');
            return false;
        }
        
        return this._audioSystem.isInitialized();
    }

    /**
     * Returns true if the sound is playing
     */
    get isPlaying() {
        return this._isPlaying;
    }

    /**
     * Returns true if the sound is looping
     */
    get isLooping() {
        return this._looping;
    }

    /**
     * Sets the looping behavior for a sound
     * @param {boolean} loop - True to enable looping
     * @returns {void}
     */
    set isLooping(loop) {
        if (!this._audioSystem || this.sourcePath === null) return;
        
        this._looping = loop;
        // Note: For true looping, need to use play() with appropriate options
    }

    /**
     * Gets the current audio system instance used by this component
     * @returns {SoundSystem|null} The audio system or null if not initialized
     */
    get audioSystem() {
        return this._audioSystem;
    }

    /**
     * Sets the event handler for when a sound finishes playing
     * @param {function} handler - Callback function to handle ended event
     */
    set endedEvent(handler) {
        this.onEnded = handler;
    }

    /**
     * Sets the event handler for when a sound encounters an error
     * @param {function} handler - Callback function to handle error event
     */
    set errorEvent(handler) {
        this.onError = handler;
    }

    /**
     * gets the current source path of the playing sound
     * @returns {string|null} The source path or null if not set
     */
    get sourcePath() {
        return this._sourcePath || null;
    }
    
    /**
     * Adjusts the volume of a playing sound
     * @param {number} value - New volume level (0.0 to 1.0)
     * @returns {void}
     */
    set volume(value) {
        if (!this._audioSystem || this.sourcePath === null) return;
        
        this._volume = Math.max(0, Math.min(1, value));
        this._audioSystem.setVolume(this.sourcePath, this._volume);
    }

    /**
     * Adjusts the pan of a playing sound (left to right)
     * @param {number} value - Pan value (-1.0 left to 1.0 right)
     * @returns {void}
     */
    set pan(value) {
        if (!this._audioSystem || this.sourcePath === null) return;
        
        this._pan = Math.max(-1, Math.min(1, value));
        this._audioSystem.setPan(this.sourcePath, this._pan);
    }

    /**
     * Gets the current volume of the component's sound
     * @returns {number} Current volume level
     */
    get volume() {
        return this._volume;
    }

    /**
     * Gets the current pan of the component's sound
     * @returns {number} Pan value (-1.0 to 1.0)
     */
    get pan() {
        return this._pan;
    }  
    
    //-------------------------------
    // Properties
    //-------------------------------

    get properties() {
        return {...super.properties, ...{
            volume: this.volume,
            pan: this.pan,
            onEnded: this.onEnded,
            onError: this.onError,
            _isPlaying: this.isPlaying,
            isLooping: this.isLooping
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
        // Process pending audio events if needed
        if (this._audioSystem && this._audioSystem.getActiveSources().length > 0) {
            // Check for ended sounds
            const sources = this._audioSystem.getActiveSources();
            sources.forEach(source => {
                if (!source.isPlaying && this.onEnded) {
                    this.onEnded(source.sourcePath);
                }
            });
        }
    }
    
    /**
     * Adjusts the volume up by relative amount
     * @param {number} amount - Amount to increase volume (e.g., 0.1)
     * @returns {void}
     */
    volumeUp(amount = 0.1) {
        const newValue = Math.min(1, this._volume + amount);
        this.setVolume(newValue);
    }

    /**
     * Adjusts the volume down by relative amount
     * @param {number} amount - Amount to decrease volume (e.g., 0.1)
     * @returns {void}
     */
    volumeDown(amount = 0.1) {
        const newValue = Math.max(0, this._volume - amount);
        this.setVolume(newValue);
    }

    /**
     * Pans the sound slightly to the right
     * @param {number} amount - Amount to pan right (0.1)
     * @returns {void}
     */
    panRight(amount = 0.1) {
        const newValue = Math.min(1, this._pan + amount);
        this.setPan(newValue);
    }

    /**
     * Pans the sound slightly to the left
     * @param {number} amount - Amount to pan left (0.1)
     * @returns {void}
     */
    panLeft(amount = 0.1) {
        const newValue = Math.max(-1, this._pan - amount);
        this.setPan(newValue);
    }

    /**
     * Initializes the sound component with a specific audio system
     * @param {SoundSystem} system - SoundSystem instance to use
     * @returns {void}
     */
    initAudio(system) {
        this._audioSystem = system;
        
        // Set default volume and pan
        this.setVolume(this._volume);
        this.setPan(this._pan);
    }

    /**
     * Updates all active sound volumes based on global settings
     * @returns {void}
     */
    syncGlobalSettings() {
        if (!this._audioSystem || !this.sourcePath) return;
        
        // Sync volume
        const currentVolume = this._audioSystem.getVolume(this.sourcePath);
        this.setVolume(currentVolume);
        
        // Sync pan
        const currentPan = this._audioSystem.getPan(this.sourcePath);
        this.setPan(currentPan);
    }

    /**
     * Handles audio events (ended, error) if callbacks are registered
     * @param {string} eventType - Type of event ('ended' or 'error')
     * @param {Event} event - The event object
     * @returns {void}
     */
    handleAudioEvent(eventType, event) {
        if (eventType === 'ended' && this.onEnded) {
            this.onEnded(event);
        } else if (eventType === 'error' && this.onError) {
            this.onError(event);
        }
    }

    /**
     * Destroys the sound component and releases all resources
     * @returns {void}
     */
    destroy() {
        this.cleanup();
        this._audioSystem = null;
        this.sourcePath = null;
    }

    //-------------------------------
    // Sound Control Methods
    //--------------------------------

    /**
     * Plays a sound effect
     * @param {string} source - Path or URL to the audio file
     * @param {number} volume - Optional volume level (0.0 to 1.0)
     * @param {number} pan - Optional pan value (-1.0 left to 1.0 right)
     * @returns {Promise<AudioSource>} Promise that resolves when sound is ready
     */
    async play(source, volume = null, pan = null) {
        if (!this._audioSystem) {
            throw new SoundSystemError(null, 'SoundComponent requires a SoundSystem to be initialized');
        }

        const playedSource = await this._audioSystem.play(source, volume !== null ? volume : this._volume, pan !== null ? pan : this._pan);
        
        // Store loop setting if provided
        this._looping = source.includes('loop') || this._looping;
        this._sourcePath = source;
        
        return Promise.resolve({
            sourcePath: source,
            volume: playedSource.volume,
            isPlaying: true,
            pan: playedSource.pan
        });
    }

    /**
     * Pauses a currently playing sound
     * @returns {Promise} Promise that resolves when paused
     */
    async pause() {
        if (!this._audioSystem || !this._audioSystem.isPlaying(this._sourcePath)) {
            return Promise.resolve();
        }
        
        await this._audioSystem.pause(this._sourcePath);
        return Promise.resolve(true);
    }

    /**
     * Stops a currently playing sound and rewinds to beginning
     * @returns {Promise} Promise that resolves when stopped
     */
    async stop() {
        if (!this._audioSystem) {
            return Promise.resolve();
        }
        
        this._audioSystem.stop(this.sourcePath);
        this._isPlaying = false;
        
        return Promise.resolve(true);
    }

    /**
     * Resumes a paused sound
     * @returns {Promise} Promise that resolves when resumed
     */
    async resume() {
        if (!this._audioSystem) {
            return Promise.resolve();
        }
        
        await this._audioSystem.resume(this.sourcePath);
        this._isPlaying = true;
        
        return Promise.resolve(true);
    }

    /**
     * Plays a sound with looping enabled
     * @param {string} source - Path or URL to the audio file
     * @returns {Promise<AudioSource>} Promise that resolves when sound is ready
     */
    async playLoop(source) {
        // Play the sound and enable looping behavior
        return await this.play(source);
    }

    /**
     * Plays a background music track
     * @param {string} source - Path or URL to the audio file
     * @returns {Promise<AudioSource>} Promise that resolves when sound is ready
     */
    async playBackground(source, volume = null) {
        if (!this._audioSystem) {
            throw new SoundSystemError(null, 'SoundComponent requires a SoundSystem to be initialized');
        }

        const playedSource = await this._audioSystem.playBackground(source, volume !== null ? volume : this._volume);
        
        // Background sounds typically don't loop by default
        this._looping = false;
        
        return Promise.resolve({
            sourcePath: source,
            volume: playedSource.volume,
            isPlaying: true,
            pan: 0 // Center for background music
        });
    }

    /**
     * Cleans up and releases audio resources used by the component
     * @returns {Promise} Promise that resolves when cleanup is complete
     */
    async cleanup() {
        if (!this._audioSystem) return Promise.resolve();
        
        await this._audioSystem.cleanup();
        this._isPlaying = false;
        return Promise.resolve(true);
    }

    //-------------------------------
    // Serialization Methods
    //--------------------------------
    deserialize(data) {
        super.deserialize(data);
        this._volume = data.volume || 1.0;
        this._pan = data.pan || 0;
        this._looping = data.looping || false;
    }
}

export default SoundComponent;