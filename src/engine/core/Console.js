/**
 * Console - Simple logging utility for RenderEngine4
 * Provides warn and error logging functionality
 */

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
    ref.debug('[RenderEngine4]', ...message);
  }
};

// Replace window.console or global.console 
// with our console
const re4Console = new Console();
if (window) {
    window.console = re4Console;
} else if (global) {
    global.console = re4Console;
}
