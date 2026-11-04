/**

 * Console - Simple logging utility for RenderEngine4
 * Provides warn and error logging functionality
 */
import Context from '../Context.js';

const ctx = Context.getInstance();

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

// game engine console replacement
const re4Console = new Console();

class Logger extends Console {
  /**
   * Create a console where the class constructor name is displayed
   * in the log output. Optionally attached to the browser console, bypassing the game console.
   * @param {*} instance - Object to reference in the console
   * @param {String} label - Optional label to append to the constructor class
   * @param {boolean} root - If `true`, the console will attach to the browser console
   */
  constructor(instance, label = null, root = false) {
    super(`[${instance.constructor.name}${label !== null ? ' ' + label : ''}]`, 
      root ? re4Console.referenceConsole : re4Console);
  }
}

// Debug insert points
function pragma(name, fn) {
  if (ctx.debug && ctx.debugOpts[name.split(':')[0]] === true)
    fn();
}

/**
 * Set a performance mark in the profiler
 * @param name
 */
function perf(name) {
  if (ctx.debug)
    return performance.mark(name).startTime;
  else
    return performance.now();
}

/**
 * Add a measurement to the profiler
 * @param name
 * @param startMark
 * @param endMark
 */
function measure(name, startMark, endMark) {
  if (ctx.debug)
    return performance.measure(name, startMark, endMark).duration;
  else
    return 0;
}

const initializeConsole = () => {
  // Replace globalThis.console with our console 
  // and assign the pragma directives
  const owner = globalThis ? globalThis : self;
  owner.console = re4Console;
  installDirectives(owner);
}

const installDirectives = (owner = self) => {
  if (!owner.PRAGMA) {
    // assign only once
    owner.PRAGMA = pragma;
    owner.PERF = perf;
    owner.MEASURE = measure;
  }
}

export {
  Logger,
  initializeConsole,
  installDirectives
};