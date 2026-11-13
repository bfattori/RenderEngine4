import Constants from '../Constants.js';
import Context from '../Context.js';

import RenderEngineError from '../core/RenderEngineError.js';
import Spark from '../core/memory/Spark.js';

import { ParticleEngineConfig, ParticleEngineThreadingConfig } from './ParticleEngine.js';
import Particle from './Particle.js';
import ParticleInfluencer from './ParticleInfluencer.js';

import BroadphaseModel from '../collisionSystems/broadphase/BroadphaseModel.js';
import GridBroadphase from '../collisionSystems/broadphase/GridBroadphase.js';

const ctx = Context.getInstance();

export default class $ParticleEngine {
    static #instance = null;
    static #useBuilder = true;

    #collisionModel = null;
    
    #config = null;
    #threading = null;

    // a list of opaque Ids to particle types
    #opaqueId = 1;
    #opaqueMap = new Map();

    // particle types the engine is configured to render
    #particleTypes = new Map();

    // particle effects the engine is configured to run
    #particleEffects = new Map();

    // particle influence zones
    #particleInfluencers = [];

    // when new particles are added, this goes true
    #newParticles = false;

    // these are the arrays of particle "memories", positions, velocities, and lifespans.  
    // the particle engine only has access to this information during the lifecycle stages
    #memories = null;
    
    // pointer to the arrays above
    #particleIdx = -1;
    
    // number of particles that are live in the engine
    #liveParticles = 0;
    
    // particles are added to a buffer to be added after each update completes
    // this comes down to threading, since world updates occur simultaneous to particle updates
    #buffered = [];

    // the render context for the particle engine, combined back with the
    // context in the main thread
    #offscreen = null;
    #surface = null;

    #engineLoadView = null;
    #start = 0;

    #width = 0;
    #height = 0;
    #assembler = null;

    #particleByteSize = 0;
    #cleaningLatch = false;

    /**
     * Get the instance of the `ParticleEngine`.  This method should be used instead of creating 
     * a new instance directly to enforce the singleton pattern.
     * 
     * @param {RenderContext} renderContext - The render context this is paired with
     * @param {number} width - The width of the render context of the particle engine
     * @param {number} height - The height of the render context of the particle engine
     * @param {Object} config - The `particleEngine` portion of the engine configuration
     * @param {Object} threading - The `particleEngine` portion of the engine threading configuration
     * @returns {ParticleEngine} The `ParticleEngine` singleton instance
     * @static
     */
    static getInstance(renderContext, width, height, config, threading) {
        if ($ParticleEngine.#instance === null) {
            $ParticleEngine.#useBuilder = false;
            $ParticleEngine.#instance = new $ParticleEngine(renderContext, width, height, config, threading);
        }

        return $ParticleEngine.#instance;
    }

    /**
     * Used by `ParticleWorker` to create an internal instance of the `ParticleEngine`. Particle workers
     * will assign the assembler to use instead of getting it from the `RenderContext`.
     * 
     * @param {number} width - The width of the render context of the particle engine
     * @param {number} height - The height of the render context of the particle engine
     * @param {Object} config - The `particleEngine` portion of the engine configuration
     * @param {Object} threading - The `particleEngine` portion of the engine threading configuration
     * @returns {ParticleEngine} The `ParticleEngine` singleton instance
     * @static
     */
    static getWorkerInstance(width, height, config, threading) {
        if ($ParticleEngine.#instance === null) {
            $ParticleEngine.#useBuilder = false;
            $ParticleEngine.#instance = new $ParticleEngine(null, width, height, config, threading);
        }

        return $ParticleEngine.#instance;
    }

