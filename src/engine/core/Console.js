/**
 * Console - Simple logging utility for RenderEngine4
 * Provides warn and error logging functionality
 */

export default class Console {
  /**
   * Logs a warning message to console
   * @param {string} message - The warning message to log
   */
  static warn(...message) {
    if (typeof window !== 'undefined' && window.console) {
      console.warn('[RenderEngine4]', ...message);
    }
  }

  /**
   * Logs an error message to console
   * @param {string} message - The error message to log
   */
  static error(...message) {
    if (typeof window !== 'undefined' && window.console) {
      console.error('[RenderEngine4]', ...message);
    }
  }

  /**
   * Logs an info message to console
   * @param {string} message - The info message to log
   */
  static info(...message) {
    if (typeof window !== 'undefined' && window.console) {
      console.info('[RenderEngine4]', ...message);
    }
  }

  static log(...message) {
    Console.info(...message)
  }

  /**
   * Logs a debug message to console (only in development mode)
   * @param {string} message - The debug message to log
   */
  static debug(...message) {
    if (typeof window !== 'undefined' && 
        window.console && 
        process?.env?.NODE_ENV !== 'production') {
      console.debug('[RenderEngine4]', ...message);
    }
  }
};
