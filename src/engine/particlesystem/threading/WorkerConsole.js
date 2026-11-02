export default class WorkerConsole {
  #ref = null;
  #worker = null;
  
  constructor(worker, refConsole) {
    this.#ref = refConsole;
    this.#worker = worker;
  }

  get #workerId() {
    return this.#worker.workerId;
  }

  /**
   * Logs a warning message to console
   * @param {string} message - The warning message to log
   */
  warn(...message) {
    this.#ref.warn(`[Worker-${this.#workerId}]`, ...message);
  }

  /**
   * Logs an error message to console
   * @param {string} message - The error message to log
   */
  error(...message) {
    this.#ref.error(`[Worker-${this.#workerId}]`, ...message);
  }

  /**
   * Logs an info message to console
   * @param {string} message - The info message to log
   */
  info(...message) {
    this.#ref.info(`[Worker-${this.#workerId}]`, ...message);
  }

  /**
   * Alias for <code>info</code>
   * @param  {...any} message - The info message to log
   */
  log(...message) {
    this.info(...message)
  }

  /**
   * Logs a debug message to console (only in development mode)
   * @param {string} message - The debug message to log
   */
  debug(...message) {
    this.info(...message);
  }

  shutdown() {
    if (typeof global !== 'undefined') {
      global.console = this.#ref;
      delete global.PRAGMA;
    } else {
      self.console = this.#ref;
      delete self.PRAGMA;
    }
  }
};
