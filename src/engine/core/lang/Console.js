import Context from '../../Context.js';
const ctx = Context.getInstance();

/**
 * Console - Simple logging utility for RenderEngine4
 * Provides warn and error logging functionality
 */
export default class Console {
  #ref = null;
  #label;

  constructor(label = '[RenderEngine4]', refConsole = console) {
    this.#ref = refConsole;
    this.#label = label;
  }

  get referenceConsole() {
    return this.#ref;
  }

  //----------------------------------
  // Standard console overrides

  /**
   * Logs a warning message to console
   * @param {string} message - The warning message to log
   */
  warn(...message) {
    this.#ref.warn(this.#label, ...message);
  }

  /**
   * Logs an error message to console
   * @param {string} message - The error message to log
   */
  error(...message) {
    this.#ref.error(this.#label, ...message);
  }

  /**
   * Logs an info message to console
   * @param {string} message - The info message to log
   */
  info(...message) {
    this.#ref.info(this.#label, ...message);
  }

 /**
   * Logs an object to the console in a tree format
   * @param {Object} object - The object
   */
  dir(object) {
    this.#ref.dir(object);
  }

  /**
   * Create a group in the console
   * @param {String} label - Optional label
   */
  group(label) {
    this.#ref.group(this.#label ? this.#label + (label ? ': ' + label : label) : label);
  }

  /**
   * Create a collapsed group in the console
   * @param {String} label - Optional label
   */
  groupCollapsed(label) {
    this.#ref.groupCollapsed(`${this.#label}: ${label}`);
  }

  /**
   * Close whatever group is currently receiving logging
   */
  groupEnd() {
    this.#ref.groupEnd();
  }

  shutdown() {
    if (typeof globalThis !== 'undefined') {
      globalThis.console = this.#ref;
    } else {
      self.console = this.#ref;
    }
  }

  //-----------------------------------------------
  // The following methods are filtered by 
  // the `debugVerbosity` setting

  /**
   * Filtered logging (verbosity = 1)
   * @param  {...any} message - The info message to log
   */
  log(...message) {
    if (ctx.debugVebosity >= 1)
      this.info(...message)
  }

  /**
   * Filtered logging (verbosity = 2)
   * @param {string} message - The debug message to log
   */
  debug(...message) {
    if (ctx.debugVerbosity >= 2)
      this.info(...message);
  }

  /**
   * Filtered logging (verbosity = 3)
   * @param  {...any} message 
   */
  verbose(...message) {
    if (ctx.debugVerbosity === 3)
      this.info(...message);
  }

 
};

// game engine console replacement
const re4Console = new Console();

class Logger extends Console {
  /**
   * Create a console where the class constructor name is displayed
   * in the log output. Optionally attached to the browser console, bypassing the game console.
   * @param {Class} clazz - The class to reference in the console
   * @param {String} label - Optional label to append to the constructor class
   * @param {boolean} root - If `true`, the console will attach to the browser console
   */
  constructor(clazz, label = null, root = false, override = null) {
    super(`[${clazz.name}${label !== null ? ' ' + label : ''}]`, 
      root ? re4Console.referenceConsole : override !== null ? override : re4Console);
  }
}

const initializeConsole = () => {
  // Replace globalThis.console with our console 
  // and assign the pragma directives
  const owner = globalThis ? globalThis : self;
  owner.console = re4Console;
}

initializeConsole();

export {
  Logger,
  initializeConsole
};