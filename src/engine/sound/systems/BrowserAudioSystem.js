 /**
@fileoverview BrowserAudioSystem Implementation
Uses browser's native HTML5 Audio API for audio playback 
*/
import Console from '../../core/Console.js';
import { SoundSystem, SoundSystemError } from '../SoundSystem.js';

class BrowserAudioSystem extends SoundSystem {
    constructor() {
        super();
        this.audioObjects = new Map(); // Store active audio objects
        this.globalVolume = 1.0;
        this.muted = false;
    }

    async init() {
        // Browser Audio API doesn't require initialization like Web Audio API
        return Promise.resolve(true);
    }

    /**
     * Plays a sound from file path or URL
     * @param {string} source - Path or URL to the audio file
     * @param {number} volume - Optional volume level (0.0 to 1.0)
     * @param {number} pan - Optional pan value (-1.0 left to 1.0 right)
     * @returns {Promise<AudioSource>} Promise that resolves when sound is ready
     */
    async play(source, volume = null, pan = null) {
        // Create a new audio object for this source
        const audioObject = {
            element: new Audio(),
            volume: this.globalVolume * (volume || 1.0),
            pan: pan || 0,
            isPlaying: true,
            sourcePath: source,
            startTime: null,
            pausedAt: null,
            originalTime: 0
        };

        // Handle browser audio autoplay policy - must have user interaction
        if (document) {
            const promise = new Promise((resolve, reject) => {
                this.handleSourceReady(source, audioObject, resolve, reject);
            });
            return promise;
        }

        return Promise.resolve(audioObject);
    }

    /**
     * Pauses a currently playing sound
     * @param {AudioSource} source - The audio source to pause
     * @returns {void}
     */
    pause(source) {
        if (!source) return;
        
        const audioObj = this.audioObjects.get(source.sourcePath);
        if (audioObj && audioObj.isPlaying) {
            audioObj.element.pause();
            audioObj.isPaused = true;
            audioObj.pausedAt = audioObj.originalTime;
        }
    }

    /**
     * Stops a currently playing sound and rewinds to beginning
     * @param {AudioSource} source - The audio source to stop
     * @returns {void}
     */
    stop(source) {
        if (!source) return;
        
        const audioObj = this.audioObjects.get(source.sourcePath);
        if (audioObj) {
            audioObj.element.pause();
            audioObj.element.currentTime = 0;
            audioObj.isPaused = true;
            audioObj.pausedAt = 0;
            audioObj.originalTime = 0;
        }
    }

    /**
     * Resumes a paused sound
     * @param {AudioSource} source - The audio source to resume
     * @returns {Promise} Promise that resolves when sound resumes
     */
    async resume(source) {
        if (!source) return Promise.resolve();
        
        const audioObj = this.audioObjects.get(source.sourcePath);
        if (audioObj && audioObj.isPaused) {
            audioObj.element.playbackRate = 1.0; // Reset rate
            audioObj.element.volume = this.globalVolume * audioObj.volume;
            
            if (audioObj.pausedAt !== null) {
                audioObj.element.currentTime = audioObj.pausedAt;
                audioObj.originalTime = audioObj.pausedAt;
            }
            
            await audioObj.element.play();
            audioObj.isPaused = false;
        }

        return Promise.resolve(true);
    }

    /**
     * Adjusts the volume of a playing sound
     * @param {AudioSource} source - The audio source to adjust
     * @param {number} value - New volume level (0.0 to 1.0)
     * @returns {void}
     */
    setVolume(source, value) {
        if (!source || !value) return;
        
        const audioObj = this.audioObjects.get(source.sourcePath);
        if (audioObj) {
            // Apply global volume and local volume adjustment
            audioObj.volume = value;
            audioObj.element.volume = this.globalVolume * value;
        }
    }

    /**
     * Sets the volume of all sounds
     * @param {number} value - New global volume level (0.0 to 1.0)
     * @returns {void}
     */
    setGlobalVolume(value) {
        this.globalVolume = Math.max(0, Math.min(1, value || 1));
        
        // Update all active sounds
        for (const [sourcePath, audioObj] of this.audioObjects.entries()) {
            if (!audioObj.isPaused) {
                audioObj.element.volume = this.globalVolume * audioObj.volume;
            }
        }
    }

    /**
     * Adjusts the pan of a playing sound (left to right)
     * @param {AudioSource} source - The audio source to adjust
     * @param {number} value - Pan value (-1.0 left to 1.0 right)
     * @returns {void}
     */
    setPan(source, value) {
        if (!source || !value) return;
        
        const audioObj = this.audioObjects.get(source.sourcePath);
        if (audioObj) {
            // Note: Browser Audio API doesn't support panning without Web Audio API
            // This method will only work if using WebAudioSystem for panning
            Console.warn('BrowserAudioSystem does not support panning - use WebAudioSystem for audio spatialization');
            audioObj.pan = value; // Store pan info for future reference
        }
    }

