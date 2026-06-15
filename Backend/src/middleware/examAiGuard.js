import { AsyncLocalStorage } from "async_hooks";

/** Tracks exam-attempt vs migration-batch context to block accidental LLM calls. */
export const aiCallContext = new AsyncLocalStorage();

export function isExamAttemptContext() {
  return Boolean(aiCallContext.getStore()?.examAttempt);
}

export function isMigrationBatchContext() {
  return Boolean(aiCallContext.getStore()?.migrationBatch);
}

/**
 * Block OpenRouter/translation during live exam attempts.
 * Migration scripts set migrationBatch=true to allow one-time Hindi backfill.
 */
export function assertOpenRouterAllowed(caller = "unknown") {
  if (isMigrationBatchContext()) return;
  if (isExamAttemptContext()) {
    const msg = `🚫 BLOCKED: OpenRouter/translation during exam attempt (${caller}). Use DB fields only.`;
    console.error(msg);
    throw new Error(msg);
  }
}

export function runInExamAttemptContext(fn) {
  return aiCallContext.run({ examAttempt: true }, fn);
}

export function runInMigrationBatchContext(fn) {
  return aiCallContext.run({ migrationBatch: true }, fn);
}

/** Express middleware — wraps exam read/submit routes (zero AI tokens). */
export function examAttemptGuard(req, res, next) {
  aiCallContext.run({ examAttempt: true }, () => next());
}
