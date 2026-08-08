import Constants from '../../Constants.js';
import Context from '../../Context.js';
import Engine from '../../core/Engine.js';
import CanvasPIP from '../../ui/debug/CanvasPIP.js';
import LoadCounter from '../../ui/debug/LoadCounter.js';

import OrchestratorError from './OrchestratorError.js';

const ctx = Context.getInstance();


export default class $ParticleEngine {
    #thread = null;
    #ready = false;
    #bitmap = null;
    #metrics = {};
    #readyToProcess = false;
    #debugView = null;
    #workerViews = [];
    #engineLoadView = null;
    #particleTypes = new Map();

    #initProps = null;

    constructor(width, height, config, threading, opts) {
        this.#initProps = {
            width: width,
            height: height,
            config: config,
            threading: threading,
            opts: opts
        };
    }

    /**
     * Get the {@link Orchestrator} thread
     * @returns {Worker}
     */
    get thread() {
        return this.#thread;
    }

    /**
     * Returns `true` when the Orchestrator is ready to process requests
     */
    get isStarted() {
        return this.#readyToProcess;
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

    /**
     * Set up the message handler for receiving messages from the orchestrator.
     */
    async start() {
        PRAGMA('showParticleWorkersPiP', () => {
            let top = 10;
            if (this.#initProps.opts.debugOpts.showParticleEngineLoad)
                top = 120;

            for (let i = 0; i < this.#initProps.threading.workers; i++)
                this.#workerViews[i] = new CanvasPIP(`worker`, top + (i * 160));
        });

        PRAGMA('showParticleEngineLoad', () => {
            const config = {
                left: 5,
                counters: ['Update:Load', 'Update:Time', 'Render:Load', 'Render:Time'],
                options: {
                    'Update:Time': { suffix: ' ms' },
                    'Render:Time': { suffix: ' ms' },
                    'Update:Load': { bar: true, suffix: '%' },
                    'Render:Load': { bar: true, suffix: '%' }
                }
            };

            for (let i = 0; i < this.#initProps.threading.workers; i++) {
                config.counters.push(`Workers:Thread ${i}`);
                config.options[`Workers:Thread ${i}`] = { bar: true, suffix: '%' }
                config.counters.push(`Particles:Thread ${i}`);
                config.options[`Particles:Thread ${i}`] = { bar: false }
            }
            this.#engineLoadView = new LoadCounter("Particle Engine Load", config);
        });

        return new Promise((resolve) => {
            console.debug('Loading particle orchestrator');
            
            // load the particle engine orchestrator thread
            this.#createOrchestrator();       

            // initialize the orchestator and wait for it to be ready
            this.#thread.postMessage({ 
                re4: Constants.PARTICLE_MANAGER_MSG, 
                type: Constants.MSG_INIT, 
                width: this.#initProps.width, 
                height: this.#initProps.height, 
                config: this.#initProps.config, 
                threading: this.#initProps.threading, 
                systemOpts: this.#initProps.opts  
            });
            
            // wait until the workers have all started
            const $this = this;
            const waitFn = () => {
                if ($this.isStarted) {
                    console.debug(`Particle orchestrator started with ${this.#initProps.threading.workers} workers`);
                    resolve(true);
                } else {
                    // wait for the orchestrator to be ready
                    setTimeout(waitFn, 500);
                }
            }
            waitFn();
        });
    }

    reset() {
        this.#thread.postMessage({ re4: Constants.PARTICLE_MANAGER_MSG, type: Constants.MSG_RESET })
    }

    /**
     * Terminate the thread. This will stop the particle engine and free up resources.
     */
    shutdown() {
        this.#thread.postMessage({ re4: Constants.PARTICLE_MANAGER_MSG, type: Constants.MSG_SHUTDOWN });
    }

    #createOrchestrator() {
        this.#thread = new Worker(new URL(`./Orchestrator.js${ctx.preventThreadCache()}`, import.meta.url), {
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
    }

    #orchestratorInbound(event) {
        if (event.data.re4 === Constants.ORCHESTRATOR_MSG) {
            switch(event.data.type) {
                case Constants.MSG_READY:
                    this.#readyToProcess = true;
                    break;
                case Constants.MSG_RENDERED:
                    this.bitmap = event.data.image;
                    this.#ready = true;

                    PRAGMA('showParticleEngineLoad', () => {
                        let update = 0, render = 0;
                        const burden = (this.#initProps.config.maxParticles / this.#initProps.threading.workers);
                        for (let i = 0; i < event.data.metrics.length; i++) {
                            if (event.data.metrics[i]) {
                                update += event.data.metrics[i].updateTime || 0;
                                render += event.data.metrics[i].renderTime || 0;

                                const live = event.data.metrics[i].live;
                                this.#engineLoadView.update(`Workers:Thread ${i}`, (live !== 0 ? live / burden : 0) * 100);
                                this.#engineLoadView.update(`Particles:Thread ${i}`, live);
                            }
                        }

                        const updateLoad = update / event.data.deltaTime;
                        const renderLoad = render / event.data.deltaTime;

                        this.#engineLoadView.update('Update:Time', update);
                        this.#engineLoadView.update('Render:Time', render);
                        this.#engineLoadView.update('Update:Load', isNaN(updateLoad) ? 0 : Math.min(updateLoad * 100, 100));
                        this.#engineLoadView.update('Render:Load', isNaN(renderLoad) ? 0 : Math.min(renderLoad * 100, 100));
                    });

                    break;
                case Constants.MSG_WORKER_RENDERED:
                    PRAGMA('showParticleWorkersPiP:workerRender', () => {
                        this.#workerViews[event.data.workerId].update(event.data.image);
                    })
                    break;
                case Constants.MSG_TERMINATED:
                    this.#thread.terminate();
                    this.#thread = null;
                    console.debug('Orchestrator thread terminated');
                    break;
                default:
                    console.error('[Particle Manager] Unknown message type:', event.data.type);
            }
        }
    }

    #orchestratorError(event) {
        console.error(event.message, event);
        //throw new OrchestratorError(this.#thread, event.message, event);
    }

    /**
     * Send a message to the orchestrator thread
     * @param {Object} data - Data to send to the thread 
     * @param {Array<Object>} transfer - Optional array of objects to transfer ownership of to the thread 
     */
    #send(data, transfer) {
        if (this.isStarted)
            this.#thread.postMessage({ 
                re4: Constants.PARTICLE_MANAGER_MSG, 
                ... data }, transfer);
    }

    /**
     * Called when the bitmap is returned from the thread for rendering.
     */
    #notReady() {
        this.#ready = false;
    }

    /**
     * Get a primitive representation of a complex object that can be sent to the thread.
     * The thread will reconstruct the object from this representation.
     * @param {String} name - The name of the object type of the transferrable object
     * @param {Object} obj - The object to get the transferrable representation of
     * @returns {Object} The transferrable representation of the object
     */
    #getTransferrable(name, obj) {
        return obj?.getTransferrable(name) || {};
    }

    /**
     * Add a new particle type to the particle engine
     * @param {String} name 
     * @param {Particle} particle 
     */
    addParticleType(name, particle) {
        const tParticle = this.#getTransferrable(name, particle);
        this.#send({ 
            type: Constants.MSG_ADD_TYPE, 
            name: name, 
            particle: tParticle 
        });
    }

    /**
     * Add a particle effect
     * @param particleEffect
     * @return {ParticleEffect} The instance of the effect
     */
    addEffect(name, particleEffect) {
        const tEffect = this.#getTransferrable(name, particleEffect);
        this.#send({ 
            type: Constants.MSG_ADD_EFFECT, 
            name: name, 
            effect: tEffect 
        });
    }

    /**
     * Add a set of particles at once
     * @param {Array<Object>} particles - The set of particles to add, an array of objects containing `type`, and `pos` ([x, y] world position)
     */
    addParticles(particles) {
        this.#send({ 
            type: Constants.MSG_ADD_PARTICLES, 
            particles: particles
        });
    }

    /**
     * Add a single particle to the engine
     * @param {Object} particle - contains `type`, and `pos` ([x, y] world position)
     */
    addParticle(particle) {
        this.#send({ 
            type: Constants.MSG_ADD_PARTICLES, 
            particles: [particle]
        });
    }

    /**
     * Emit particles using an effect, into the particle engine at the given poisition.
     * 
     * @param {Array<number>} worldPos - The [x,y] world coordinates where the effect should emit particles
     * @param {String} effectName - The name of the effect to run, effects contain the functionality to generate and modify particles emitted to the engine
     * @param {number} time - Current world time in milliseconds 
     * @param {number} deltaTime - The time in milliseconds since the last frame
     */
    runEffect([x, y], effectName, time, deltaTime) {
        this.#send({ 
            type: Constants.MSG_RUN_EFFECT, 
            pos: [x, y], 
            name: effectName, 
            time: time, 
            deltaTime: deltaTime 
        });
    }

    /**
     * Spawn a single particle into the particle engine at the given position. The particle type dictates the behavior of the particle, including 
     * how it is rendered, how it moves, and how it is updated over time.
     * @param {Array<number>} worldPos - [x,y] world position to spawn the particle 
     * @param {String} particleType - the type of particle to spawn 
     */
    spawnParticle(worldPos, particleType) {
        this.#send({
            type: Constants.MSG_SPAWN, 
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
}