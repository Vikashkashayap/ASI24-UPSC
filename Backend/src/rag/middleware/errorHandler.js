/**
 * Centralized RAG error helper — attach HTTP status without crashing the process.
 */

export class RagError extends Error {
  /**
   * @param {string} message
   * @param {number} [status=500]
   * @param {object} [meta]
   */
  constructor(message, status = 500, meta = {}) {
    super(message);
    this.name = "RagError";
    this.status = status;
    this.meta = meta;
  }
}

export function toRagError(err, fallbackStatus = 500) {
  if (err instanceof RagError) return err;
  const e = new RagError(err?.message || "RAG error", err?.status || fallbackStatus);
  return e;
}

/** Express error middleware for /api/rag (optional mount). */
export function ragErrorHandler(err, _req, res, next) {
  if (!err) return next();
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || "RAG request failed",
  });
}

export default { RagError, toRagError, ragErrorHandler };
