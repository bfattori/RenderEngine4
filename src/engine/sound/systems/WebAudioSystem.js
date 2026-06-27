 /**
@fileoverview WebAudioSystem Implementation
Uses Web Audio API for advanced audio processing and spatialization */
import Console from '../../core/Console.js';
import { SoundSystem, SoundSystemError } from '../SoundSystem.js';

class WebAudioSystem extends SoundSystem {
    constructor() {
        super();
        this.audioContext = null;
        this.masterGain = null;
        this.pannerNodes = new Map();
        this.activeSources = new Map();
        this.globalVolume = 1.0;
        this.muted = false;
    }

    async init() {
        // Create Web Audio API context
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain node for volume control
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.setGlobalVolume(1.0);
            
            return Promise.resolve(true);
        } catch (error) {
            Console.error('Web Audio API not supported:', error);
            throw new SoundSystemError(this, 'Web Audio API is not supported in this browser', error);
        }
    }

    /**
     * Plays a sound from file path or URL
     * @param {string} source - Path or URL to the audio file
     * @param {number} volume - Optional volume level (0.0 to 1.0)
     * @param {number} pan - Optional pan value (-1.0 left to 1.0 right)
     * @returns {Promise<AudioSource>} Promise that resolves when sound is ready
     */
    async play(source, volume = null, pan = null) {
        const audioBuffer = await this.loadAudioBuffer(source);
        
        // Create source node from buffer
        const sourceNode = this.audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        
        // Create gain node for volume control
        const sourceGain = this.audioContext.createGain();
        
        // Create panner node for spatialization
        const panner = this.audioContext.createStereoPanner();
        
        // Connect the nodes: source -> gain -> panner -> master -> destination
        sourceNode.connect(sourceGain);
        sourceGain.connect(panner);
        panner.connect(this.masterGain);
        
        // Set initial volume and pan
        const localVolume = this.globalVolume * (volume || 1.0);
        sourceGain.gain.value = localVolume;
        
        let panValue = pan || 0;
        if (panValue < -1) panValue = -1;
        if (panValue > 1) panValue = 1;
        panner.pan.value = panValue;
        
        // Start the source
        try {
            await this.audioContext.resume();
            sourceNode.start(0);
            
            // Store audio source info
            const audioSourceInfo = {
                node: sourceNode,
                gainNode: sourceGain,
                panner: panner,
                isPlaying: true,
                pausedAt: null,
                volume: localVolume,
                pan: panValue,
                sourcePath: source,
                startTime: this.audioContext.currentTime
            };
            
            this.activeSources.set(source, audioSourceInfo);
            this.pannerNodes.set(source, panner);
            
            return Promise.resolve(audioSourceInfo);
        } catch (error) {
            Console.error('Error starting audio source:', error);
            return Promise.reject(new SoundSystemError(this, 'Error starting audio source', error));
        }
    }

    /**
     * Pauses a currently playing sound
     * @param {AudioSource} source - The audio source to pause
     * @returns {void}
     */
    pause(source) {
        const audioInfo = this.activeSources.get(source);
        
        if (audioInfo && audioInfo.isPlaying) {
            const currentTime = this.audioContext.currentTime;
            const pausedTime = audioInfo.node.currentTime;
            
            // Schedule pause at current time
            audioInfo.node.stop(currentTime + 0.001); // Stop immediately
            
            audioInfo.pausedAt = pausedTime;
            audioInfo.isPaused = true;
        }
    }

    /**
     * Stops a currently playing sound and rewinds to beginning
     * @param {AudioSource} source - The audio source to stop
     * @returns {void}
     */
    stop(source) {
        const audioInfo = this.activeSources.get(source);
        
        if (audioInfo) {
            // Stop and reset the source
            audioInfo.node.stop();
            audioInfo.node.currentTime = 0;
            
            audioInfo.pausedAt = 0;
            audioInfo.isPaused = true;
        }
    }

    /**
     * Resumes a paused sound
     * @param {AudioSource} source - The audio source to resume
     * @returns {Promise} Promise that resolves when sound resumes
     */
    async resume(source) {
        const audioInfo = this.activeSources.get(source);
        
        if (audioInfo && audioInfo.isPaused) {
            const currentTime = this.audioContext.currentTime;
            
            // Resume the source from where it was paused
            await new Promise(resolve => {
                audioInfo.node.onended = resolve;
                
                // Start from pause position
                audioInfo.node.start(currentTime, audioInfo.pausedAt);
            });
            
            audioInfo.isPaused = false;
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
        const audioInfo = this.activeSources.get(source);
        
        if (audioInfo && audioInfo.gainNode) {
            const localVolume = this.globalVolume * Math.max(0, Math.min(1, value || 0));
            audioInfo.gainNode.gain.value = localVolume;
            audioInfo.volume = localVolume;
        }
    }

    /**
     * Sets the volume of all sounds
     * @param {number} value - New global volume level (0.0 to 1.0)
     * @returns {void}
     */
    setGlobalVolume(value) {
        this.globalVolume = Math.max(0, Math.min(1, value || 1));
        
        // Update all active sources
        for (const audioInfo of this.activeSources.values()) {
            if (!audioInfo.isPaused) {
                const localVolume = this.globalVolume * audioInfo.volume;
                audioInfo.gainNode.gain.value = localVolume;
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
        const audioInfo = this.activeSources.get(source);
        
        if (audioInfo && audioInfo.panner) {
            let panValue = Math.max(-1, Math.min(1, value || 0));
            audioInfo.panner.pan.value = panValue;
            audioInfo.pan = panValue;
        }
    }

    /**
     * Gets the current volume of a sound source
     * @param {AudioSource} source - The audio source to check
     * @returns {number} Current volume level
     */
    getVolume(source) {
        const audioInfo = this.activeSources.get(source);
        
        if (audioInfo && !audioInfo.isPaused) {
            return audioInfo.gainNode ? audioInfo.gainNode.gain.value : 1.0;
        }
        
        return audioInfo ? audioInfo.volume : 1.0;
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
        const panner = this.pannerNodes.get(source);
        
        if (panner) {
            return panner.pan.value;
        }
        
        return 0;
    }

    /**
     * Checks if the audio system is initialized
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return this.audioContext !== null;
    }

    async initAudioContext() {
        // Already handled in init()
        return Promise.resolve(true);
    }

    getAudioContext() {
        return this.audioContext;
    }

    /**
     * Plays a sound in background mode (no user interaction required after initial play)
     * @param {string} source - Path or URL to the audio file
     * @param {number} volume - Optional volume level (0.0 to 1.0)
     * @returns {Promise} Promise that resolves when sound is ready
     */
    async playBackground(source, volume = null) {
        // Note: Web Audio API still requires user interaction on most browsers
        // Background audio needs proper handling
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
        const audioInfo = this.activeSources.get(source);
        
        if (!audioInfo) return;

        if (eventType === 'ended') {
            // Stop the source when it ends
            audioInfo.node.stop();
            
            // Optionally auto-loop
            if (audioInfo.sourcePath.endsWith('.mp3') && audioInfo.isPlaying) {
                // Auto-loop logic can be added here
            }
        } else if (eventType === 'error') {
            Console.error(`Audio error for source ${source}:`, event);
            audioInfo.isPaused = true;
        }
    }

    /**
     * Gets the list of currently playing sounds
     * @returns {AudioSource[]} List of active audio sources
     */
    getActiveSources() {
        const sources = [];
        
        for (const [sourcePath, audioInfo] of this.activeSources.entries()) {
            if (!audioInfo.isPaused || audioInfo.sourcePath.endsWith('.mp3')) {
                sources.push({
                    sourcePath: sourcePath,
                    volume: audioInfo.volume,
                    isPlaying: !audioInfo.isPaused
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
        const audioInfo = this.activeSources.get(source);
        return !(!audioInfo || (audioInfo.isPaused && !this.sourcePath.endsWith('.mp3')));
    }

    /**
     * Cleans up and releases all audio resources
     * @returns {Promise} Promise that resolves when cleanup is complete
     */
    async cleanup() {
        // Stop and disconnect all sources
        for (const audioInfo of this.activeSources.values()) {
            if (audioInfo.node) {
                audioInfo.node.stop();
            }
        }

        // Clear active sources
        this.activeSources.clear();
        
        // Disconnect panner nodes
        this.pannerNodes.forEach(panner => {
            try {
                panner.disconnect();
            } catch (e) {
                Console.error('Error disconnecting panner:', e);
            }
        });
        
        return Promise.resolve(true);
    }

    /**
     * Sets the master mute state for all sounds
     * @param {boolean} muted - True to mute all sounds
     * @returns {void}
     */
    setMuted(muted) {
        this.muted = muted;
        
        // Apply mute to master gain
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
     * Loads an audio file as ArrayBuffer
     * @param {string} source - Path or URL to the audio file
     * @returns {Promise<ArrayBuffer>} Audio data as ArrayBuffer
     */
    async loadAsArrayBuffer(source) {
        try {
            const response = await fetch(source);
            return await response.arrayBuffer();
        } catch (error) {
            Console.error(`Failed to load audio: ${source}`, error);
            throw new SoundSystemError(this, `Failed to load audio: ${source}`, error);
        }
    }

    /**
     * Loads an audio buffer from ArrayBuffer or file path
     * @param {string|ArrayBuffer} source - Path or URL to the audio file, or ArrayBuffer
     * @returns {Promise<AudioBuffer>} Audio buffer
     */
    async loadAudioBuffer(source) {
        try {
            const response = await fetch(source);
            const arrayBuffer = await response.arrayBuffer();
            
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            return audioBuffer;
        } catch (error) {
            Console.error(`Failed to decode audio buffer:`, error);
            throw new SoundSystemError(this, `Failed to load audio: ${source}`, error);
        }
    }

    /**
     * Plays synthesized sound using oscillator
     * @param {Object} options - Sound synthesis options
     * @returns {Promise<AudioSource>} Promise that resolves when sound is ready
     */
    async playSynthesized(options) {
        const audioBuffer = await this.createOscillatorBuffer(options);
        return this.play(audioBuffer);
    }

    /**
     * Creates a buffer with synthesized audio using oscillator
     * @param {Object} options - Oscillator options (frequency, type, duration, etc.)
     * @returns {Promise<AudioBuffer>} Audio buffer
     */
    async createOscillatorBuffer(options) {
        const { frequency = 440, duration = 1, type = 'sine', volume = 1 } = options;
        
        const audioContext = this.audioContext;
        const bufferSize = audioContext.sampleRate * duration;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        
        const data = buffer.getChannelData(0);
        const sampleRate = audioContext.sampleRate;
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / sampleRate;
            data[i] = Math.sin(2 * Math.PI * frequency * t) * volume;
        }
        
        return buffer;
    }

    /**
     * Creates a noise buffer for sound effects
     * @param {number} duration - Duration in seconds
     * @returns {Promise<AudioBuffer>} Noise buffer
     */
    async createNoiseBuffer(duration = 1) {
        const audioContext = this.audioContext;
        const bufferSize = audioContext.sampleRate * duration;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1; // White noise
        }
        
        return buffer;
    }

    /**
     * Creates a low-pass filter effect
     * @param {number} frequency - Filter frequency in Hz
     * @returns {BiquadFilterNode} Filter node
     */
    createLowPassFilter(frequency = 1000) {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = frequency;
        return filter;
    }

    /**
     * Creates a delay effect
     * @param {number} time - Delay time in seconds
     * @returns {DelayNode} Delay node
     */
    createDelay(time = 0.5) {
        const delay = this.audioContext.createDelay();
        delay.delayTime.value = time;
        
        const feedbackGain = this.audioContext.createGain();
        feedbackGain.gain.value = 0.5;
        
        // Create feedback loop
        delay.connect(feedbackGain);
        feedbackGain.connect(delay);
        
        return delay;
    }

    /**
     * Destroys the audio system and releases resources
     * @returns {void}
     */
    destroy() {
        this.cleanup().then(() => {
            // Clear all references to allow garbage collection
            this.audioContext = null;
            this.masterGain = null;
            this.pannerNodes.clear();
            this.activeSources.clear();
        });
    }
}

export default WebAudioSystem;