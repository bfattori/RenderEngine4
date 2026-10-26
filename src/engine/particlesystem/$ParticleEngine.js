import Constants from '../Constants.js';
import RenderEngineError from '../core/RenderEngineError.js';
import Engine from '../core/Engine.js';
import Context from '../Context.js';
import LoadCounter from '../ui/debug/LoadCounter.js';

import { ParticleEngineConfig, ParticleEngineThreadingConfig } from './ParticleEngine.js';
import PhysicalParticle from '../particlesystem/types/PhysicalParticle.js';
import ParticleAffector from '../particlesystem/physics/ParticleAffector.js';

import $Math from '../core/Math.js';

import { canvasDebugObjects } from '../ui/debug/DebugObjects.js';

import Spark, { MemShape } from '../core/Spark.js';

const ctx = Context.getInstance();

export default class $ParticleEngine {
    static #instance = null;
    static #useBuilder = true;
    
    #config = null;
    #threading = null;

    // a list of opaque Ids to particle types
    #opaqueId = 1;
    #opaqueMap = new Map();

    // particle types the engine is configured to render
    #particleTypes = new Map();

    // particle effects the engine is configured to run
    #particleEffects = new Map();

    // particle affectors that impact PhysicalParticles
    #particleAffectors = [];

    // when new particles are added, this goes true
    #newParticles = false;

    // these are the arrays of particle "memories", positions, velocities, and lifespans.  
    // the particle engine only has access to this information during the lifecycle stages
    #memories = null;
    #pPos = null;
    #pVel = null;
    #pSpan = null;
    
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

    #particleMemSize = 0;
    #particleHeader = null;

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

        PRAGMA('showParticleEngineLoad', () => {
            if (!threading) {
                const config = {
                    left: 5,
                    counters: ['Update:Load', 'Update:Time', 'Render:Load', 'Render:Time', 'Particles'],
                    options: {
                        'Update:Time': { suffix: ' ms' },
                        'Render:Time': { suffix: ' ms' },
                        'Update:Load': { bar: true, suffix: '%', clamp: 100.0 },
                        'Render:Load': { bar: true, suffix: '%', clamp: 100.0 },
                        'Particles': {}
                    }
                }
                this.#engineLoadView = new LoadCounter("Particle Engine Load", config);
            }
        });

        this.#config = new ParticleEngineConfig();
        this.#config.merge(config);
        if (threading) {
            this.#threading = new ParticleEngineThreadingConfig();
            this.#threading.merge(threading);
        }

        this.#width = width;
        this.#height = height;

        if (renderContext !== null) {
            // the workers will assign their cache
            this.#assembler = renderContext.renderer.assembler;
        }

        // the rendering context for the particle engine
        this.#offscreen = new OffscreenCanvas(width, height);
        this.#surface = this.#offscreen.getContext('2d');

        // the particle header
        this.genParticleHeader();
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

    /**
     * The particle effects available to the engine
     * @returns {Map<string, ParticleEffect>} A map of particle effects to their corresponding ParticleEffect objects.
     */
    get effects() {
        return this.#particleEffects;
    }

