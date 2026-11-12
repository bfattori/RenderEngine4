import Context from '../../Context.js';

import { Logger } from '../../core/lang/Console.js';
import OrchestratorError from './OrchestratorError.js';
import protocol from './Protocol.js';

const ctx = Context.getInstance();

let log;

/**
 * @class ParticleManager
 * @classdesc Manages the particles in a 2D canvas. This class handles the creation, update, and rendering of particles.
 * It also manages the particle engine configuration and threading options. The ParticleManager presents an interface identical
 * to the ParticleEngine, but is designed to pass execution to separate threads. The ParticleManager spawns the Orchestrator thread, 
 * which in turn spawns the ParticleWorker threads. The Orchestrator is responsible for distributing particles to the workers, and the 
 * workers are responsible for updating and rendering the particles.
 * 
 * @param {RenderContext} renderContext - The rendering context for the particle manager.
 * @param {number} width - The width of the canvas.
 * @param {number} height - The height of the canvas.
 * @param {ParticleEngineConfig} config - The configuration for the particle engine.
 * @param {ParticleEngineThreadingConfig} threading - The threading configuration for the particle manager.
 * @param {object} opts - Engine configuration options used by the particle manager.
 * @param {Paths} paths - Paths object containing various paths used by the particle manager.
 */
export default class ParticleManager {
    #thread = null;
    #ready = false;
    #bitmap = null;
    #readyToProcess = false;
    #workerViews = [];
    #engineLoadView = null;
    #initialized = false;

    #initProps = null;
    #assembler = null;

    #opaqueId = 0;
    #liveParticles = 0;

    #vroom = null;

