/**
 * Redis connection helper for BullMQ.
 * Falls back to null when REDIS_URL is missing / unreachable.
 */

let connection = null;
let connectionUrl = null;

export function getRedisUrl() {
  return (
    String(process.env.REDIS_URL || process.env.REDIS_CONNECTION_URL || "").trim() ||
    null
  );
}

export function isInlineFallbackEnabled() {
  const v = String(process.env.PROCESSING_INLINE_FALLBACK ?? "true").toLowerCase();
  return v !== "false" && v !== "0";
}

export function getBullConnection() {
  const url = getRedisUrl();
  if (!url) return null;
  if (connection && connectionUrl === url) return connection;
  connectionUrl = url;
  connection = { url, maxRetriesPerRequest: null };
  return connection;
}

export async function pingRedis() {
  const url = getRedisUrl();
  if (!url) return { ok: false, configured: false, message: "REDIS_URL not set" };
  let client;
  try {
    const { default: Redis } = await import("ioredis");
    client = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null,
      showFriendlyErrorStack: false,
    });
    client.on("error", () => {});
    await client.connect();
    const pong = await client.ping();
    await client.quit().catch(() => {});
    return { ok: pong === "PONG", configured: true, mode: "bullmq" };
  } catch (err) {
    try {
      await client?.quit?.();
      await client?.disconnect?.();
    } catch {
      // ignore
    }
    return {
      ok: false,
      configured: true,
      message: err?.message || "Redis ping failed",
    };
  }
}
