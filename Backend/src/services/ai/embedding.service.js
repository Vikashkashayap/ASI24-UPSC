import fetch from "node-fetch";
import {
  getOpenRouterAppTitle,
  getOpenRouterIdentHeaders,
} from "../../config/openRouterAppTitle.js";

const DEFAULT_JINA_URL = "https://api.jina.ai/v1/embeddings";
const DEFAULT_OPENAI_URL = "https://api.openai.com/v1";
const DEFAULT_VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";

const PROVIDER_LABELS = {
  jina: "Jina AI",
  openai: "OpenAI",
  voyage: "Voyage AI",
};

const JINA_TASKS = {
  query: "retrieval.query",
  passage: "retrieval.passage",
  document: "retrieval.passage",
  default: "retrieval.passage",
};

/**
 * Pluggable embedding service — default: OpenAI (text-embedding-3-small).
 * Switch providers via EMBEDDING_PROVIDER=openai|jina|voyage without changing the RAG pipeline.
 * OpenRouter keys (sk-or-…) auto-route to https://openrouter.ai/api/v1.
 */
class EmbeddingService {
  constructor() {
    this.provider = String(process.env.EMBEDDING_PROVIDER || "openai").trim().toLowerCase();
    this.disabled = false;
    this.warned = false;
    this.timeoutMs = parseInt(process.env.EMBEDDING_TIMEOUT_MS, 10) || 30_000;
    this.retries = parseInt(process.env.EMBEDDING_RETRIES, 10) || 3;
    this.retryBaseMs = parseInt(process.env.EMBEDDING_RETRY_BASE_MS, 10) || 800;
    this.batchSize = parseInt(process.env.EMBEDDING_BATCH_SIZE, 10) || 4;
    this.maxInputChars = parseInt(process.env.EMBEDDING_MAX_CHARS, 10) || 8000;

    this._initProvider();
  }

  _initProvider() {
    switch (this.provider) {
      case "openai":
        this._initOpenAi();
        break;

      case "voyage":
        this.model = process.env.VOYAGE_MODEL || "voyage-3";
        this.embedUrl = process.env.VOYAGE_API_URL || DEFAULT_VOYAGE_URL;
        this.apiKey = String(process.env.VOYAGE_API_KEY || "").trim();
        this.dimension =
          parseInt(process.env.QDRANT_VECTOR_SIZE || process.env.EMBEDDING_DIMENSION, 10) || 1024;
        break;

      case "jina":
        this.provider = "jina";
        this.model = process.env.JINA_MODEL || "jina-embeddings-v4";
        this.embedUrl = process.env.JINA_API_URL || DEFAULT_JINA_URL;
        this.apiKey = String(process.env.JINA_API_KEY || "").trim();
        this.dimension =
          parseInt(
            process.env.JINA_DIMENSIONS ||
              process.env.QDRANT_VECTOR_SIZE ||
              process.env.EMBEDDING_DIMENSION,
            10
          ) || 1024;
        break;

      default:
        this.provider = "openai";
        this._initOpenAi();
        break;
    }
  }

  _initOpenAi() {
    this.provider = "openai";
    const explicitKey = String(process.env.OPENAI_API_KEY || "").trim();
    const openRouterKey = String(process.env.OPENROUTER_API_KEY || "").trim();
    let baseUrl = String(process.env.OPENAI_BASE_URL || "").trim().replace(/\/$/, "");

    const keyLooksOpenRouter = explicitKey.startsWith("sk-or-");
    const useOpenRouter =
      /openrouter\.ai/i.test(baseUrl) ||
      keyLooksOpenRouter ||
      (!explicitKey && Boolean(openRouterKey));

    if (useOpenRouter && !baseUrl) {
      baseUrl = "https://openrouter.ai/api/v1";
    }
    if (!baseUrl) baseUrl = DEFAULT_OPENAI_URL;

    this.baseUrl = baseUrl;
    this.embedUrl = `${this.baseUrl}/embeddings`;
    this.apiKey = useOpenRouter
      ? keyLooksOpenRouter
        ? explicitKey
        : openRouterKey || explicitKey
      : explicitKey || (/openrouter\.ai/i.test(baseUrl) ? openRouterKey : "");

    let model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
    if (/openrouter\.ai/i.test(this.baseUrl) && !model.includes("/")) {
      model = `openai/${model}`;
    }
    this.model = model;
    this.dimension =
      parseInt(process.env.QDRANT_VECTOR_SIZE || process.env.EMBEDDING_DIMENSION, 10) || 1536;
  }

  getModelName() {
    return this.model;
  }

  getDimension() {
    return this.dimension;
  }