    /**
     * Gets the current volume of a sound source
     * @param {AudioSource} source - The audio source to check
     * @returns {number} Current volume level
     */
    getVolume(source) {
        if (!source) return 1.0;
        
        const audioObj = this.audioObjects.get(source.sourcePath);
        return audioObj ? audioObj.volume : 1.0;
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
     * @param {AudioSource} source - The audio source to check
     * @returns {number} Pan value (-1.0 to 1.0)
     */
    getPan(source) {
        if (!source) return 0;
        
        const audioObj = this.audioObjects.get(source.sourcePath);
        return audioObj ? audioObj.pan : 0;
    }

    /**
     * Checks if the audio system is initialized
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return true;
    }

    async initAudioContext() {
        // Browser Audio API doesn't require an audio context like Web Audio API
        return Promise.resolve(true);
    }

    getAudioContext() {
        return null;
    }

    /**
     * Plays a sound in background mode (no user interaction required after initial play)
     * @param {string} source - Path or URL to the audio file
     * @param {number} volume - Optional volume level (0.0 to 1.0)
     * @returns {Promise} Promise that resolves when sound is ready
     */
    async playBackground(source, volume = null) {
        // Note: Background audio still requires user interaction on most browsers
        // This method wraps the normal play with background handling
        return this.play(source, volume);
    }

    /**
     * Handles audio event callbacks (e.g., ended events)
     * @param {AudioSource} source - The audio source that triggered the event
     * @param {string} eventType - Type of event ('ended' or 'error')
     * @param {Event} event - The event object
     * @returns {void}
     */
    onAudioEvent(source, eventType, event) {
        const audioObj = this.audioObjects.get(source.sourcePath);
        
        if (!audioObj) return;

        if (eventType === 'ended') {
            // Auto-loop if configured
            if (audioObj.element.loop) {
                audioObj.element.currentTime = 0;
            } else {
                // Stop the sound when it ends
                audioObj.element.pause();
                audioObj.element.removeEventListener('ended', this.handleEnded);
            }
        } else if (eventType === 'error') {
            Console.error(`Audio error for source ${source.sourcePath}:`, event);
            // Optionally auto-stop on error
            audioObj.isPaused = true;
        }
    }

    /**
     * Gets the list of currently playing sounds
     * @returns {AudioSource[]} List of active audio sources
     */
    getActiveSources() {
        const sources = [];
        
        for (const [sourcePath, audioObj] of this.audioObjects.entries()) {
            if (!audioObj.isPaused || audioObj.element.loop) {
                sources.push({
                    sourcePath: sourcePath,
                    volume: audioObj.volume,
                    isPlaying: !audioObj.isPaused
                });
            }
        }
        
        return sources;
    }

    /**
     * Checks if a sound is currently playing
     * @param {string} source - Path or URL to the audio file
     * @returns {boolean} True if sound is playing
     */
    isPlaying(source) {
        const audioObj = this.audioObjects.get(source.sourcePath);
        return !(!audioObj || (audioObj.isPaused && !audioObj.element.loop));
    }

    /**
     * Cleans up and releases all audio resources
     * @returns {Promise} Promise that resolves when cleanup is complete
     */
    async cleanup() {
        // Stop and remove all audio objects
        for (const sourcePath of this.audioObjects.keys()) {
            const audioObj = this.audioObjects.get(sourcePath);
            if (audioObj) {
                audioObj.element.pause();
                audioObj.element.src = '';
                audioObj.element.volume = 0;
                audioObj.element.currentTime = 0;
            }
        }

        this.audioObjects.clear();
        return Promise.resolve(true);
    }

    /**
     * Sets the master mute state for all sounds
     * @param {boolean} muted - True to mute all sounds
     * @returns {void}
     */
    setMuted(muted) {
        this.muted = muted;
        
        // Apply mute to all active sounds
        for (const [sourcePath, audioObj] of this.audioObjects.entries()) {
            if (!audioObj.isPaused) {
                audioObj.element.volume = this.muted ? 0 : (this.globalVolume * audioObj.volume);
            }
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
     * Loads an audio file for future playback
     * @param {string} source - Path or URL to the audio file
     * @returns {Promise<boolean>} True if load was successful
     */
    async load(source) {
        const element = new Audio();
        return new Promise((resolve, reject) => {
            element.addEventListener('canplaythrough', () => {
                resolve(true);
            }, { once: true });

            element.addEventListener('error', (event) => {
                Console.error(`Failed to load audio: ${source}`, event);
                reject(new SoundSystemError(this, `Failed to load audio: ${source}`));
            }, { once: true });

            element.src = source;
        });
    }

    /**
     * Loads an audio file as ArrayBuffer for offline processing
     * @param {string} source - Path or URL to the audio file
     * @returns {Promise<ArrayBuffer>} Audio data as ArrayBuffer
     */
    async loadAsArrayBuffer(source) {
        const element = new Audio();
        return new Promise((resolve, reject) => {
            element.addEventListener('canplaythrough', () => {
                fetch(source)
                    .then(response => response.arrayBuffer())
                    .then(resolve)
                    .catch(reject);
            }, { once: true });

            element.addEventListener('error', (event) => {
                Console.error(`Failed to load audio: ${source}`, event);
                reject(new SoundSystemError(this, `Failed to load audio: ${source}`));
            }, { once: true });

            element.src = source;
        });
    }

    // Event handler for ended events
    handleEnded = () => {
        // Called automatically by the audio system when sound ends
    };
}

export default BrowserAudioSystem;