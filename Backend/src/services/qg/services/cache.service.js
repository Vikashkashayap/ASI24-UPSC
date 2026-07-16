/**
 * In-memory TTL cache for embeddings, retrieval, verification results.
 */

class TtlCache {
  constructor(defaultTtlMs = 10 * 60 * 1000) {
    this.store = new Map();
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key) {
    const row = this.store.get(key);
    if (!row) return undefined;
    if (Date.now() > row.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return row.value;
  }

  set(key, value, ttlMs) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs),
    });
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  size() {
    return this.store.size;
  }
}

export const embeddingCache = new TtlCache();
export const retrievalCache = new TtlCache();
export const verificationCache = new TtlCache();
export const explanationCache = new TtlCache();
export const questionResultCache = new TtlCache();

export function cacheKey(parts = []) {
  return parts.map((p) => String(p ?? "").trim().toLowerCase()).join("::");
}

export default {
  embeddingCache,
  retrievalCache,
  verificationCache,
  explanationCache,
  questionResultCache,
  cacheKey,
};