    /**
     * The collection of particle affectors in the engine
     * @returns {Map<String, Array<ParticleAffector>>} A map of particle affectors by type.
     */
    get affectors() {
        return this.#particleAffectors;
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

        this.#pPos = new Float32Array(count * 2);   // two 32-bit floats (x & y)
        this.#pVel = new Float32Array(count * 2);   // two 32-bit floats (xV & yV)

        // Particle memory req: headerSize + maxParticleSize
        const memoryHeap = new ArrayBuffer(count * (Constants.PH_BYTES + this.#particleMemSize));
        this.#memories = new Spark(memoryHeap);
        return Promise.resolve(true);
    }

    /**
     * Snapshot of the current state of the live particles in the engine.
     * @returns {Object} The state of particles: `pos`(itions), `vel`(ocities), `mem`(ories), and `life`-spans remaining.
     */
    get state() {
        const p = [], l = [], v = [], m = [];
        return {
            pos: p,
            vel: v,
            mem: m,
            life: l
        };
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
            const offsetSize = Constants.PH_BYTES + this.#particleMemSize;
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

        // find the largest particle (by memory size) that will exist
        if (particle.sizeBytes > this.#particleMemSize) {
            this.#particleMemSize = particle.sizeBytes;
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
        particleEffect.engine = this;
        this.effects.set(particleEffect.$name, particleEffect);
    }

    /**
     * Get a particle effect by name
     * @param {String} name - The particle effect name
     * @returns {ParticleEffect} The instance of the effect or null if it does not exist.
     */
    getEffect(name) {
        return this.effects.get(name);
    }

    /**
     * Convience method to add several `ParticleAffectors` at once to the engine.
     * @param  {ParticleAffector} affectors - A list of particle affectors
     */
    addAffectors(... affectors) {
        affectors.forEach(affector => this.addAffector(affector));
    }

    /**
     * Add a `ParticleAffector` to the engine to influence `PhysicalParticles`
     * @param {ParticleAffector} affector - The particle affector 
     */
    addAffector(affector) {
        this.#particleAffectors.push(affector);
    }

    /**
     * Locates an affector by its name and returns it. 
     * @param {String} affectorName - The name of the affector to find
     * @return {ParticleAffector} The affector or null if it does not exist.
     */
    getAffector(affectorName) {
        return this.#particleAffectors.find(affector => affector.name === affectorName);
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

    //------------------------------------------------------------
    // basic particle shape

    /**
     * The shape of a particle header containing:
     * - lifeByte (1 byte)  : Particle alive (1) or dead (0)
     * - opaqueId (1 byte)  : Particle type's opaque Id in the engine
     * - spawnTime (8 bytes): World time at spawn
     * - lifeSpan (2 bytes) : The initial lifespan of the particle
     * - **Total:** 12 bytes
     * 
     * @returns {MemShape} The particle header's memory shape
     */
    genParticleHeader() {
        if (this.#particleHeader === null) {
            this.#particleHeader = new MemShape();
            this.#particleHeader.set('lifeByte',   'UInt8');
            this.#particleHeader.set('opaqueId',   'UInt8');
            this.#particleHeader.set('spawnTime',  'UInt64');
            this.#particleHeader.set('lifeSpan',   'UInt16');
            this.#particleHeader.build();
        }

        return this.#particleHeader;
    }   

    /**
     * Spawn a particle in the engine. Particles are spawned from particles added
     * to the engine. Adding particles puts them into an insertion queue. Spawing them
     * creates the instance of the particle in the engine.
     * @param {Array<number>} worldPos - [x,y] world position to spawn the particle 
     * @param {number} time - The current world time in milliseconds
     * @param {Object} particleConfig - Initialized particle data 
     */
    spawnParticle(worldPos, time, particleType) {
        const idx = this.#nextIndex;
        if (idx !== -1) {
            // making a particle, need to clean up
            this.#cleaningLatch = false;

            // position and velocity
            this.#pPos[idx * 2] = worldPos[0]; 
            this.#pPos[(idx * 2) + 1] = worldPos[1];
            this.#pVel[idx * 2] = 0.0;
            this.#pVel[(idx * 2) + 1] = 0.0;
            
            // The header offset
            const memOffset = idx * (this.#particleMemSize + Constants.PH_BYTES);

            // set the header segment
            const header = new Spark(this.#memories.buffer, memOffset, Constants.PH_BYTES);
            header.setUint8(Constants.OFFS_OPAQUE_ID, particleType.opaqueId);
            header.setBigUint64(Constants.OFFS_SPAWN_TIME, BigInt(Math.floor(time)));

            // the particle's instantaneous memory segment
            const memSegment = new Spark(this.#memories.buffer, memOffset + Constants.PH_BYTES, this.#particleMemSize);
            
            // spawn a particle
            particleType.spawn(time, particleType.opts, header, memSegment);
            
            // pvOffs is short for "position & velocity offsets"
            // (idx * 2 elements) * 4 bytes each
            const pvOffs = (idx * 2) * 4;

            // store the generated position, velocity, and memory segment values.
            // would be good to use other arrays to pass these values instead of
            // creating a variable object in memory
            const spawned = {
                pos: new Float32Array(this.#pPos.buffer, pvOffs, 2),
                vel: new Float32Array(this.#pVel.buffer, pvOffs, 2),
                header: header,
                memSegment: memSegment
            };

            this.#liveParticles++;
            return spawned;
        } else if (ctx.debug)
            console.warn(`Failed to spawn particle: ${particleType.constructor.name} - no available memory`);        

        return null;
    }

    /**
     * Emit particles using an effect, into the particle engine, at a specified world position. 
     * 
     * @param {Array<number>} param0 - The [x,y] world coordinates where the effect should emit particles
     * @param {String} effectName - The name of the effect to run, effects contain the functionality to generate and modify particles emitted to the engine
     * @param {boolean} isReset - A flag indicating if the effect has been reset (used in ParticleWorkers)
     * @param {number} time - Current world time in milliseconds 
     * @param {number} deltaTime - The time in milliseconds since the last frame
     */
    runEffect([x, y], effectName, isReset, time, deltaTime) {
        //console.debug(x, y, effectName);
        const effect = this.getEffect(effectName);
        if (effect) {
            //if (isReset) effect.reset();
            effect.run([x, y], time, deltaTime);
        }
    }

    /**
     * Update an affector in the particle engine. Primarily used when threading.
     * @param {Object} affector - The `TransferrableConfig` representation of an affector 
     */
    updateAffector(affector) {
        const instance = this.getAffector(affector.$name);
        if (instance != null && affector.props) {
            instance.pos = affector.props.pos;
        }
    }

    //------------------------------------
    // Lifecycle methods

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

        this.#start = PERF('particlesUpdateStart');

        // run all particles
        let livingParticles = 0;
        for (let p = 0; p < this.maxParticles; p++) {
            const memOffset = p * (this.#particleMemSize + Constants.PH_BYTES);
            const header = new Spark(this.#memories.buffer, memOffset, Constants.PH_BYTES);
            
            const lifeSpan = header.getUint16(Constants.OFFS_LIFESPAN_REMAINING);
            if (lifeSpan > 0) {
                const pvOffs = (p * 2) * 4; // Float32Array.BYTES_PER_ELEMENT;
                const pos = new Float32Array(this.#pPos.buffer, pvOffs, 2);
                const vel = new Float32Array(this.#pVel.buffer, pvOffs, 2);

                const pType = this.getParticleType(header.getUint8(Constants.OFFS_OPAQUE_ID));
                const memSegment = new Spark(this.#memories.buffer, memOffset + Constants.PH_BYTES, this.#particleMemSize);

                // run the particle
                this.#runParticle(pType, header, memSegment, pos, vel, lifeSpan, time, deltaTime);

                // age particle
                const remaining = Math.max(0, lifeSpan - Math.floor(deltaTime));
                header.setUint16(Constants.OFFS_LIFESPAN_REMAINING, remaining <= 0 ? Constants.DEAD_PARTICLE : remaining);

                // free-up space when dead
                // ... or when no longer in the visible area
                if (!this.#inBounds(pos) || remaining === Constants.DEAD_PARTICLE) {
                    pType.cleanUp(header, memSegment);
                } else {
                    livingParticles++;
                }
            }
        }

        this.#liveParticles = livingParticles;
        this.#newParticles = false;
        PERF('particlesUpdateEnd');
        MEASURE('Update Particles', 'particlesUpdateStart', 'particlesUpdateEnd');

        const overall = performance.now() - this.#start;
        PRAGMA('showParticleEngineLoad', () => {
            if (!this.thread) {
                this.#engineLoadView.update('Update:Load', (overall / deltaTime) * 100);
                this.#engineLoadView.update('Update:Time', overall);
            }
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
    #runParticle(particleType, header, memSegment, pos, vel, life, time, deltaTime) {
        // update the particle
        particleType.update(time, deltaTime, header, memSegment, pos, vel, life);
        
        // only physical particles are affected by repulsors and colliders
        if (particleType instanceof PhysicalParticle) {
            this.#addImpulse(pos, vel, time, deltaTime);
        }
    }

    #inBounds(pos) {
        const limit = this.config.boundaryExpansion; 
        return pos[0] >= 0 - limit && pos[0] <= this.#width + limit && pos[1] >= 0 - limit && pos[1] <= this.#height + limit;
    }

    /**
     * Adds impulse to physical particles based on particle affectors.
     * @param {*} time - Current world time
     * @param {*} deltaTime - Time since last frame
     */
    #addImpulse(pos, vel, time, deltaTime) {
        this.affectors.forEach(affector => {
            affector.affect(pos, vel, time, deltaTime);
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

        const render = PERF('particlesRenderStart');

        let surf = directSurface || this.#surface;

        for (let p = 0; p < this.maxParticles; p++) {
            const memOffset = p * (this.#particleMemSize + Constants.PH_BYTES);
            const header = new Spark(this.#memories.buffer, memOffset, Constants.PH_BYTES);
            
            const lifeSpan = header.getUint16(Constants.OFFS_LIFESPAN_REMAINING);
            if (lifeSpan > Constants.DEAD_PARTICLE) {
                const pType = this.getParticleType(header.getUInt8(Constants.OFFS_OPAQUE_ID));
                const memSegment = new Spark(this.#memories.buffer, memOffset + Constants.PH_BYTES, this.#particleMemSize);
                
                // position & velocity offset
                const pvOffs = (p * 2) * 4;
                const pos = new Float32Array(this.#pPos.buffer, pvOffs, 2);

                // render the particle
                pType.render(time, deltaTime, header, memSegment, pos, lifeSpan, 'canvas', surf); 
            }
        }

        const renderTime = performance.now() - render;
        PERF('particlesRenderEnd');
        MEASURE('Render Particles', 'particlesRenderStart', 'particlesRenderEnd');
        PRAGMA('showParticleEngineLoad', () => {
            if (!this.thread) {
                // using the last frame time, what
                // is the overall load of the PE on the CPU?
                this.#engineLoadView.update('Render:Load', (renderTime / deltaTime) * 100);
                this.#engineLoadView.update('Render:Time', renderTime);
                this.#engineLoadView.update('Particles', this.liveParticles);
            }
        });

        PRAGMA('showParticleAffectors', () => {
            const affectors = this.affectors;
            affectors.forEach(affector => {
                canvasDebugObjects.BoundingCircle(surf, affector.pos[0], affector.pos[1], affector.radius);
                canvasDebugObjects.Origin(surf, affector.pos[0], affector.pos[1], `${affector.pos[0]}, ${affector.pos[1]} (r${affector.radius})\nf ${affector.friction}\nr ${affector.restitution}`);
            });
        });

        return renderTime;
    }

    reset() {
        //this.#memories.fill(null);
        this.#liveParticles = 0;
        this.#newParticles = false;
    }

    shutdown() {
        this.reset();
        this.#particleEffects.clear();
        this.#particleTypes.clear();
    }

    /**
     * Get the properties object for the particle engine
     * @return {Object}
     */
    get properties() {
        return {
            liveParticles: this.liveParticles,
            ParticleEffects: this.particleEffects,

            _pointer: this.#particleIdx,
            _particleMemories: this.#memories,
            _particlePositions: this.#pPos,
            _particleVelocities: this.#pVel,
        }
    }

    #cleanMemory() {
        if (!this.#cleaningLatch) {
            const memBuf = new Uint8Array(this.#memories.buffer);
            memBuf.fill(0);
            this.#particleIdx = 0;
            this.#cleaningLatch = true;
        }
    }
}