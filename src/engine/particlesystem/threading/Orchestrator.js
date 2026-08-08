import Console from '../../core/Console.js';
import Context from '../../Context.js';
import Constants from '../../Constants.js';
import CanvasPIP from '../../ui/debug/CanvasPIP.js';
import $Math from '../../core/Math.js';
import ParticleWorkerError from './ParticleWorkerError.js';

let orchestratorInstance = null;
const ctx = Context.getInstance();

class Orchestrator {
    #workers = new Map();
    #viewPort = [];
    #particlesConfig;
    #threadingConfig;
    #compositor;
    #timers = [];
    #exUpdate = [];

    // the bitmaps returned from the worker threads are stored here until 
    // the orchestrator thread can combine them and send them to the main thread
    #workerBitmaps = [];
    #expected = [];
    #waitingWorkers = null;
    #workerState = [];
    #systemOpts = null;
    #workerBurden = 0;

    #nextWorkerId = 0;


    constructor(viewPort, particlesConfig, threadingConfig, systemOpts) {
        this.#compositor = new OffscreenCanvas(viewPort[0], viewPort[1]);
        this.#particlesConfig = particlesConfig;
        this.#threadingConfig = threadingConfig;
        
        this.#viewPort = viewPort;

        // initialize the context with the system options
        this.#systemOpts = systemOpts;
        ctx.debugOpts = systemOpts.debugOpts;
        ctx.engineOpts = systemOpts.engineOpts;
        this.#workerBurden = Math.round(particlesConfig.maxParticles / threadingConfig.workers);

        this.#spawnWorkers();
    }

    get expected() {
        return this.#expected;
    }

    get updated() {
        return this.#exUpdate;
    }

    get workers() {
        return this.#workers;
    }

    get timers() {
        return this.#timers;
    }

    #spawnWorkers() {
        const pConfig = this.#particlesConfig;
        const tConfig = this.#threadingConfig;
        const vPort = this.#viewPort;

        this.#waitingWorkers = new Array(tConfig.workers).fill(true);