    /**
     * @private
     * Initialize the particle engine.
     */
    constructor(renderContext, width, height, config, threading) {
        if ($ParticleEngine.#useBuilder)
            throw new RenderEngineError("Cannot instantiate $ParticleEngine directly. Use getInstance() instead.");

        // enforce singleton pattern
        $ParticleEngine.#useBuilder = true;

        this.#engineLoadView = PRAGMA($ParticleEngine, 'showParticleEngineLoad', {init: !threading});

        this.#config = new ParticleEngineConfig();
        this.#config.merge(config);
        if (threading) {
            this.#threading = new ParticleEngineThreadingConfig();
            this.#threading.merge(threading);
        }

        this.#width = width;
        this.#height = height;

        // the model used by repulsors to determine collisions
        this.#collisionModel = new GridBroadphase('ParticleEngineCollisions', this.#width, this.#height, this.#config.modelSize.x, this.#config.modelSize.y, BroadphaseModel.ACCURACY.LOW);
        this.#collisionModel.supportMulti = true;

        if (renderContext !== null) {
            // the workers will assign their cache
            this.#assembler = renderContext.renderer.assembler;
        }

        // the rendering context for the particle engine
        this.#offscreen = new OffscreenCanvas(width, height);
        this.#surface = this.#offscreen.getContext('2d');
    }

    /**
     * Get the current configuration for the particle engine.
     * @returns {ParticleConfig} The current configuration
     */
    get config() {
        return this.#config;
    }

    get thread() {
        return this.#threading;
    }

    get enabled() {
        return !this.config.disabled;
    }

    get offscreen() {
        return this.#offscreen;
    }

    get surface() {
        return this.#surface;
    }

    /**
     * Get the maximum number of particles the engine can produce.
     * @returns {number} The maximum particle count
     */
    get maxParticles() {
        return this.config.maxParticles;
    }

    /**
     * Set the maxmimum number of particles the engine can produce.
     * @param {number} max - The maximum particle count
     */
    set maxParticles(count) {
        this.config.maxParticles = count;
    }

    /**
     * The number of particles that have not reached their lifespan
     * @return {number} Number of live particles
     */
    get liveParticles() {
        return this.#liveParticles;
    }

    /**
     * Returns `true` if the buffer is circular
     * @returns {boolean} `true` if the buffer is circular, `false` otherwise.
     */
    get isCircular() {
        return this.config.circularBuffer;
    }

    /**
     * The particle types available to the engine
     * @returns {Map<string, ParticleType>} A map of particle types to their corresponding ParticleType objects.
     */
    get types() {
        return this.#particleTypes;
    }

    get typesByName() {
        const byName = new Map();
        this.#particleTypes.forEach(pType => byName.set(pType.$name, pType));
        return byName;
    }

    /**
     * The particle effects available to the engine
     * @returns {Map<string, ParticleEffect>} A map of particle effects to their corresponding ParticleEffect objects.
     */
    get effects() {
        return this.#particleEffects;
    }

    get effectsByName() {
        const byName = new Map();
        this.#particleEffects.forEach(pEffect => byName.set(pEffect.$name, pEffect));
        return byName;
    }

    /**
     * The collection of particle repulsors in the engine
     * @returns {Map<String, Array<ParticleInfluencer>>} A map of particle repulsors
     */
    get influencers() {
        return this.#particleInfluencers;
    }

    /**
     * Get the bitmap image of the offscreen canvas, and reset it
     * for the next rendering.
     * @returns {ImageBitmap} The bitmap image of the offscreen canvas, and reset it
     */
    get bitmap() {
        return this.#offscreen.transferToImageBitmap();
    }

    /**
     * Get the associated render context assembler for particle engine tiles
     * @returns {RenderContext}
     */
    get assembler() {
        return this.#assembler;
    }

    /**
     * Initialize the particle engine, allocating the memory for position, velocity,
     * lifespan, and particle memory.
     */
    async initialize() {
        const count = this.config.maxParticles;

        // Particle memory req: headerSize + maxParticleSize
        const memoryHeap = new ArrayBuffer(count * (Constants.PH_BYTES + this.#particleByteSize));
        this.#memories = new Spark(memoryHeap);
        return Promise.resolve(true);
    }

    /**
     * Get the next available pointer into the buffer. A circular buffer will wrap aroung
     * and being overwriting existing particles. A non-circular buffer will look for the first
     * available opening in the buffer. If none is available, -1 is returned.
     * @returns {number} The next available index in the buffer, or -1 if no free spot is available
     * @private
     */
    get #nextIndex() {
        if (this.isCircular && this.#particleIdx === this.maxParticles - 1)
            this.#particleIdx = 0;    // wrap
        else if (this.isCircular)
            this.#particleIdx++;
        else if (!this.isCircular) {
            // find first free index (could be -1)
            const offsetSize = Constants.PH_BYTES + this.#particleByteSize;
            this.#particleIdx = -1;
            for (let p = 0; p < this.maxParticles - 1; p++) {
                const lifeSpan = this.#memories.getUint16(p * offsetSize);
                if (lifeSpan === Constants.DEAD_PARTICLE) {
                    this.#particleIdx = p;
                    break;
                }
            }
        }

        return this.#particleIdx;
    }

    /**
     * Returns the next opaqueId for particle types
     * @returns {number}
     * @private
     */
    get #nextOpaque() {
        return this.#opaqueId++;
    }

    //-----------------------------------
    // particle engine objects

    /**
     * Add multiple particle types to the engine at once
     * @param  {...BasicParticle} particles - Particle types
     */
    addParticleTypes(...particles) {
        particles.forEach(p => this.addParticleType(p));
    }

    /**
     * Add a new particle type to the particle engine
     * @param {String} name 
     * @param {Particle} particle 
     */
    addParticleType(particle) {
        if (particle.opaqueId === null) {
            // assign a unique id
            particle.opaqueId = this.#nextOpaque;
        }

        this.types.set(particle.opaqueId, particle);
        particle.setUp(this);

        // find the largest particle (by memory size) that will exist
        if (particle.memoryRequirement > this.#particleByteSize) {
            this.#particleByteSize = particle.memoryRequirement;
        }
    }

    /**
     * Get the particle type for the opaqueId
     * @param {number} opaqueId - The particle id
     * @returns {Object} The configuration object for the specified particle type, or undefined if no such type exists
     */
    getParticleType(opaqueId) {
        return this.types.get(opaqueId);
    }

    /**
     * Add multiple particle effects to the engine at once
     * @param  {...ParticleEffect} effects - Particle types
     */
    addEffects(...effects) {
        effects.forEach(e => this.addEffect(e));
    }

    /**
     * Add a particle effect
     * @param particleEffect
     * @return {ParticleEffect} The instance of the effect
     */
    addEffect(particleEffect) {
        if (particleEffect.opaqueId === null) {
            particleEffect.opaqueId = this.#nextOpaque;
        }
        particleEffect.engine = this;
        this.effects.set(particleEffect.opaqueId, particleEffect);
    }

    /**
     * Get a particle effect by opaque Id
     * @param {number} opaqueId - The particle effect
     * @returns {ParticleEffect} The instance of the effect or null if it does not exist.
     */
    getEffect(opaqueId) {
        return this.effects.get(opaqueId);
    }

    /**
     * Convience method to add several `ParticleAffectors` at once to the engine.
     * @param  {ParticleInfluencer} influencer - A list of particle affectors
     */
    addInfluencers(... influencers) {
        influencers.forEach(influencer => this.addInfluencer(influencer));
    }

    /**
     * Add a `ParticleInfluencer` to the engine
     * @param {ParticleInfluencer} influencer - The particle influencer 
     */
    addInfluencer(influencer) {
        this.#particleInfluencers.push(influencer);
        this.#updateCollisionModel(influencer);
    }

    /**
     * Remove a particle influencer from the system.
     * @param {ParticleInfluencer} influencer - The particle influencer
     */
    removeInfluencer(influencer) {
        this.#particleInfluencers.splice(this.#particleInfluencers.indexOf(influencer), 1);
        this.#collisionModel.removeObjectFromModel(influencer);
    }

    /**
     * Locates an influencer by its name and returns it. 
     * @param {String} influencerName - The name of the influencer to find
     * @return {ParticleInfluencer} The affector or null if it does not exist.
     */
    getInfluencer(influencerName) {
        return this.#particleInfluencers.find(repulsor => repulsor.name === influencerName);
    }

    //-------------------------------------
    // particle creation

    /**
     * Add multiple particles into the engine simultaneously.
     * @param {... BasicParticle} particles The set of particles
     */
    addParticles(... particles) {
        this.#newParticles |= particles.length !== 0;
        particles.forEach(particle => this.addParticle(particle));
    }

    /**
     * Add a single particle into the engine.
     * @param particle {BasicParticle} A particle contains `pos` ([x, y]) and `type`
     */
    addParticle(particle) {
        if (!this.enabled) return;
        this.#buffered.push(particle);
    }

    /**
     * Emit particles using an effect, into the particle engine, at a specified world position. 
     * 
     * @param {Array<number>} pos - The [x,y] origin where the effect should emit particles
     * @param {number} opaqueId - The effect to run, effects contain the functionality to generate and modify particles emitted to the engine
     * @param {boolean} isReset - A flag indicating if the effect has been reset (used in ParticleWorkers)
     * @param {number} time - Current world time in milliseconds 
     * @param {number} deltaTime - The time in milliseconds since the last frame
     */
    runEffect([x, y], opaqueId, time, deltaTime) {
        const effect = this.getEffect(opaqueId);
        if (effect) {
            effect.run([x, y], time, deltaTime);
        }
    }

    /**
     * Update an affector in the particle engine. Primarily used when threading.
     * @param {Object} influencer - The `TransferrableConfig` representation of an affector 
     */
    updateInfluencer(influencer) {
        const instance = this.getInfluencer(influencer.$name);
        if (instance != null && influencer.props) {
            if (influencer.props.pos[0] !== instance.pos[0] || influencer.props.pos[1] !== instance.pos[1])
                instance.pos = influencer.props.pos;

            if (influencer.props.radius !== instance.radius)
                instance.radius = influencer.props.radius;

            if (influencer.props.surface[0] !== instance.surface[0] || influencer.props.surface[1] !== instance.surface[1] ||
                influencer.props.surface[2] !== instance.surface[2] || influencer.props.surface[3] !== instance.surface[3])
                instance.surface = influencer.props.surface;

            // update the collision model
            this.#updateCollisionModel(instance);
        }
    }

    /**
     * Add the influencer to the collision model
     * @param {ParticleInfluencer} influencer - The particle influencer to update
     */
    #updateCollisionModel(influencer) {
        // add the repulsor to the collision model in the cell where its centroid is
        this.#collisionModel.updateModel(influencer, influencer.pos[0], influencer.pos[1], true);

        // fill the cells that the repulsor occupies
        const box = influencer.boundingBox;
        for (let x = box[0]; x < box[2]; x += this.#collisionModel.cellSize[0]) {
            for (let y = box[1]; y < box[3]; y += this.#collisionModel.cellSize[1]) {
                const objs = this.#collisionModel.getObjectsAt(x, y);
                if (objs !== null && !objs.includes(influencer))
                    this.#collisionModel.updateModel(influencer, x, y);
            }
        }
    }

    //------------------------------------
    // Particle lifecycle methods

    /**
     * Spawn a particle in the engine. Particles are spawned from particles added
     * to the engine. Adding particles puts them into an insertion queue. Spawing them
     * creates the instance of the particle in the engine.
     * 
     * @param {Array<number>} worldPos - [x,y] world position to spawn the particle 
     * @param {number} time - The current world time in milliseconds
     * @param {Object} particleConfig - Initialized particle data
     * @returns {Spark} The particle's memory segment 
     */
    spawnParticle(worldPos, time, particleType) {
        const idx = this.#nextIndex;
        if (idx !== -1) {
            // making a particle, need to clean up
            this.#cleaningLatch = false;
            
            // The memory offset
            const memOffset = idx * this.#particleByteSize;

            // the particle's instantaneous memory segment
            const memSegment = new Spark(this.#memories.buffer, memOffset, this.#particleByteSize);
            
            // spawn a particle
            particleType.spawn(worldPos, time, memSegment);
            
            this.#liveParticles++;
            return memSegment;
        } else 
            console.info(`Failed to spawn particle: ${particleType.constructor.name} - no available memory`);        

        return null;
    }

    /**
     * Update the particles within the render context, and for the specified time.
     *
     * @param time {Number} The global time within the engine.
     * @param deltaTime {Number} The delta between the world time and the last time the world was updated
     *          in milliseconds.
     */
    update(time, deltaTime) {
        if (!this.enabled) return 0;

        // If there are no new particles in the buffer, and no live particles, don't do anything
        if (this.liveParticles === 0) {
            this.#cleanMemory();
            return 0;
        }

        // run all particles
        this.#start = performance.now();
        let livingParticles = 0;
        for (let p = 0; p < this.maxParticles; p++) {
            const memOffset = p * this.#particleByteSize;
            const memSegment = new Spark(this.#memories.buffer, memOffset, this.#particleByteSize);
            
            const lifeSpan = memSegment.getUint16(Particle.OFFSETS.LF_REMAINING);
            if (lifeSpan > 0) {
                const pType = this.getParticleType(memSegment.getUint8(Particle.OFFSETS.OPAQUE_ID));

                if (pType) {
                    // run the particle
                    this.#runParticle(pType, memSegment, lifeSpan, time, deltaTime);

                    // get the particle's new position
                    const pos = memSegment.getVecF32(Particle.OFFSETS.POSITION);

                    // age particle
                    let remaining = Math.max(0, lifeSpan - deltaTime);
                    if (!this.#inBounds(pos) || remaining === Constants.DEAD_PARTICLE) {
                        this.freeParticle(memSegment);
                        continue;
                    } else {
                        memSegment.setUint16(Particle.OFFSETS.LF_REMAINING, remaining);
                        livingParticles++;
                    }
                }
            }
        }

        this.#liveParticles = livingParticles;
        this.#newParticles = false;

        // debug - update load view
        const overall = performance.now() - this.#start;
        PRAGMA($ParticleEngine, 'showParticleEngineLoad:update', { 
            visible: !this.thread, 
            loadView: this.#engineLoadView,
            overall: overall,
            load: (overall / deltaTime) * 100
        });

        return overall;
    }

    /**
     * Run a single particle.
     * @param {BasicParticle} particleType - The particle type
     * @param {Spark} header - The particle header info
     * @param {Spark} memSegment - The particle's instantaneous memory
     * @param {Float32Array} pos - 2-element array (X & Y)
     * @param {Float32Array} vel - 2-element array (xV & yV)
     * @param {UInt16Array} life - 1-element array containing the lifeSpan remaining
     * @param {number} time - The world time
     * @param {number} deltaTime - delta time in milliseconds since last frame
     */
    #runParticle(particleType, memSegment, life, time, deltaTime) {
        // update the particle
        particleType.update(time, deltaTime, memSegment, life);
        
        // particles with the interaction mask enabled are affected by zones of influence
        if (this.#particleInfluencers.length > 0 && memSegment.getMaskedBitField16(Particle.OFFSETS.FLAGS, Particle.MASK_INTERACTION) === Particle.MASK_INTERACTION) {
            this.#addImpulse(memSegment, time, deltaTime);
        }
    }

    /**
     * Determines if a particle falls outside the viewport of the particle engine.
     * @param {Array<number>} pos - The [x, y] coordinate of the particle
     * @returns {boolean} `true` if the particle is within the viewport of the particle engine
     */
    #inBounds(pos) {
        const limit = this.config.boundaryExpansion; 
        return pos[0] >= 0 - limit && pos[0] <= this.#width + limit && pos[1] >= 0 - limit && pos[1] <= this.#height + limit;
    }

    /**
     * Adds impulse to particles with the interaction flag, calculated from particle repulsors.
     * @param {*} time - Current world time
     * @param {*} deltaTime - Time since last frame
     */
    #addImpulse(memSegment, time, deltaTime) {
        const pos = memSegment.getVecF32(Particle.OFFSETS.POSITION);
        const influenceZones = this.#collisionModel.getObjectsAt(pos[0], pos[1]);
        if (influenceZones !== null)
            influenceZones.forEach(affector => {
                affector.applyImpulse(memSegment, time, deltaTime);
            });
    }

