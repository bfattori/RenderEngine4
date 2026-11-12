/**

 * Console - Simple logging utility for RenderEngine4
 * Provides warn and error logging functionality
 */
import Context from '../../Context.js';

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
    if (typeof globalThis !== 'undefined') {
      globalThis.console = this.#ref;
      delete globalThis.PRAGMA;
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
   * @param {Class} clazz - The class to reference in the console
   * @param {String} label - Optional label to append to the constructor class
   * @param {boolean} root - If `true`, the console will attach to the browser console
   */
  constructor(clazz, label = null, root = false, override = null) {
    super(`[${clazz.name}${label !== null ? ' ' + label : ''}]`, 
      root ? re4Console.referenceConsole : override !== null ? override : re4Console);
  }
}

// required to initialize debugging for a class
async function pragma_init(clazz) {
  const className = clazz.name;
  const DEBUG = await import(new URL(`../../_debug/${className}.js${ctx.preventScriptCache}`, import.meta.url));
  clazz.__DEBUG__ = DEBUG.default;
}

// Debug insert points
function pragma(clazz, name, data) {
  if (ctx.pragmas && ctx.debug && ctx.debugOpts[name.split(':')[0]] === true)
    return clazz["__DEBUG__"][name](data);
}

/**
 * Set a performance mark in the profiler
 * @param name
 */
function perf(name) {
  if (ctx.trackPerformance && ctx.debug)
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
  if (ctx.trackPerformance && ctx.debug)
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
  if (!owner.PRAGMA_INIT) {
    // assign only once
    owner.PRAGMA_INIT = pragma_init;
    owner.PRAGMA = pragma;
    owner.PERF = perf;
    owner.MEASURE = measure;
  }
}

initializeConsole();

export {
  Logger,
  initializeConsole,
  installDirectives
};