        // spawn the worker threads for the particle engine
        for (let i = 0; i < tConfig.workers; i++) {
            const worker = new Worker(new URL(`./ParticleWorker.js${ctx.preventThreadCache()}`, import.meta.url), {
                type: 'module',
                name: `${tConfig.name}_worker${i}`
            });

            // listeners for messages from the worker thread
            worker.onmessage = (event) => { 
                this.#fromWorker(event); 
            };
            worker.onerror = (event) => {
                console.error(event.message, event);
                //throw new ParticleWorkerError(worker, event.message, event);
            }

            worker.$name = `${tConfig.name}_worker${i}`;

            // retain worker information
            this.#workers.set(i, { 
                worker: worker, 
                live: 0 
            });

            // initialize the worker thread
            const workerConfig = { ...pConfig, maxParticles: Math.floor(pConfig.maxParticles / tConfig.workers) };
            worker.postMessage({ 
                re4: Constants.ORCHESTRATOR_MSG, 
                type: Constants.MSG_INIT, 
                workerId: i, 
                width: vPort[0], 
                height: vPort[1], 
                config: workerConfig, 
                threading: tConfig, 
                systemOpts: this.#systemOpts 
            });
        }

    }

    /**
     * Composites the bitmaps returned from the worker threads into a single bitmap.
     * @returns {ImageBitmap}
     */
    #compositeWorkers() {
        PERF('compositeStart');
        for (let i = 0; i < this.#workerBitmaps.length; i++) {
            if (this.#workerBitmaps[i]) {
                this.#compositor.getContext('2d').drawImage(this.#workerBitmaps[i], 0, 0);
            }
        }
        const bitmap = this.#compositor.transferToImageBitmap();
        PERF('compositeEnd');
        MEASURE('Composite Bitmaps', 'compositeStart', 'compositeEnd');
        return bitmap;
    }

    /**
     * Process events from the particle manager
     * @param {Event} event 
     */
    process(event) {
        switch(event.data.type) {
            case Constants.MSG_ADD_PARTICLES:
            case Constants.MSG_RUN_EFFECT:
            case Constants.MSG_SPAWN:
                // forward to a worker
                this.toWorker(event);
                break;
            case Constants.MSG_ADD_TYPE:
            case Constants.MSG_ADD_EFFECT:
                // broadcast to all workers
                this.broadcast(event);
                break;
            case Constants.MSG_RESET:
                // terminate the threads and restart them
                this.reset();
                break;
            case Constants.MSG_SHUTDOWN:
                this.shutdown();
                break;
            default:
                console.error('[Orchestrator] Unknown message type:', event.data.type);
        }
    }

    /**
     * A message handler for receiving messages from the worker threads.
     * @param {Event} event 
     */
    #fromWorker(event) {
        if (event.data.re4 && event.data.re4 === Constants.PARTICLE_WORKER_MSG) {
            switch(event.data.type) {
                case Constants.MSG_READY:
                    // once all workers are ready...
                    this.#waitingWorkers[event.data.workerId] = false;
                    if (this.#waitingWorkers.every(e => e === false)) {
                        postMessage({ 
                            re4: Constants.ORCHESTRATOR_MSG, 
                            type: Constants.MSG_READY 
                        });    // the orchestrator is ready to handle requests
                    }
                    break;
                case Constants.MSG_RENDERED:
                    // the worker thread has rendered the particles and returned a bitmap
                    this.#workerBitmaps[event.data.workerId] = event.data.image;
                    this.#workerState[event.data.workerId] = event.data.metrics;

                    PRAGMA('showParticleWorkersPiP:rendered', () => {
                        const image = CanvasPIP.copyImage(event.data.image);
                        postMessage({ 
                            re4: Constants.ORCHESTRATOR_MSG, 
                            workerId: event.data.workerId, 
                            type: Constants.MSG_WORKER_RENDERED, 
                            image: image 
                        }, [ image ]);
                    });

                    // merge worker bitmaps
                    const combinedBitmap = this.#compositeWorkers();
                    postMessage({
                        re4: Constants.ORCHESTRATOR_MSG,
                        type: Constants.MSG_RENDERED,
                        time: event.data.time,                  // these are the time and 
                        deltaTime: event.data.deltaTime,        // deltaTime of the particle system
                        image: combinedBitmap,
                        metrics: this.#workerState
                    }, [ combinedBitmap ]);
                    break;
                default:
                    console.error('[Orchestrator] Unknown message type:', event.data.type);
            }
        }
    }

    /**
     * Send a message to the first worker with a load under the threshold. It takes 
     * into account the load of each worker to ensure at least one worker is sent the message
     * for processing.
     * @param {Event} event 
     */
    toWorker(event) {
        const workerId = this.#whichWorker();
        const worker = this.#workers.get(workerId).worker;
        if (worker) {
            event.data.re4 = Constants.ORCHESTRATOR_MSG;
            worker.postMessage(event.data);
        }
    }

    /**
     * Broadcast to all workers
     * @param {Event} event 
     */
    broadcast(event) {
        event.data.re4 = Constants.ORCHESTRATOR_MSG;
        for (const [workerId, worker] of this.#workers) {
            worker.worker.postMessage(event.data);
        }
    }

    /**
     * Get the next available worker based on load. This function implements a simple round-robin assignment 
     * of workers, but it also takes into account the load of each worker. If all workers are busy, it will 
     * increase the load threshold and try again.
     * @returns {number}
     */
    #whichWorker() {
        // Simple round-robin assignment of workers
        let load = this.#threadingConfig.loadThreshold;
        let selected = new Array(this.#workers.size).fill(false);
        let workerId = $Math.randomRange(0, this.#workers.size, true);
        let itr = 0;
        selected[workerId] = true;
        
        // select a worker
        while(true) {
            const worker = this.#workers.get(workerId);
            const workerLoad = worker.live / this.#workerBurden;
            if (load >= 100.0 || workerLoad < load) 
                return workerId;

            // try a different worker
            workerId = $Math.randomRange(0, this.#workers.size, true);
            selected[workerId] = true;

            if (selected.every(e => e === true)) {
                // Increase load threshold if all workers have been tried.
                // Eventually load goes above 100 and the next call will 
                // return a random worker, which is fine.
                load += this.#threadingConfig.loadFactor;
                selected.fill(false); 
            }
        }
    }

    /**
     * Terminate running workers and clear the set
     */
    #terminateWorkers() {
        this.workers.forEach((worker) => {
            worker.worker.terminate();
            worker.worker = null;
        });
        this.workers.clear();
    }

    /**
     * Terminate running workers, and respawn new workers
     */
    reset() {
        // terminate and spawn new workers
        this.#terminateWorkers();
        this.#spawnWorkers();
    }

    /**
     * Terminate the workers and stop the orchestrator
     */
    shutdown() {
        // stop listening for new messages
        removeEventListener(messageHandler);
        
        // terminate the workers
        this.#terminateWorkers();
        console.debug('Workers terminated');
        postMessage({ 
            re4: Constants.ORCHESTRATOR_MSG, 
            type: Constants.MSG_TERMINATED 
        });
    }
}


/**
 * Handler for messages received from the main thread. This function processes messages related to 
 * particle engine operations, such as initialization, adding particle types, effects, and updating/rendering 
 * particles. It distributes tasks to worker threads based on their load and handles responses from workers.
 */
const messageHandler = addEventListener('message', (event) => {
    if (event.data.re4 && event.data.re4 === Constants.PARTICLE_MANAGER_MSG) {
        if (event.data.type === Constants.MSG_INIT) {
            console.debug('Starting particle orchestrator');
            const viewPort = [event.data.width, event.data.height];
            const particlesConfig = event.data.config;
            const threadingConfig = event.data.threading;
            const systemOpts = event.data.systemOpts;
            orchestratorInstance = new Orchestrator(viewPort, particlesConfig, threadingConfig, systemOpts);
        } else if (orchestratorInstance) {
            orchestratorInstance.process(event);
        }
    }
});
