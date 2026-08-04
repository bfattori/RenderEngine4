import Console from '../../core/Console.js';
import Context from '../../Context.js';
import CanvasPIP from '../../ui/debug/CanvasPIP.js';
import $Math from '../../core/Math.js';

let orchestratorInstance = null;
const ctx = Context.getInstance();

console.debug('Orchestrator thread loaded');

class Orchestrator {
    #workers = new Map();
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

    #nextWorkerId = 0;

    constructor(viewPort, particlesConfig, threadingConfig, systemOpts) {
        this.#compositor = new OffscreenCanvas(viewPort[0], viewPort[1]);
        this.#particlesConfig = particlesConfig;
        this.#threadingConfig = threadingConfig;
        this.#waitingWorkers = new Array(threadingConfig.workers).fill(true);

        // initialize the context with the system options
        ctx.debugOpts = systemOpts.debugOpts;
        ctx.engineOpts = systemOpts.engineOpts;

        // spawn the worker threads for the particle engine
        for (let i = 0; i < threadingConfig.workers; i++) {
            const worker = new Worker(new URL(`./Worker.js${ctx.engineOpts.preventThreadCaching ? '?v=' + Date.now() : ''}`, import.meta.url), {
                type: 'module',
                name: `${threadingConfig.name}_worker${i}`
            });

            // set the listener for messages from the worker thread
            worker.onmessage = (event) => { this.#fromWorker(event); };
            this.#workers.set(i, { 
                worker: worker, 
                load: 0.0, 
                burden: 0, 
                live: 0 
            });

            // initialize the worker thread to distribute particle handling
            const workerConfig = { ...particlesConfig, maxParticles: Math.floor(particlesConfig.maxParticles / threadingConfig.workers) };
            worker.postMessage({ re4: 'particles', workerId: i, type: 'init', width: viewPort[0], height: viewPort[1], config: workerConfig, threading: threadingConfig, systemOpts: systemOpts });
        }

        console.debug(`Orchestrator initialized with ${threadingConfig.workers} worker threads.`);
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

