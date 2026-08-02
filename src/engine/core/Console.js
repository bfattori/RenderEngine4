/**
 * Console - Simple logging utility for RenderEngine4
 * Provides warn and error logging functionality
 */
import Context from '../Context.js';

const ctx = Context.getInstance();
const ref = console;

export default class Console {
  /**
   * Logs a warning message to console
   * @param {string} message - The warning message to log
   */
  warn(...message) {
    ref.warn('[RenderEngine4]', ...message);
  }

  /**
   * Logs an error message to console
   * @param {string} message - The error message to log
   */
  error(...message) {
    ref.error('[RenderEngine4]', ...message);
  }

  /**
   * Logs an info message to console
   * @param {string} message - The info message to log
   */
  info(...message) {
    ref.info('[RenderEngine4]', ...message);
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
      global.console = ref;
      delete global.PRAGMA;
    } else {
      self.console = ref;
      delete self.PRAGMA;
    }
  }
};

// Debug insert points
function pragma(name, fn) {
  if (ctx.debug && ctx.debugOpts[name.split(':')[0]] === true)
    fn();
}

// Replace window.console or global.console 
// with our console and assign the pragma directive
const re4Console = new Console();
if (typeof global !== 'undefined') {
  global.console = re4Console;
  global.PRAGMA = pragma;
} else {
  self.console = re4Console;
  self.PRAGMA = pragma;
}
