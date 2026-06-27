/**
 * Base error class for Render Engine 4 errors
 * @param {String} message - The Error message
 * @param {Error} rootCause - Optional root cause {@link Error}
 */
export default class RenderEngineError extends Error {
  constructor(message, rootCause = null) {
    super(`[RenderEngine4] ${message}`, rootCause);
  }
}