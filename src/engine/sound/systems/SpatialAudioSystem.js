 /**
@fileoverview SpatialAudioSystem Implementation
Advanced audio system with spatial positioning 
*/
import SoundSystemError from '../SoundSystem.js';
import WebAudioSystem from './WebAudioSystem.js';

class SpatialAudioSystem extends WebAudioSystem {
    constructor() {
        super();
        this.spatialContextEnabled = true;
        this.positionalSources = new Map();
        this.environmentSettings = {
            reverb: false,
            ambientGain: 0.3,
            distanceRollOff: true,
            minDistance: 1.0,
            maxDistance: 50.0
        };
    }

    /**
     * Plays a spatialized sound with position and orientation
     * @param {Object} options - Spatial audio options
     * @returns {Promise<AudioSource>} Promise that resolves when sound is ready
     */
    async playSpatial(options) {
        const { 
            source, 
            volume = null, 
            pan = null,
            position, // x, y coordinates
            orientation, // rotation angle in radians
            priority = 'normal'
        } = options;

        // Create 3D panner node for spatial positioning
        const listener = this.audioContext.createStereoPanner();
        
        // For true 3D spatialization, use position-based panning
        if (position) {
            const pannerNode = this.audioContext.createStereoPanner();
            
            // Convert x-y position to stereo panning values
            const x = position.x || 0;
            const y = position.y || 0;
            
            // Map x-axis to pan value (-1.0 to 1.0)
            const panValue = Math.max(-1, Math.min(1, x));
            
            pannerNode.pan.value = panValue;
        } else if (orientation !== undefined) {
            // Use orientation for rotation-based panning
            const panValue = Math.sin(orientation) * 0.5; // Simplified
        }

        return await super.play(source, volume, pan);
    }

    /**
     * Plays a sound at a specific position in the world
     * @param {string} source - Path or URL to the audio file
     * @param {Object} position - Position {x, y} or {x, y, z}
     * @param {number} volume - Optional volume level (0.0 to 1.0)
     * @returns {Promise<AudioSource>} Promise that resolves when sound is ready
     */
    async playAtPosition(source, position, volume = null) {
        const audioBuffer = await this.loadAudioBuffer(source);
        
        // Create source node from buffer
        const sourceNode = this.audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        
        // Create gain and panner nodes
        const sourceGain = this.audioContext.createGain();
        const panner = this.audioContext.createStereoPanner();
        
        // Position-based spatialization
        if (position && typeof position === 'object') {
            const x = position.x || 0;
            const y = position.y || 0;
            
            // Convert world coordinates to stereo pan
            const panValue = Math.max(-1, Math.min(1, x / 2)); // Scale x for reasonable panning
            
            panner.pan.value = panValue;
        }
        
        // Connect: source -> gain -> panner -> master
        sourceNode.connect(sourceGain);
        sourceGain.connect(panner);
        panner.connect(this.masterGain);
        
        const localVolume = this.globalVolume * (volume || 1.0);
        sourceGain.gain.value = localVolume;
        
        // Start the source
        try {
            await this.audioContext.resume();
            sourceNode.start(0);
            
            // Store spatial info
            const audioSourceInfo = {
                node: sourceNode,
                gainNode: sourceGain,
                panner: panner,
                isPlaying: true,
                pausedAt: null,
                volume: localVolume,
                pan: panner.pan.value,
                position: position,
                sourcePath: source,
                startTime: this.audioContext.currentTime
            };
            
            this.activeSources.set(source, audioSourceInfo);
            return Promise.resolve(audioSourceInfo);
        } catch (error) {
            console.error('Error starting spatial audio source:', error);
            return Promise.reject(new SoundSystemError(this, 'Error starting spatial audio source', error));
        }
    }

