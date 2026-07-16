/**
 * Lightweight structured logger for RAG pipelines (Winston-compatible shape).
 * Avoids a hard Winston dependency while keeping searchable log lines.
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const ACTIVE = String(process.env.RAG_LOG_LEVEL || "info").toLowerCase();
const THRESHOLD = LEVELS[ACTIVE] ?? LEVELS.info;

function emit(level, message, meta = {}) {
  if ((LEVELS[level] ?? 99) > THRESHOLD) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    module: "rag",
    message,
    ...meta,
  };
  const text = JSON.stringify(line);
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}

export const ragLogger = {
  info: (message, meta) => emit("info", message, meta),
  warn: (message, meta) => emit("warn", message, meta),
  error: (message, meta) => emit("error", message, meta),
  debug: (message, meta) => emit("debug", message, meta),

  timed(label) {
    const start = Date.now();
    return {
      end(meta = {}) {
        const ms = Date.now() - start;
        emit("info", label, { durationMs: ms, ...meta });
        return ms;
      },
    };
  },
};

export default ragLogger;
