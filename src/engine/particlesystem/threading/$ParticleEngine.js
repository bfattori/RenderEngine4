
import Context from '../../Context.js';
import CanvasPIP from '../../ui/debug/CanvasPIP.js';
import LoadCounter from '../../ui/debug/LoadCounter.js';

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

    #initProps = null;

    constructor(particleThread, width, height, config, threading, opts) {
        this.#thread = particleThread;
        this.#initProps = {
            width: width,
            height: height,
            config: config,
            threading: threading,
            opts: opts
        };

        console.debug('Setup orchestrator listener');
        this.#thread.onmessage = (event) => {
            if (event.data.re4 === 'orchestrator') {    // from the orchestrator thread
                switch(event.data.type) {
                    case 'ready':
                        this.#readyToProcess = true;
                        break;
                    case 'updated':
                        this.#metrics = event.data.metrics;
                        break;
                    case 'rendered':
                        this.bitmap = event.data.image;
                        this.#ready = true;
                        break;
                    case 'workerRendered':
                        PRAGMA('showParticleWorkersPiP:workerRender', () => {
                            this.#workerViews[event.data.workerId].update(event.data.image);
                        })
                        break;
                    case 'metrics':
                        PRAGMA('showParticleEngineLoad', () => {
                            for (let i = 0; i < event.data.metrics.size; i++) {
                                this.#engineLoadView.update(`worker${i}`, event.data.metrics[i].load * 100, true);
                            }
                        });
                        break;
                    case 'terminated':
                        this.#thread.terminate();
                        console.debug('Orchestrator thread shutdown');
                        break;
                    default:
                        console.error('Unknown message type:', event.data.type);
                }
            }
        };        
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
            const counters = [];
            for (let i = 0; i < this.#initProps.threading.workers; i++)
                counters.push(`worker${i}`);
            this.#engineLoadView = new LoadCounter("Particle Engine Load", counters);
        });

        return new Promise((resolve) => {
            console.debug('Initialize orchestrator');
            // initialize the orchestator and wait for it to be ready
            this.#thread.postMessage({ re4: 'particles', type: 'init', width: this.#initProps.width, height: this.#initProps.height, config: this.#initProps.config, threading: this.#initProps.threading, systemOpts: this.#initProps.opts });
            const $this = this;
            const waitFn = () => {
                if ($this.readyToProcess) {
                    console.debug('Orchestrator thread ready');
                    resolve(true);
                } else {
                    // wait for the orchestrator to be ready
                    setTimeout(waitFn, 500);
                }
            }
            waitFn();
        })
    }

    /**
     * Terminate the thread. This will stop the particle engine and free up resources.
     */
    shutdown() {
        this.#thread.postMessage({ re4: 'particles', type: 'shutdown' });
    }

    /**
     * Send a message to the orchestrator thread
     * @param {Object} data - Data to send to the thread 
     * @param {Array<Object>} transfer - Optional array of objects to transfer ownership of to the thread 
     */
    #send(data, transfer) {
        if (this.#readyToProcess)
            this.#thread.postMessage({ re4: 'particles', ... data }, transfer);
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

    get readyToProcess() {
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

    set bitmap(bitmap) {
        this.#bitmap = bitmap;
    }


    /**
     * Add a new particle type to the particle engine
     * @param {String} name 
     * @param {Particle} particle 
     */
    addParticleType(name, particle) {
        const tParticle = this.#getTransferrable(name, particle);
        this.#send({ type: 'type', name: name, particle: tParticle });
    }

    /**
     * Add a particle effect
     * @param particleEffect
     * @return {ParticleEffect} The instance of the effect
     */
    addEffect(name, particleEffect) {
        const tEffect = this.#getTransferrable(name, particleEffect);
        this.#send({ type: 'addEffect', name: name, effect: tEffect });
    }

    /**
     * Add a set of particles at once
     * @param {Array<Object>} particles - The set of particles to add, an array of objects containing `type`, and `pos` ([x, y] world position)
     */
    addParticles(particles) {
        this.#send({ type: 'addParticles', particles: particles});
    }

    /**
     * Add a single particle to the engine
     * @param {Object} particle - contains `type`, and `pos` ([x, y] world position)
     */
    addParticle(particle) {
        this.#send({ type: 'addParticles', particles: [particle]});
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
        this.#send({ type: 'effect', pos: [x, y], name: effectName, time: time, deltaTime: deltaTime })
    }

    /**
     * Spawn a single particle into the particle engine at the given position. The particle type dictates the behavior of the particle, including 
     * how it is rendered, how it moves, and how it is updated over time.
     * @param {Array<number>} worldPos - [x,y] world position to spawn the particle 
     * @param {String} particleType - the type of particle to spawn 
     */
    spawnParticle(worldPos, particleType) {
        this.#send({type: 'spawn', pos: worldPos, particle: particleType });
    }

    /**
     * Update the particles
     * @param time {Number} The global time within the engine.
     * @param deltaTime {Number} The delta between the world time and the last time the world was updated
     *          in milliseconds.
     */
    update(time, deltaTime) {
        this.#send({ type: 'update', time: time, deltaTime: deltaTime });
    }

    /**
     * Render all of the active particles to the frame buffer
     * @param {number} time - The current world time 
     * @param {number} deltaTime - The time since the last frame
     * @param {Path2D} occlusionMask - Optional mask to clip areas that are occluded by objects
     */
    renderParticles(time, deltaTime, occlusionMask = null) {
        this.#notReady();
        this.#send({ type: 'render', time: time, deltaTime: deltaTime, mask: occlusionMask });
    }  
}