/**
 * Processing domain events — replaceable hooks for future bus (SQS/EventBridge).
 */

const listeners = new Map();

export function onProcessingEvent(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  return () => listeners.get(event)?.delete(handler);
}

export function emitProcessingEvent(event, payload) {
  const set = listeners.get(event);
  if (!set) return;
  for (const handler of set) {
    try {
      handler(payload);
    } catch (err) {
      console.warn(`[processing:event] ${event} handler error:`, err?.message || err);
    }
  }
}

export const ProcessingEvents = {
  STARTED: "processing.started",
  STAGE_COMPLETED: "processing.stage.completed",
  COMPLETED: "processing.completed",
  FAILED: "processing.failed",
  RETRIED: "processing.retried",
};
