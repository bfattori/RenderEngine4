/**
@fileoverview SoundSystem Base Implementation
Provides abstract audio playback functionality and common interface for audio systems 
*/
import RenderEngineError from '../core/RenderEngineError.js';

/**
 * A sound system error.
 * @param {SoundSystem} soundSystem - The sound system that threw the error.
 * @param {string} message - A description of the error.
 * @param {Error|undefined} rootCause - The underlying cause of the error, if any. 
 */
class SoundSystemError extends RenderEngineError {
    constructor(soundSystem, message, rootCause) {
        super(message, rootCause);
        this.soundSystem = soundSystem;
    }
};

export default class SoundSystem {
    constructor() {
        // Initialize base sound system properties
        this.audioContext = null;
        this.masterGain = null;
        this.globalVolume = 1.0;
        this.muted = false;
        this.isInitialized = false;
        
        // Storage for active audio sources
        this.activeSources = new Map();
        
        // Configuration options
        this.volumeStep = 0.1;
        this.panStep = 0.25;
    }

    /**
     * Initializes the sound system (override in subclasses)
     * @returns {Promise<boolean>} True if initialization was successful
     */
    async init() {
        // Base implementation - subclasses should override this
        console.warn('SoundSystem: init() not implemented by subclass');
        return Promise.resolve(false);
    }

    /**
     * Initializes audio context (override in subclasses)
     * @returns {Promise<boolean>} True if initialization was successful
     */
    async initAudioContext() {
        // Base implementation - some systems (like BrowserAudioSystem) may not need this
        console.warn('SoundSystem: initAudioContext() not implemented by subclass');
        return Promise.resolve(true);
    }

    /**
     * Gets the audio context reference
     * @returns {?AudioContext} Audio context instance or null
     */
    getAudioContext() {
        return this.audioContext;
    }

    /**
     * Plays a sound from file path or URL
     * @param {string} source - Path or URL to the audio file
     * @param {number} volume - Optional volume level (0.0 to 1.0)
     * @param {number} pan - Optional pan value (-1.0 left to 1.0 right)
     * @returns {Promise<AudioSource>} Promise that resolves when sound is ready
     */
    async play(source, volume = null, pan = null) {
        throw new SoundSystemError(this, 'SoundSystem: play() not implemented by subclass');
    }

    /**
     * Pauses a currently playing sound
     * @param {string} source - The audio source to pause
     * @returns {void}
     */
    pause(source) {
        throw new SoundSystemError(this, 'SoundSystem: pause() not implemented by subclass');
    }

    /**
     * Stops a currently playing sound and rewinds to beginning
     * @param {string} source - The audio source to stop
     * @returns {void}
     */
    stop(source) {
        throw new SoundSystemError(this, 'SoundSystem: stop() not implemented by subclass');
    }

    /**
     * Resumes a paused sound
     * @param {string} source - The audio source to resume
     * @returns {Promise<boolean>} Promise that resolves when sound resumes
     */
    async resume(source) {
        throw new SoundSystemError(this, 'SoundSystem: resume() not implemented by subclass');
    }

    /**
     * Adjusts the volume of a playing sound
     * @param {string} source - The audio source to adjust
     * @param {number} value - New volume level (0.0 to 1.0)
     * @returns {void}
     */
    setVolume(source, value) {
        throw new SoundSystemError(this, 'SoundSystem: setVolume() not implemented by subclass');
    }

    /**
     * Sets the global volume for all sounds
     * @param {number} value - New global volume level (0.0 to 1.0)
     * @returns {void}
     */
    setGlobalVolume(value) {
        throw new SoundSystemError(this, 'SoundSystem: setGlobalVolume() not implemented by subclass');
    }

    /**
     * Adjusts the pan of a playing sound (left to right)
     * @param {string} source - The audio source to adjust
     * @param {number} value - Pan value (-1.0 left to 1.0 right)
     * @returns {void}
     */
    setPan(source, value) {
        throw new SoundSystemError(this, 'SoundSystem: setPan() not implemented by subclass');
    }

    /**
     * Gets the current volume of a sound source
     * @param {string} source - The audio source to check
     * @returns {number} Current volume level
     */
    getVolume(source) {
        throw new SoundSystemError(this, 'SoundSystem: getVolume() not implemented by subclass');
    }

    /**
     * Gets the global volume setting
     * @returns {number} Global volume level
     */
    getGlobalVolume() {
        return this.globalVolume;
    }

    /**
     * Gets the current pan of a sound source
     * @param {string} source - The audio source to check
     * @returns {number} Pan value (-1.0 to 1.0)
     */
    getPan(source) {
        throw new SoundSystemError(this, 'SoundSystem: getPan() not implemented by subclass');
    }

    /**
     * Checks if the audio system is initialized
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return this.isInitialized;
    }

    /**
     * Plays a sound in background mode (no user interaction required after initial play)
     * @param {string} source - Path or URL to the audio file
     * @param {number} volume - Optional volume level (0.0 to 1.0)
     * @returns {Promise<AudioSource>} Promise that resolves when sound is ready
     */
    async playBackground(source, volume = null) {
        // Default implementation delegates to regular play()
        return this.play(source, volume);
    }

    /**
     * Handles audio event callbacks (e.g., ended events)
     * @param {string} source - The audio source that triggered the event
     * @param {string} eventType - Type of event ('ended' or 'error')
     * @param {Event} event - The event object
     * @returns {void}
     */
    onAudioEvent(source, eventType, event) {
        // Base implementation can be overridden by subclasses
    }