    /**
     * Composites the bitmaps returned from the worker threads into a single bitmap.
     * @returns {ImageBitmap}
     */
    #compositeWorkers() {
        PERF('compositeStart');
        for (let i = 0; i < this.#workerBitmaps.length; i++) {
            this.#compositor.getContext('2d').drawImage(this.#workerBitmaps[i], 0, 0);
        }
        const bitmap = this.#compositor.transferToImageBitmap();
        PERF('compositeEnd');
        MEASURE('Composite Bitmaps', 'compositeStart', 'compositeEnd');
        return bitmap;
    }

    /**
     * A message handler for receiving messages from the worker threads.
     * @param {Event} event 
     */
    #fromWorker(event) {
        if (event.data.re4 && event.data.re4 === 'pWorker') {
            switch(event.data.type) {
                case 'ready':
                    this.#waitingWorkers[event.data.workerId] = false;
                    if (this.#waitingWorkers.every(e => e === false)) {
                        // the orchestrator is ready to handle requests
                        postMessage({ re4: 'orchestrator', type: 'ready' });
                    }
                    break;
                case 'updated':
                    if (this.updated[event.data.workerId]) {
                        this.#exUpdate[event.data.workerId] = false;

                        // update the status of the worker thread in the orchestrator
                        this.#workers.get(event.data.workerId).load = event.data.load;
                        this.#workers.get(event.data.workerId).burden = event.data.burden;
                        this.#workers.get(event.data.workerId).live = event.data.live;

                        if (this.updated.every((v) => v === false)) {
                            // all threads have updated
                            this.#timers[1] = performance.now();
                        }
                    }
                    break;
                case 'rendered':
                    // the worker thread has rendered the particles and returned the bitmap
                    if (this.#expected[event.data.workerId]) {
                        this.#expected[event.data.workerId] = false;
                        this.#workerBitmaps[event.data.workerId] = event.data.image;
                        
                        PRAGMA('showParticleWorkersPiP:rendered', () => {
                            const image = CanvasPIP.copyImage(event.data.image);
                            postMessage({ re4: 'orchestrator', workerId: event.data.workerId, type: 'workerRendered', image: image }, [ image ])
                        });

                        if (this.#expected.every((v) => v === false)) {
                            // all worker threads have rendered
                            const combinedBitmap = this.#compositeWorkers();
                            postMessage({
                                re4: 'orchestrator',
                                type: 'rendered',
                                image: combinedBitmap
                            }, [combinedBitmap]);

                            // clear the array for the next render cycle
                            this.#workerBitmaps.length = 0;

                            PRAGMA('showParticleEngineLoad', () => {
                                // send the updated load metrics back to the main thread
                                const metrics = {
                                    size: orchestratorInstance.workers.size,
                                    updateTime: (this.#timers[1] - this.#timers[0]) / this.#timers[10],
                                    renderTime: (performance.now() - this.#timers[2]) / this.#timers[10],
                                    cpuTime: (performance.now() - this.#timers[0]) / this.#timers[10]
                                };
                                for (const [workerId, workerData] of orchestratorInstance.workers) {
                                    metrics[workerId] = {
                                        load: workerData.load,
                                        burden: workerData.burden,
                                        live: workerData.live
                                    };
                                }
                                postMessage({re4: 'orchestrator', type: 'metrics', metrics: metrics});

                            });
                        }
                    }
                    break;
                default:
                    console.error('Unknown message type from worker:', event.data.type);
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
            worker.postMessage(event);
        }
    }

    /**
     * Broadcast to all workers
     * @param {Event} event 
     */
    broadcast(event) {
        for (const [workerId, worker] of this.#workers) {
            worker.worker.postMessage(event);
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
        while(itr++ < 100) {
            const worker = this.#workers.get(workerId);
            if (load < 1.0) {
                if (worker.load < load) 
                    return workerId;

                // try a different worker
                workerId = $Math.randomRange(0, this.#workers.size, true);
                selected[workerId] = true;

                if (selected.every(e => e === true)) {
                    // Increase load threshold if all workers are busy.
                    // Eventually load goes above 100 and the next call will 
                    // return a random worker, which is fine.
                    load += this.#threadingConfig.loadFactor;
                    selected.fill(false, 0, this.#workers.size - 1); 
                }
            }
        }

        // return a random worker
        return $Math.randomRange(0, this.#workers.size, true);
    }

    shutdown() {
        // terminate the workers
        this.workers.forEach((worker) => {
            worker.worker.terminate();
        });
        console.debug('Workers terminated');
        postMessage({ re4: 'orchestrator', type: 'terminated' });
    }
}


/**
 * Handler for messages received from the main thread. This function processes messages related to 
 * particle engine operations, such as initialization, adding particle types, effects, and updating/rendering 
 * particles. It distributes tasks to worker threads based on their load and handles responses from workers.
 */
console.debug('Initializing particle manager listener...');
addEventListener('message', (event) => {
    if (event.data.re4 && event.data.re4 === 'particles') {

        if (event.data.type === 'init') {
            const viewPort = [event.data.width, event.data.height];
            const particlesConfig = event.data.config;
            const threadingConfig = event.data.threading;
            const systemOpts = event.data.systemOpts;
            orchestratorInstance = new Orchestrator(viewPort, particlesConfig, threadingConfig, systemOpts);
        } else if (orchestratorInstance) {
            switch(event.data.type) {
                case 'addParticles':
                case 'effect':
                case 'spawn':
                    // forward to a worker
                    orchestratorInstance.toWorker(event.data);
                    break;
                case 'update':
                    orchestratorInstance.timers[0] = performance.now();
                    orchestratorInstance.timers[10] = event.data.deltaTime;
                    // completion flags
                    for (const [i, worker] of orchestratorInstance.workers) {
                        if (worker) {
                            orchestratorInstance.updated[i] = true;
                        }
                    }
                case 'type':
                case 'addEffect':
                    // call update on, and add particle types and effects to, all workers
                    orchestratorInstance.broadcast(event.data);
                    break;
                case 'render':
                    orchestratorInstance.timers[2] = performance.now();
                    // completion flags
                    for (const [i, worker] of orchestratorInstance.workers) {
                        if (worker) {
                            orchestratorInstance.expected[i] = true;
                        }
                    }
                    // render all workers at once
                    orchestratorInstance.broadcast(event.data);
                    break;
                case 'shutdown':
                    orchestratorInstance.shutdown();
                    break;
                default:
                    console.error('Unknown message type:', event.data.type);
            }
        }
    }
});