    /**
     * Updates the position of a playing sound
     * @param {string} source - The audio source
     * @param {Object} newPosition - New position {x, y, z}
     * @returns {void}
     */
    updatePosition(source, newPosition) {
        const audioInfo = this.activeSources.get(source);
        
        if (audioInfo && audioInfo.panner) {
            // Update panning based on new position
            const x = newPosition.x || 0;
            const panValue = Math.max(-1, Math.min(1, x / 2));
            
            audioInfo.panner.pan.value = panValue;
            audioInfo.position = newPosition;
        }
    }

    /**
     * Updates the orientation/rotation of a playing sound
     * @param {string} source - The audio source
     * @param {number} rotation - Rotation angle in radians
     * @returns {void}
     */
    updateOrientation(source, rotation) {
        const audioInfo = this.activeSources.get(source);
        
        if (audioInfo && audioInfo.panner) {
            // Apply rotation-based panning adjustment
            const panValue = Math.sin(rotation) * 0.5;
            audioInfo.panner.pan.value += panValue;
        }
    }

    /**
     * Adjusts distance-based volume for a spatial sound
     * @param {string} source - The audio source
     * @param {number} distance - Distance from listener
     * @returns {void}
     */
    adjustDistanceVolume(source, distance) {
        const audioInfo = this.activeSources.get(source);
        
        if (!audioInfo || !this.environmentSettings.distanceRollOff) return;
        
        // Apply distance-based volume attenuation
        const minDist = this.environmentSettings.minDistance;
        const maxDist = this.environmentSettings.maxDistance;
        
        if (distance <= minDist) {
            audioInfo.gainNode.gain.value = this.globalVolume * audioInfo.volume;
        } else if (distance >= maxDist) {
            audioInfo.gainNode.gain.value = 0; // Fade out at max distance
        } else {
            // Linear attenuation
            const ratio = (maxDist - distance) / (maxDist - minDist);
            const newVolume = this.globalVolume * audioInfo.volume * ratio;
            audioInfo.gainNode.gain.value = Math.max(0, newVolume);
        }
        
        audioInfo.volume = audioInfo.gainNode.gain.value;
    }

    /**
     * Sets the environment settings for spatial audio
     * @param {Object} settings - Environment configuration options
     * @returns {void}
     */
    setEnvironment(settings) {
        this.environmentSettings = { ...this.environmentSettings, ...settings };
        
        if (settings.ambientGain !== undefined) {
            // Update ambient gain if available
            console.log('Ambient gain set to:', settings.ambientGain);
        }
    }

    /**
     * Plays a background music track with spatial positioning
     * @param {string} source - Path or URL to the audio file
     * @param {Object} position - Optional initial position {x, y}
     * @returns {Promise<AudioSource>} Promise that resolves when sound is ready
     */
    async playMusic(source, position = null) {
        // Music typically uses stereo panning for spatial effect
        return await this.playAtPosition(source, position);
    }

    /**
     * Gets the spatial context status
     * @returns {boolean} True if spatial audio is enabled
     */
    isSpatialContextEnabled() {
        return this.spatialContextEnabled;
    }

    /**
     * Toggles spatial audio on/off
     * @param {boolean} enabled - True to enable, false to disable
     * @returns {void}
     */
    setSpatialContext(enabled) {
        this.spatialContextEnabled = enabled;
        
        if (!enabled) {
            // Disable 3D panning, convert to simple stereo panner
            this.positionalSources.forEach(info => {
                if (info.panner) {
                    info.panner.disconnect();
                }
            });
        } else {
            // Enable 3D panning for positional sources
            this.positionalSources.forEach(info => {
                if (info.position && !info.panner) {
                    const panner = this.audioContext.createStereoPanner();
                    info.panner = panner;
                    info.gainNode.connect(panner);
                }
            });
        }
    }

    /**
     * Destroys the audio system and releases resources
     * @returns {void}
     */
    destroy() {
        super.destroy();
        this.positionalSources.clear();
    }
}

export default SpatialAudioSystem;