    /**
     * Gets the list of currently playing sounds
     * @returns {AudioSource[]} List of active audio sources
     */
    getActiveSources() {
        const sources = [];
        
        for (const [sourcePath, audioInfo] of this.activeSources.entries()) {
            sources.push({
                sourcePath: sourcePath,
                volume: audioInfo.volume || 1.0,
                isPlaying: audioInfo.isPlaying ? true : false,
                pan: audioInfo.pan || 0,
                pausedAt: audioInfo.pausedAt || null
            });
        }
        
        return sources;
    }

    /**
     * Checks if a sound is currently playing
     * @param {string} source - Path or URL to the audio file
     * @returns {boolean} True if sound is playing
     */
    isPlaying(source) {
        const activeSource = this.activeSources.get(source);
        return !(!activeSource || (!activeSource.isPlaying && !this.isMuted()));
    }

    /**
     * Cleans up and releases all audio resources
     * @returns {Promise<boolean>} Promise that resolves when cleanup is complete
     */
    async cleanup() {
        // Stop all active sources
        for (const sourcePath of this.activeSources.keys()) {
            const audioInfo = this.activeSources.get(sourcePath);
            if (audioInfo && audioInfo.node) {
                audioInfo.node.stop();
            }
        }

        // Clear active sources
        this.activeSources.clear();
        
        return Promise.resolve(true);
    }

    /**
     * Sets the master mute state for all sounds
     * @param {boolean} muted - True to mute all sounds
     * @returns {void}
     */
    setMuted(muted) {
        this.muted = muted;
        
        // Apply mute to all active sources
        if (this.masterGain) {
            this.masterGain.gain.value = muted ? 0 : 1.0;
        }
    }

    /**
     * Gets the master muted state
     * @returns {boolean} True if all sounds are muted
     */
    isMuted() {
        return this.muted;
    }

    /**
     * Loads an audio file as ArrayBuffer for offline processing
     * @param {string} source - Path or URL to the audio file
     * @returns {Promise<ArrayBuffer>} Audio data as ArrayBuffer
     */
    async loadAsArrayBuffer(source) {
        try {
            const response = await fetch(source);
            if (!response.ok) {
                throw new SoundSystemError(this, `Failed to load audio: ${source} (HTTP ${response.status})`);
            }
            return await response.arrayBuffer();
        } catch (error) {
            console.error(`Failed to load audio: ${source}`, error);
            throw error;
        }
    }

    /**
     * Loads an audio buffer from URL
     * @param {string} source - Path or URL to the audio file
     * @returns {Promise<AudioBuffer>} Audio buffer
     */
    async loadAudioBuffer(source) {
        try {
            const arrayBuffer = await this.loadAsArrayBuffer(source);
            
            if (this.audioContext) {
                return await this.audioContext.decodeAudioData(arrayBuffer);
            } else {
                // Return raw array buffer if no audio context available
                return arrayBuffer;
            }
        } catch (error) {
            console.error(`Failed to decode audio buffer:`, error);
            throw new SoundSystemError(this, `Failed to load audio: ${source}`);
        }
    }

    /**
     * Increments volume by relative amount
     * @param {string} source - The audio source to adjust
     * @param {number} amount - Amount to increase (e.g., 0.1)
     * @returns {void}
     */
    volumeUp(source, amount = this.volumeStep) {
        const currentVolume = this.getVolume(source);
        const newValue = Math.min(1, currentVolume + amount);
        this.setVolume(source, newValue);
    }

    /**
     * Decrements volume by relative amount
     * @param {string} source - The audio source to adjust
     * @param {number} amount - Amount to decrease (e.g., 0.1)
     * @returns {void}
     */
    volumeDown(source, amount = this.volumeStep) {
        const currentVolume = this.getVolume(source);
        const newValue = Math.max(0, currentVolume - amount);
        this.setVolume(source, newValue);
    }

    /**
     * Pans the sound to the right
     * @param {string} source - The audio source to adjust
     * @param {number} amount - Amount to pan right (default 0.25)
     * @returns {void}
     */
    panRight(source, amount = this.panStep) {
        const currentPan = this.getPan(source);
        const newValue = Math.min(1, currentPan + amount);
        this.setPan(source, newValue);
    }

    /**
     * Pans the sound to the left
     * @param {string} source - The audio source to adjust
     * @param {number} amount - Amount to pan left (default 0.25)
     * @returns {void}
     */
    panLeft(source, amount = this.panStep) {
        const currentPan = this.getPan(source);
        const newValue = Math.max(-1, currentPan - amount);
        this.setPan(source, newValue);
    }

    /**
     * Destroys the audio system and releases resources
     * @returns {void}
     */
    destroy() {
        this.cleanup();
        
        // Clear references to allow garbage collection
        this.audioContext = null;
        this.masterGain = null;
        this.activeSources.clear();
        this.isInitialized = false;
    }

    /**
     * Resets the audio system to initial state
     * @returns {Promise<boolean>} Promise that resolves if reset was successful
     */
    async reset() {
        await this.cleanup();
        
        this.globalVolume = 1.0;
        this.muted = false;
        this.activeSources.clear();
        this.isInitialized = false;
        
        return Promise.resolve(true);
    }
};

export {
    SoundSystemError
};