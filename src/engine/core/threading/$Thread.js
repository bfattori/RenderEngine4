
export default class $Thread {
  static GAME_THREAD_NAME = 'game';
  static MAIN_THREAD_NAME = 'main';

  static #context = {
    enabled: false,
    threads: new Map()
  };

  static get context() {
    return structuredClone($Thread.#context);
  }

  static get isThreaded() {
    return $Thread.#context.enabled === true;
  }

  /**
   * Get a thread by name
   * @param {String} threadName - The name of the thread
   * @returns {$Thread}
   */
  static get(threadName) {
    return $Thread.#context.threads.get(threadName);
  }

  static get isGameThread() {
    return $Thread.isThreaded && $Thread.get($Thread.MAIN_THREAD_NAME) === undefined;
  }

  static get isMainThread() {
    return $Thread.isThreaded && $Thread.get($Thread.MAIN_THREAD_NAME) !== undefined && $Thread.get($Thread.GAME_THREAD_NAME) !== undefined;
  }

  /**
   * The pipe to the main thread from the game thread.
   * @returns {$Thread}
   */
  static get pipeToMain() {
    return $Thread.get($Thread.GAME_THREAD_NAME);
  }

  /**
   * The pipe to the game thread from the main thread.
   * @returns {$Thread}
   */
  static get pipeToGame() {
    return $Thread.get($Thread.MAIN_THREAD_NAME);
  }

  /**
   * Checks if the current context is a web worker.
   * @returns {boolean} `true` if the current context is a web worker, `false` otherwise.
   */
  static get isThread() {
    return typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
  }

  /**
   * Checks if the current context is a web worker.
   * @returns {boolean} `true` if the current context is a web worker, `false` otherwise.
   */
  static get isWorker() {
    return $Thread.isThread;
  }

  #name = null;
  
  constructor(name) {
    const threadId = $Thread.#context.threads.size;

    this.#name = name || `$Thread-${threadId}`;
    $Thread.#context.threads.set(name, this);
    $Thread.#context.enabled = true;
  }

  get isThreaded() {
    return $Thread.isThreaded;
  }

  set is(name) {
    return this.#name === name;
  }

  get thread() {
    return self;
  }
}