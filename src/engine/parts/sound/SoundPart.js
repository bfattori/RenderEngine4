 /**
@fileoverview ComponentPart subclass for Sound functionality
Provides a way for game objects to playback sound effects with simple methods 
*/
import Constants from '../../constants.js';
import ComponentPart from '../ComponentPart.js';
import { ComponentPartEvent } from '../ComponentPart.js';
import SoundSystemError from '../../sound/SoundSystem.js';

class SoundEvent extends ComponentPartEvent {
    #source = null;
    constructor(part, source, time, deltaTime) {
        super(part, time, deltaTime);
        this.#source = source;
    }

    consume(consumer) {
        super.consume(consumer);
        return this.#source;
    }
}

export { SoundEvent };

/**
 * @typedef {Object} AudioSource - Represents an active audio source
 * @property {string} sourcePath - Path or URL to the audio file
 * @property {number} volume - Current volume level (0.0 to 1.0)
 * @property {boolean} isPlaying - True if currently playing
 * @property {number} pan - Pan value (-1.0 left to 1.0 right)
 */

class SoundPart extends ComponentPart {
    #audioSystem = null;
    #sourcePath = null;
    #volume = 1.0;
    #pan = 0;
    #playing = false;
    #looping = false;
    #hooks = {
        onEnded: null,
        onError: null
    };
    #source = null;

    constructor(priority = Constants.SOUND_PRIORITY, name = 'SoundPart', soundSystem = null) {
        super(priority, name);
        this.#audioSystem = soundSystem;
                
        this.#playing = false;
        this.#looping = false;
    }

    //--------------------------------
    // Getters and Setters
    //--------------------------------
    
    /**
     * Checks if the audio system is initialized and ready
     * @returns {boolean} True if ready
     */
    get isReady() {
        if (!this.#audioSystem) {
            console.warn('SoundComponent: Audio system not initialized');
            return false;
        }
        
        return this.#audioSystem.isInitialized();
    }

    /**
     * Returns true if the sound is playing
     */
    get isPlaying() {
        return this.#playing;
    }

    /**
     * Returns true if the sound is looping
     */
    get isLooping() {
        return this.#looping;
    }

    /**
     * Sets the looping behavior for a sound
     * @param {boolean} loop - True to enable looping
     * @returns {void}
     */
    set isLooping(loop) {
        if (!this.audioSystem || this.sourcePath === null) return;
        
        this._looping = loop;
        // Note: For true looping, need to use play() with appropriate options
    }

    /**
     * Gets the current audio system instance used by this component
     * @returns {SoundSystem|null} The audio system or null if not initialized
     */
    get audioSystem() {
        return this.#audioSystem;
    }

    /**
     * Sets the event handler for when a sound finishes playing
     * @param {function} handler - Callback function to handle ended event
     */
    set endedEvent(handler) {
        this.#hooks.onEnded = handler;
    }

    /**
     * Sets the event handler for when a sound encounters an error
     * @param {function} handler - Callback function to handle error event
     */
    set errorEvent(handler) {
        this.#hooks.onError = handler;
    }

    /**
     * gets the current source path of the playing sound
     * @returns {string|null} The source path or null if not set
     */
    get sourcePath() {
        return this.#sourcePath || null;
    }
    
    /**
     * Adjusts the volume of a playing sound
     * @param {number} value - New volume level (0.0 to 1.0)
     * @returns {void}
     */
    set volume(value) {
        if (!this.#audioSystem || this.sourcePath === null) return;
        
        this.#volume = Math.max(0, Math.min(1, value));
        this.#audioSystem.setVolume(this.sourcePath, this.#volume);
    }

    /**
     * Adjusts the pan of a playing sound (left to right)
     * @param {number} value - Pan value (-1.0 left to 1.0 right)
     * @returns {void}
     */
    set pan(value) {
        if (!this.#audioSystem || this.sourcePath === null) return;
        
        this.#pan = Math.max(-1, Math.min(1, value));
        this.#audioSystem.setPan(this.sourcePath, this.#pan);
    }

    /**
     * Gets the current volume of the component's sound
     * @returns {number} Current volume level
     */
    get volume() {
        return this.#volume;
    }

    /**
     * Gets the current pan of the component's sound
     * @returns {number} Pan value (-1.0 to 1.0)
     */
    get pan() {
        return this.#pan;
    }  
    
    //-------------------------------
    // Properties
    //-------------------------------

    get properties() {
        return {...super.properties, ...{
            AudioSystem: this.audioSystem,
            sourcePath: this.sourcePath,

            volume: this.volume,
            pan: this.pan,
            isReady: this.isReady,
            isPlaying: this.isPlaying,
            isLooping: this.isLooping,

            onEnded: this.#hooks.onEnded,
            onError: this.#hooks.onError,

            _source: this.#source
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
        if (this.#audioSystem && this.#audioSystem.getActiveSources().length > 0) {
            // Check for ended sounds
            const sources = this.#audioSystem.getActiveSources();
            sources.forEach(source => {
                if (!source.isPlaying && this.#hooks.onEnded) {
                    this.#hooks.onEnded(source.sourcePath);
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
        const newValue = Math.min(1, this.#volume + amount);
        this.setVolume(newValue);
    }

    /**
     * Adjusts the volume down by relative amount
     * @param {number} amount - Amount to decrease volume (e.g., 0.1)
     * @returns {void}
     */
    volumeDown(amount = 0.1) {
        const newValue = Math.max(0, this.#volume - amount);
        this.setVolume(newValue);
    }

    /**
     * Pans the sound slightly to the right
     * @param {number} amount - Amount to pan right (0.1)
     * @returns {void}
     */
    panRight(amount = 0.1) {
        const newValue = Math.min(1, this.#pan + amount);
        this.setPan(newValue);
    }

    /**
     * Pans the sound slightly to the left
     * @param {number} amount - Amount to pan left (0.1)
     * @returns {void}
     */
    panLeft(amount = 0.1) {
        const newValue = Math.max(-1, this.#pan - amount);
        this.setPan(newValue);
    }

    /**
     * Initializes the sound component with a specific audio system
     * @param {SoundSystem} system - SoundSystem instance to use
     * @returns {void}
     */
    initAudio(system) {
        this.#audioSystem = system;
        
        // Set default volume and pan
        this.setVolume(this.#volume);
        this.setPan(this.#pan);
    }

    /**
     * Updates all active sound volumes based on global settings
     * @returns {void}
     */
    syncGlobalSettings() {
        if (!this.#audioSystem || !this.sourcePath) return;
        
        // Sync volume
        const currentVolume = this.#audioSystem.getVolume(this.sourcePath);
        this.setVolume(currentVolume);
        
        // Sync pan
        const currentPan = this.#audioSystem.getPan(this.sourcePath);
        this.setPan(currentPan);
    }

    /**
     * Handles audio events (ended, error) if callbacks are registered
     * @param {string} eventType - Type of event ('ended' or 'error')
     * @param {Event} event - The event object
     * @returns {void}
     */
    handleAudioEvent(eventType, event) {
        if (eventType === 'ended' && this.#hooks.onEnded) {
            this.onEnded(event);
        } else if (eventType === 'error' && this.#hooks.onError) {
            this.onError(event);
        }
    }

    /**
     * Destroys the sound component and releases all resources
     * @returns {void}
     */
    destroy() {
        this.cleanup();
        this.#audioSystem = null;
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
        if (!this.#audioSystem) {
            throw new SoundSystemError(null, 'SoundComponent requires a SoundSystem to be initialized');
        }

        const playedSource = await this.#audioSystem.play(source, volume !== null ? volume : this.#volume, pan !== null ? pan : this.#pan);
        
        // Store loop setting if provided
        this.#looping = source.includes('loop') || this.#looping;
        this.#sourcePath = source;
        
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
        if (!this.#audioSystem || !this.#audioSystem.isPlaying(this.#sourcePath)) {
            return Promise.resolve();
        }
        
        await this.#audioSystem.pause(this.#sourcePath);
        return Promise.resolve(true);
    }

    /**
     * Stops a currently playing sound and rewinds to beginning
     * @returns {Promise} Promise that resolves when stopped
     */
    async stop() {
        if (!this.#audioSystem) {
            return Promise.resolve();
        }
        
        this.#audioSystem.stop(this.sourcePath);
        this.#playing = false;
        
        return Promise.resolve(true);
    }

    /**
     * Resumes a paused sound
     * @returns {Promise} Promise that resolves when resumed
     */
    async resume() {
        if (!this.#audioSystem) {
            return Promise.resolve();
        }
        
        await this.#audioSystem.resume(this.sourcePath);
        this.#playing = true;
        
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
        if (!this.#audioSystem) {
            throw new SoundSystemError(null, 'SoundComponent requires a SoundSystem to be initialized');
        }

        const playedSource = await this.#audioSystem.playBackground(source, volume !== null ? volume : this.#volume);
        
        // Background sounds typically don't loop by default
        this.#looping = false;
        
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
        if (!this.#audioSystem) return Promise.resolve();
        
        await this.#audioSystem.cleanup();
        this.#playing = false;
        return Promise.resolve(true);
    }

    //-------------------------------
    // Serialization Methods
    //--------------------------------
    deserialize(data) {
        super.deserialize(data);
        this.#volume = data.volume || 1.0;
        this.#pan = data.pan || 0;
        this.#looping = data.looping || false;
    }
}

export default SoundPart;