  /** Internal provider id: jina | openai | voyage */
  getProvider() {
    return this.provider;
  }

  /** Human-readable label for health / admin UI */
  getProviderLabel() {
    return PROVIDER_LABELS[this.provider] || this.provider;
  }

  isConfigured() {
    if (this.disabled) return false;
    return Boolean(this.apiKey);
  }

  _resolveOpenAiApiKey() {
    return this.apiKey || "";
  }

  _disableWithWarning(message) {
    this.disabled = true;
    if (!this.warned) {
      console.warn(`[embedding] ${message}`);
      this.warned = true;
    }
  }

  _truncate(text) {
    return String(text || "").trim().slice(0, this.maxInputChars);
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  _resolveJinaTask(task) {
    const key = String(task || "default").toLowerCase();
    return JINA_TASKS[key] || JINA_TASKS.default;
  }

  _normalizeVector(raw) {
    if (!raw) return null;
    if (Array.isArray(raw) && typeof raw[0] === "number") return raw;
    if (Array.isArray(raw?.embedding)) return this._normalizeVector(raw.embedding);
    if (Array.isArray(raw) && Array.isArray(raw[0])) return this._normalizeVector(raw[0]);
    return null;
  }

  _isRetryableStatus(status) {
    return status === 429 || status === 502 || status === 503 || status === 504;
  }

  _supportsDimensionsParam() {
    return /text-embedding-3/i.test(this.model || "");
  }

  async _fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async _requestWithRetry(requestFn, { label = "embedding" } = {}) {
    let lastError;

    for (let attempt = 1; attempt <= this.retries; attempt += 1) {
      const started = Date.now();
      try {
        const result = await requestFn();
        const durationMs = Date.now() - started;
        console.log(`[embedding] ${label} ok in ${durationMs}ms (attempt ${attempt})`);
        return result;
      } catch (err) {
        lastError = err;
        const durationMs = Date.now() - started;
        const retryable = err.retryable !== false;
        console.warn(
          `[embedding] ${label} failed in ${durationMs}ms (attempt ${attempt}/${this.retries}): ${err.message}`
        );
        if (!retryable || attempt >= this.retries) break;
        const delayMs = err.retryAfterMs || this.retryBaseMs * 2 ** (attempt - 1);
        console.log(`[embedding] retrying ${label} in ${delayMs}ms`);
        await this._sleep(delayMs);
      }
    }

    console.error(`[embedding] ${label} failed after ${this.retries} attempts: ${lastError?.message}`);
    throw lastError;
  }

  async _callJina(texts, task = "default") {
    if (!this.apiKey) {
      throw Object.assign(new Error("JINA_API_KEY is not set"), { retryable: false });
    }

    const jinaTask = this._resolveJinaTask(task);
    const body = {
      model: this.model,
      task: jinaTask,
      dimensions: this.dimension,
      input: texts.map((t) => ({ text: t })),
    };

    const response = await this._fetchWithTimeout(this.embedUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 401 || response.status === 403) {
        this._disableWithWarning(`auth failure (${response.status}) — check JINA_API_KEY`);
        throw Object.assign(new Error(`Jina auth failed: ${response.status}`), { retryable: false });
      }
      const retryAfterHeader = response.headers.get("retry-after");
      let retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : undefined;
      if (!retryAfterMs && /tokens per minute/i.test(errText)) {
        retryAfterMs = 15_000;
      }
      throw Object.assign(
        new Error(`Jina API ${response.status}: ${errText.slice(0, 200)}`),
        { retryable: this._isRetryableStatus(response.status), retryAfterMs }
      );
    }

    const data = await response.json();
    const rows = data?.data || [];
    const byIndex = new Map(rows.map((row) => [row.index, row.embedding]));
    return texts.map((_, i) => this._normalizeVector(byIndex.get(i) ?? rows[i]?.embedding));
  }

