/**
 * In-memory TTL cache for AI orchestrator analytics.
 */

const DEFAULT_TTL_MS = Number(process.env.AI_CACHE_TTL_MS) || 15 * 60 * 1000;

const stores = {
  question: new Map(),
  prompt: new Map(),
  keyword: new Map(),
  rubric: new Map(),
  currentAffairs: new Map(),
  modelAnswer: new Map(),
  // Copy-eval token savers (same file / same question)
  copyOcr: new Map(),
  copyKb: new Map(),
  copyModelAnswer: new Map(),
  copyEvalFull: new Map(),
};

const hitMiss = {
  question: { hits: 0, misses: 0 },
  prompt: { hits: 0, misses: 0 },
  keyword: { hits: 0, misses: 0 },
  rubric: { hits: 0, misses: 0 },
  currentAffairs: { hits: 0, misses: 0 },
  modelAnswer: { hits: 0, misses: 0 },
  copyOcr: { hits: 0, misses: 0 },
  copyKb: { hits: 0, misses: 0 },
  copyModelAnswer: { hits: 0, misses: 0 },
  copyEvalFull: { hits: 0, misses: 0 },
};

function bucket(name) {
  return stores[name] || stores.prompt;
}

export function cacheGet(namespace, key) {
  const map = bucket(namespace);
  const entry = map.get(String(key));
  const stats = hitMiss[namespace] || hitMiss.prompt;
  if (!entry) {
    stats.misses += 1;
    return null;
  }
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    map.delete(String(key));
    stats.misses += 1;
    return null;
  }
  stats.hits += 1;
  return entry.value;
}

export function cacheSet(namespace, key, value, ttlMs = DEFAULT_TTL_MS) {
  const map = bucket(namespace);
  map.set(String(key), {
    value,
    expiresAt: Date.now() + Math.max(1000, ttlMs),
  });
}

export function cacheHas(namespace, key) {
  return cacheGet(namespace, key) != null;
}

export function cacheClear(namespace) {
  if (namespace) {
    bucket(namespace).clear();
    return;
  }
  for (const map of Object.values(stores)) map.clear();
}

export function cacheStats() {
  const byNs = {};
  for (const [ns, map] of Object.entries(stores)) {
    const hm = hitMiss[ns] || { hits: 0, misses: 0 };
    byNs[ns] = {
      size: map.size,
      hits: hm.hits,
      misses: hm.misses,
    };
  }
  return { namespaces: byNs };
}

export default { cacheGet, cacheSet, cacheHas, cacheClear, cacheStats };
