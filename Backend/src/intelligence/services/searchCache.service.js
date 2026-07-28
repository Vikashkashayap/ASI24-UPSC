/**
 * In-memory + optional Redis search/embedding cache.
 */

const memory = new Map();
let redis = null;
let redisTried = false;

function ttlMs() {
  return (parseInt(process.env.INTEL_SEARCH_CACHE_TTL_SEC, 10) || 300) * 1000;
}

async function getRedis() {
  if (redisTried) return redis;
  redisTried = true;
  const url = String(process.env.REDIS_URL || "").trim();
  if (!url) return null;
  try {
    const { default: Redis } = await import("ioredis");
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });
    redis.on("error", () => {});
    await redis.connect();
    return redis;
  } catch {
    redis = null;
    return null;
  }
}

export async function cacheGet(key) {
  const r = await getRedis();
  if (r) {
    try {
      const raw = await r.get(`intel:${key}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // fall through
    }
  }
  const hit = memory.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

export async function cacheSet(key, value, ttl = ttlMs()) {
  const r = await getRedis();
  if (r) {
    try {
      await r.set(`intel:${key}`, JSON.stringify(value), "PX", ttl);
    } catch {
      // ignore
    }
  }
  memory.set(key, { value, expires: Date.now() + ttl });
  // bound memory
  if (memory.size > 500) {
    const first = memory.keys().next().value;
    memory.delete(first);
  }
}

export function cacheKey(parts) {
  return parts.map((p) => String(p ?? "")).join("|");
}