  async _callOpenAiCompatible(texts) {
    if (!this.apiKey) {
      throw Object.assign(new Error("Embedding API key is not set"), { retryable: false });
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
    // OpenRouter Observability App column
    if (/openrouter\.ai/i.test(this.baseUrl || this.embedUrl || "")) {
      Object.assign(headers, getOpenRouterIdentHeaders(getOpenRouterAppTitle("UPSC Mentor")));
    }

    const body = {
      model: this.model,
      input: texts.length === 1 ? texts[0] : texts,
    };
    // text-embedding-3-* supports custom dimensions (match Qdrant vector size)
    if (this._supportsDimensionsParam() && this.dimension) {
      body.dimensions = this.dimension;
    }

    const response = await this._fetchWithTimeout(this.embedUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 401 || response.status === 403) {
        this._disableWithWarning(`auth failure (${response.status}) at ${this.embedUrl}`);
        throw Object.assign(new Error(`Embedding auth failed: ${response.status}`), { retryable: false });
      }
      const retryAfterHeader = response.headers.get("retry-after");
      let retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : undefined;
      if (!retryAfterMs && /tokens per minute/i.test(errText)) {
        retryAfterMs = 15_000;
      }
      throw Object.assign(
        new Error(`Embedding API ${response.status}: ${errText.slice(0, 200)}`),
        { retryable: this._isRetryableStatus(response.status), retryAfterMs }
      );
    }

    const data = await response.json();
    const byIndex = new Map((data?.data || []).map((row) => [row.index, row.embedding]));
    return texts.map((_, i) => this._normalizeVector(byIndex.get(i) ?? data?.data?.[i]?.embedding));
  }

  async _embedProviderBatch(texts, opts = {}) {
    switch (this.provider) {
      case "jina":
        return this._callJina(texts, opts.task);
      case "voyage":
      case "openai":
      default:
        return this._callOpenAiCompatible(texts);
    }
  }

  /**
   * Generate a single embedding vector.
   * @param {string} text
   * @param {{ task?: 'query'|'passage'|'document'|'default' }} [opts]
   * @returns {Promise<number[]|null>}
   */
  async generateEmbedding(text, opts = {}) {
    const input = this._truncate(text);
    if (!input || !this.isConfigured()) return null;
    const [vector] = await this.generateBatchEmbeddings([input], opts);
    return vector;
  }

  /**
   * Generate embeddings for multiple texts (batched).
   * @param {string[]} texts
   * @param {{ task?: 'query'|'passage'|'document'|'default' }} [opts]
   * @returns {Promise<(number[]|null)[]>}
   */
  async generateBatchEmbeddings(texts, opts = {}) {
    const list = (texts || []).map((t) => this._truncate(t));
    if (!list.length || !this.isConfigured()) {
      return list.map(() => null);
    }

    const results = [];
    const taskLabel = opts.task || "default";

    for (let i = 0; i < list.length; i += this.batchSize) {
      const slice = list.slice(i, i + this.batchSize);
      const nonEmpty = slice
        .map((text, offset) => ({ text, offset }))
        .filter((row) => row.text);

      if (!nonEmpty.length) {
        results.push(...slice.map(() => null));
        continue;
      }

      try {
        const vectors = await this._requestWithRetry(
          () => this._embedProviderBatch(nonEmpty.map((row) => row.text), opts),
          { label: `${this.provider} batch (${nonEmpty.length}, task=${taskLabel})` }
        );

        const batchResult = slice.map(() => null);
        nonEmpty.forEach((row, idx) => {
          batchResult[row.offset] = vectors[idx] ?? null;
        });
        results.push(...batchResult);
      } catch (err) {
        console.error(`[embedding] batch failed: ${err.message}`);
        results.push(...slice.map(() => null));
      }
    }

    return results;
  }

  /** @deprecated alias — use generateEmbedding */
  async embed(text, opts = {}) {
    return this.generateEmbedding(text, opts);
  }

  /** @deprecated alias — use generateBatchEmbeddings */
  async embedBatch(texts, opts = {}) {
    return this.generateBatchEmbeddings(texts, opts);
  }

  /**
   * Lightweight connectivity probe for health checks.
   * @returns {Promise<{ ok: boolean, provider: string, model: string, dimension: number, durationMs?: number, error?: string }>}
   */
  async healthCheck() {
    if (!this.isConfigured()) {
      return {
        ok: false,
        provider: this.getProviderLabel(),
        model: this.model,
        dimension: this.dimension,
        error: `${this.getProviderLabel()} API key not configured`,
      };
    }

    const started = Date.now();
    try {
      const vector = await this.generateEmbedding("health check ping", { task: "query" });
      const ok = Array.isArray(vector) && vector.length === this.dimension;
      return {
        ok,
        provider: this.getProviderLabel(),
        model: this.model,
        dimension: this.dimension,
        durationMs: Date.now() - started,
        error: ok ? undefined : `Unexpected vector dimension: ${vector?.length}`,
      };
    } catch (err) {
      return {
        ok: false,
        provider: this.getProviderLabel(),
        model: this.model,
        dimension: this.dimension,
        durationMs: Date.now() - started,
        error: err.message,
      };
    }
  }

  cosineSimilarity(a, b) {
    if (!a?.length || !b?.length || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i += 1) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (!normA || !normB) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const embeddingService = new EmbeddingService();
export default embeddingService;