    constructor(renderContext, width, height, config, threading, opts, paths) {
        log = new Logger(ParticleManager, null, true);
        this.#initProps = {
            width: width,
            height: height,
            config: config,
            threading: threading,
            opts: opts,
            paths: paths
        };
        this.#assembler = renderContext.renderer.assembler;
    }

    get props() {
        return this.#initProps;
    }

    /**
     * Get the {@link Orchestrator} thread
     * @returns {Worker}
     */
    get thread() {
        return this.#thread;
    }

    get assembler() {
        return this.#assembler;
    }

    get isInitialized() {
        return this.#initialized;
    }

    set initialized(value) {
        this.#initialized = value;
    }

    /**
     * Returns `true` when the Orchestrator is ready to process requests
     */
    get isStarted() {
        return this.#readyToProcess;
    }

    set callWhenReady(cb) {
        this.#vroom = cb;
    }

    /**
     * Returns true when the bitmap has been rendered by the thread.
     * @returns {boolean}
     */
    get ready() {
        return this.#ready;
    }

    /**
     * Returns the bitmap of the rendered particles. This is updated by the thread, meaning that 
     * until `ready` is `true` this represents the last state of the particles. If lag occurs between
     * the processing and rendering of particles, the bitmap may be out of date. The bitmap is only 
     * updated when the thread has finished rendering the particles.
     * @returns {ImageBitmap}
     */
    get bitmap() {
        return this.#bitmap;
    }

    /**
     * Set the bitmap received from the Orchestrator
     */
    set bitmap(bitmap) {
        this.#bitmap = bitmap;
    }

    get liveParticles() {
        return this.#liveParticles;
    }
    
    async initialize() {
        return new Promise((resolve) => {
            // wait until the workers have all started
            const $this = this;
            const waitFn = () => {
                if ($this.isStarted) {
                    this.#send({ 
                        type: protocol.MTYPE.ORCHESTRATOR.GENESIS
                    });

                    this.initialized = true;
                    log.debug(`all workers ready, initialized`);
                    resolve(true);
                } else {
                    // wait for the orchestrator to be ready
                    setTimeout(waitFn, 500);
                }
            }
            waitFn();
        });
    }

    /**
     * Set up the message handler for receiving messages from the orchestrator.
     */
    async start() {
        this.#workerViews = PRAGMA(ParticleManager, 'showParticleWorkersPiP', {
            showLoad: this.#initProps.opts.debugOpts.showParticleEngineLoad,
            workerCount: this.#initProps.threading.workers
        });

        this.#engineLoadView = PRAGMA(ParticleManager, 'showParticleEngineLoad', { 
            workerCount: this.#initProps.threading.workers, 
            maxParticles: this.#initProps.config.maxParticles 
        });

        log.debug('starting particle orchestrator');
        
        // load the particle engine orchestrator thread
        await this.#createOrchestrator();       
    }

    reset() {
        this.#thread.postMessage({ re4: protocol.MSG.MANAGER, type: protocol.MTYPE.MANAGER.RESET })
    }

    /**
     * Terminate the thread. This will stop the particle engine and free up resources.
     */
    shutdown() {
        this.#thread.postMessage({ re4: protocol.MSG.PARTICLE_MANAGER, type: protocol.MSG.MANAGER.SHUTDOWN });
    }

    async #createOrchestrator() {
        this.#thread = new Worker(new URL(`./Orchestrator.js${ctx.preventThreadCache}`, import.meta.url), {
            name: `${this.#initProps.threading.name}_orchestrator`,
            type: 'module'
        });

        // setup event handlers
        this.#thread.onmessage = (event) => {
            this.#orchestratorInbound(event);     
        }

        this.#thread.onerror = (event) => {
            this.#orchestratorError(event);
        }

        const $this = this;
        return new Promise(resolve => {
            console.log('Waiting for orchestrator to be ready...')
            setTimeout(() => {
                // initialize the orchestator and wait for it to be ready
                $this.thread.postMessage({ 
                    re4: protocol.MSG.MANAGER, 
                    type: protocol.MTYPE.MANAGER.INIT,
                    assembler: $this.assembler.constructor.name,
                    width: $this.props.width, 
                    height: $this.props.height, 
                    config: $this.props.config, 
                    threading: $this.props.threading, 
                    systemOpts: $this.props.opts,
                    paths: $this.props.paths  
                });
                $this.callWhenReady = resolve;
            }, 1000);
        });
    }

    #orchestratorInbound(event) {
        if (event.data.re4 === protocol.MSG.ORCHESTRATOR) {
            switch(event.data.type) {
                case protocol.MTYPE.ORCHESTRATOR.READY:
                    this.#readyToProcess = true;
                    break;
                case protocol.MTYPE.ORCHESTRATOR.WORKERS_READY:
                    this.#vroom();
                    break;
                case protocol.MTYPE.ORCHESTRATOR.RENDERED:
                    this.bitmap = event.data.image;
                    this.#ready = true;

                    // sum up the live particles
                    let total = 0;
                    this.#liveParticles = event.data.metrics.reduce((acc, workerMetric) => acc += workerMetric.live, total);

                    PRAGMA(ParticleManager, 'showParticleEngineLoad:update', {
                        burden: (this.#initProps.config.maxParticles / this.#initProps.threading.workers),
                        event: event,
                        loadView: this.#engineLoadView,
                        workerCount: this.#initProps.threading.workers,
                        liveParticles: this.#liveParticles
                    });

                    break;
                case protocol.MTYPE.ORCHESTRATOR.WORKER_RENDERED:
                    PRAGMA(ParticleManager, 'showParticleWorkersPiP:workerRender', {
                        workerView: this.#workerViews[event.data.workerId], 
                        image: event.data.image
                    });
                    break;
                case protocol.MTYPE.ORCHESTRATOR.TERMINATED:
                    this.#thread.terminate();
                    this.#thread = null;
                    log.debug('Orchestrator reports terminated');
                    break;
                default:
                    log.error('Unknown message type from orchestrator:', event.data);
            }
        }
    }

    #orchestratorError(event) {
        log.error(event.message, event);
        throw new OrchestratorError(this.#thread, event.message, event);
    }

    /**
     * Send a message to the orchestrator thread
     * @param {Object} data - Data to send to the thread 
     * @param {Array<Object>} transfer - Optional array of objects to transfer ownership of to the thread 
     */
    #send(data, transfer) {
        this.#thread.postMessage({ 
            re4: protocol.MSG.MANAGER, 
            ... data }, transfer);
    }

    /**
     * Called when the bitmap is returned from the thread for rendering.
     */
    #notReady() {
        this.#ready = false;
    }

    /**
     * Returns the next opaqueId for particle types
     * @returns {number}
     * @private
     */
    get #nextOpaque() {
        return this.#opaqueId++;
    }

    /**
     * Add multiple particle types to the engine at once
     * @param  {...BasicParticle} particles - Particle types
     */
    addParticleTypes(...particles) {
        particles.forEach(p => this.addParticleType(p));
    }

    /**
     * Add a new particle type to the particle engine
     * @param {Particle} particle 
     */
    addParticleType(particle) {
        // assign a unique id
        particle.opaqueId = this.#nextOpaque;

        this.#send({ 
            type: protocol.MTYPE.MANAGER.ADD_TYPE, 
            particle: particle.transferrable 
        });
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
        // assign a unique id
        particleEffect.opaqueId = this.#nextOpaque;

        this.#send({ 
            type: protocol.MTYPE.MANAGER.ADD_EFFECT, 
            effect: particleEffect.transferrable 
        });
    }

    /**
     * Convience method to add several `ParticleInfluencer`s at once to the engine.
     * @param  {ParticleInfluencer} influencers - A list of particle influencer
     */
    addInfluencers(... influencers) {
        influencers.forEach(influencer => this.addInfluencer(influencer));
    }

    /**
     * Add a `ParticleInfluencer` to the engine
     * @param {ParticleInfluencer} influencer - The particle influencer 
     */
    addInfluencer(influencer) {
        this.#send({ 
            type: protocol.MTYPE.MANAGER.ADD_ZONE, 
            affector: influencer.transferrable 
        });
    }

    /**
     * Add a set of particles at once
     * @param {Array<Object>} particles - The set of particles to add, an array of objects containing `type`, and `pos` ([x, y] world position)
     */
    addParticles(particles) {
        this.#send({ 
            type: protocol.MTYPE.MANAGER.ADD_PARTICLES, 
            particles: particles
        });
    }

    /**
     * Add a single particle to the engine
     * @param {Object} particle - contains `type`, and `pos` ([x, y] world position)
     */
    addParticle(particle) {
        this.#send({ 
            type: protocol.MTYPE.MANAGER.ADD_PARTICLES, 
            particles: [particle]
        });
    }

    /**
     * Emit particles using an effect, into the particle engine at the given poisition.
     * 
     * @param {Array<number>} worldPos - The [x,y] world coordinates where the effect should emit particles
     * @param {number} opaqueId - The effect to run, effects contain the functionality to generate and modify particles emitted to the engine
     * @param {number} time - Current world time in milliseconds 
     * @param {number} deltaTime - The time in milliseconds since the last frame
     */
    runEffect([x, y], opaqueId, time, deltaTime) {
        this.#send({ 
            type: protocol.MTYPE.MANAGER.RUN_EFFECT, 
            pos: [x, y],
            opaqueId: opaqueId, 
            time: time, 
            deltaTime: deltaTime
        });
    }

    /**
     * Updates a `ParticleRepulsor` in the engine.
     * @param {ParticleInfluencer} influencer - The particle influencer to update. It must have been added to the engine previously. 
     */
    updateInfluencer(influencer) {
        this.#send({
            type: protocol.MTYPE.MANAGER.UPDATE_ZONE,
            affector: influencer.transferrable
        });
    }

    /**
     * Removes a `ParticleInfluencer` from the engine.
     * @param {ParticleInfluencer} influencer - The particle influencer to remove.
     */
    removeInfluencer(influencer) {
        this.#send({
            type: protocol.MTYPE.MANAGER.REMOVE_ZONE,
            affector: influencer.transferrable
        })
    }

    /**
     * Spawn a single particle into the particle engine at the given position. The particle type dictates the behavior of the particle, including 
     * how it is rendered, how it moves, and how it is updated over time.
     * @param {Array<number>} worldPos - [x,y] world position to spawn the particle 
     * @param {String} particleType - the type of particle to spawn 
     */
    spawnParticle(worldPos, particleType) {
        this.#send({
            type: protocol.MTYPE.MANAGER.SPAWN, 
            pos: worldPos, 
            particle: particleType 
        });
    }

    /**
     * Update the particles
     * @param time {Number} The global time within the engine.
     * @param deltaTime {Number} The delta between the world time and the last time the world was updated
     *          in milliseconds.
     */
    update(time, deltaTime) { // no-op 
    }

    /**
     * Render all of the active particles to the frame buffer
     * @param {number} time - The current world time 
     * @param {number} deltaTime - The time since the last frame
     * @param {Path2D} occlusionMask - Optional mask to clip areas that are occluded by objects
     */
    renderParticles(time, deltaTime, occlusionMask = null) { // no-op 
    }

    /**
     * Returns a set of stats for the "Particle Engine" to display in the
     * state bar at the top of the DevTools debugger.
     * @returns {Object<String, *>} Snapshot stats for the DevTools debugger
     */
    snapshotStats() {
        return {
            "Live Particles": this.#liveParticles
        }
    }
}

await PRAGMA_INIT(ParticleManager); // required for PRAGMA debugging