    /**
     * Render all of the active particles to the render context
     * @param {number} time - The current world time 
     * @param {number} deltaTime - The time since the last frame
     * @param {Path2D} occlusionMask - Optional mask to clip areas that are occluded by objects
     */
    async renderParticles(time, deltaTime, occlusionMask = null, directSurface = null) {
        if (!this.enabled || this.liveParticles === 0) return -1;

        const render = performance.now();

        let surf = directSurface || this.#surface;

        for (let p = 0; p < this.maxParticles; p++) {
            const memOffset = p * this.#particleByteSize;
            const memSegment = new Spark(this.#memories.buffer, memOffset, this.#particleByteSize);
            
            const lifeSpan = memSegment.getUint16(Particle.OFFSETS.LF_REMAINING);
            if (lifeSpan > Constants.DEAD_PARTICLE) {
                const pType = this.getParticleType(memSegment.getUint8(Particle.OFFSETS.OPAQUE_ID));
                
                // render the particle
                if (pType) {
                    pType.render(time, deltaTime, memSegment, lifeSpan, 'canvas', surf); 
                }
            }
        }

        const renderTime = performance.now() - render;
        
        // debug - update load
        PRAGMA($ParticleEngine, 'showParticleEngineLoad:render', { 
            visible: !this.thread, 
            loadView: this.#engineLoadView,
            renderTime: renderTime, 
            deltaTime: deltaTime, 
            liveParticles: this.liveParticles
        });

        // debug - render zones of influence
        PRAGMA($ParticleEngine, 'showParticleInfluenceZones', {
            influencers: this.influencers,
            surface: surf
        });

        return renderTime;
    }

    /**
     * Frees (zeros) the memory of a particle. Effectively making it dead.
     * @param {Spark} memSegment - the particle's memory segment
     */
    freeParticle(memSegment) {
        for (let i = 0; i < this.#particleByteSize; i++) {
            memSegment.setUint8(i, 0);
        }
    }

    //-----------------------------------------
    // Engine control

    reset() {
        //this.#memories.fill(null);
        this.#liveParticles = 0;
        this.#newParticles = false;
    }

    shutdown() {
        this.reset();
        this.#particleEffects.clear();
        this.#particleTypes.clear();
        this.#particleInfluencers.clear();
    }

    #cleanMemory() {
        if (!this.#cleaningLatch) {
            if (this.#memories) {
                const memBuf = new Uint8Array(this.#memories.buffer);
                memBuf.fill(0);
            }
            this.#particleIdx = 0;
            this.#cleaningLatch = true;
        }
    }

    /**
     * Returns a set of stats for the Particle Engine to display in the
     * state bar at the top of the DevTools debugger.
     * @returns {Object<String, *>} Snapshot stats for the DevTools debugger
     */
    snapshotStats() {
        return {
            "Live Particles": this.#liveParticles
        }
    }
}

await PRAGMA_INIT($ParticleEngine); // required for pragma debugging
