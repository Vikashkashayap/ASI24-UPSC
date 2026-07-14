import fetch from "node-fetch";

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_HF_URL = "https://api-inference.huggingface.co/models";
const BGE_M3_MODEL = "BAAI/bge-m3";
const BGE_M3_DIMENSION = 1024;

/**
 * EmbeddingService — pluggable text embeddings.
 * Default provider: BAAI/bge-m3 (multilingual, 1024-d) via:
 *   1) OpenAI-compatible EMBEDDING_BASE_URL (TEI / Infinity / Xinference), or
 *   2) HuggingFace Inference API (HF_TOKEN / HUGGINGFACE_API_KEY)
 * Legacy: EMBEDDING_PROVIDER=openai → text-embedding-3-small
 */
class EmbeddingService {
  constructor() {
    this.provider = String(process.env.EMBEDDING_PROVIDER || "bge-m3")
      .trim()
      .toLowerCase();
    this.disabled = false;
    this.warned = false;

    if (this.provider === "openai") {
      this.model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
      this.baseUrl = String(process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL).replace(
        /\/$/,
        ""
      );
      this.embedUrl = `${this.baseUrl}/embeddings`;
      this.apiKey = this.resolveOpenAiApiKey();
      this.dimension =
        parseInt(process.env.QDRANT_VECTOR_SIZE || process.env.PINECONE_DIMENSION, 10) || 1536;
      this.maxInputChars = 8000;
    } else {
      // bge-m3 (default)
      this.provider = "bge-m3";
      this.model = process.env.EMBEDDING_MODEL || BGE_M3_MODEL;
      this.dimension =
        parseInt(process.env.QDRANT_VECTOR_SIZE || process.env.EMBEDDING_DIMENSION, 10) ||
        BGE_M3_DIMENSION;
      this.maxInputChars = parseInt(process.env.EMBEDDING_MAX_CHARS, 10) || 8000;

      const customBase = String(process.env.EMBEDDING_BASE_URL || "").trim().replace(/\/$/, "");
      if (customBase) {
        this.transport = "openai-compatible";
        this.baseUrl = customBase;
        this.embedUrl = `${customBase}/embeddings`;
        this.apiKey = String(
          process.env.EMBEDDING_API_KEY ||
            process.env.HF_TOKEN ||
            process.env.HUGGINGFACE_API_KEY ||
            ""
        ).trim();
      } else {
        this.transport = "huggingface";
        this.baseUrl = String(process.env.HF_INFERENCE_URL || DEFAULT_HF_URL).replace(/\/$/, "");
        this.embedUrl = `${this.baseUrl}/${this.model}`;
        this.apiKey = String(
          process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || process.env.EMBEDDING_API_KEY || ""
        ).trim();
      }
    }
  }

  getModelName() {
    return this.model;
  }

  getDimension() {
    return this.dimension;
  }

  getProvider() {
    return this.provider;
  }

  isConfigured() {
    if (this.disabled) return false;
    if (this.provider === "openai") return Boolean(this.apiKey);
    // Local TEI/Infinity may not require a key
    if (this.transport === "openai-compatible") return Boolean(this.embedUrl);
    return Boolean(this.apiKey);
  }

  resolveOpenAiApiKey() {
    const explicit = String(process.env.OPENAI_API_KEY || "").trim();
    if (explicit) return explicit;
    const openRouter = String(process.env.OPENROUTER_API_KEY || "").trim();
    if (openRouter && /openrouter\.ai/i.test(this.baseUrl)) return openRouter;
    return "";
  }

  disableWithWarning(message) {
    this.disabled = true;
    if (!this.warned) {
      console.warn(message);
      this.warned = true;
    }
  }

  truncate(text) {
    return String(text || "").trim().slice(0, this.maxInputChars);
  }

  /**
   * Normalize HF / OpenAI embedding payloads to a flat number[].
   * @param {unknown} raw
   * @returns {number[]|null}
   */
  normalizeVector(raw) {
    if (!raw) return null;
    if (Array.isArray(raw) && typeof raw[0] === "number") {
      return raw;
    }
    // Token embeddings: mean-pool
    if (Array.isArray(raw) && Array.isArray(raw[0]) && typeof raw[0][0] === "number") {
      const rows = raw;
      const dim = rows[0].length;
      const out = new Array(dim).fill(0);
      for (const row of rows) {
        for (let i = 0; i < dim; i += 1) out[i] += row[i];
      }
      for (let i = 0; i < dim; i += 1) out[i] /= rows.length;
      return out;
    }
    // Nested batch: [ [tokenvecs] ] or [ dense ]
    if (Array.isArray(raw) && Array.isArray(raw[0])) {
      return this.normalizeVector(raw[0]);
    }
    if (Array.isArray(raw?.embedding)) return this.normalizeVector(raw.embedding);
    return null;
  }

  async embedOpenAiCompatible(texts) {
    const headers = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    const response = await fetch(this.embedUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.model,
        input: texts.length === 1 ? texts[0] : texts,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 401 || response.status === 403) {
        this.disableWithWarning(
          `EmbeddingService disabled due to auth failure (${response.status}) at ${this.embedUrl}.`
        );
        return texts.map(() => null);
      }
      console.warn("EmbeddingService openai-compatible failed:", response.status, errText.slice(0, 200));
      return texts.map(() => null);
    }

    const data = await response.json();
    const byIndex = new Map((data?.data || []).map((row) => [row.index, row.embedding]));
    return texts.map((_, i) => this.normalizeVector(byIndex.get(i) ?? data?.data?.[i]?.embedding));
  }

  async embedHuggingFace(texts) {
    const results = [];
    for (const text of texts) {
      const response = await fetch(this.embedUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          inputs: text,
          options: { wait_for_model: true },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 401 || response.status === 403) {
          this.disableWithWarning(
            `EmbeddingService disabled due to HF auth failure (${response.status}). Set HF_TOKEN.`
          );
          results.push(null);
          continue;
        }
        // Model loading
        if (response.status === 503) {
          console.warn("EmbeddingService HF model loading:", errText.slice(0, 160));
          results.push(null);
          continue;
        }
        console.warn("EmbeddingService HF failed:", response.status, errText.slice(0, 200));
        results.push(null);
        continue;
      }

      const data = await response.json();
      results.push(this.normalizeVector(data));
    }
    return results;
  }

  /**
   * @param {string} text
   * @returns {Promise<number[]|null>}
   */
  async embed(text) {
    const input = this.truncate(text);
    if (!input || !this.isConfigured()) return null;
    const [vector] = await this.embedBatch([input]);
    return vector;
  }

  /**
   * @param {string[]} texts
   * @returns {Promise<(number[]|null)[]>}
   */
  async embedBatch(texts) {
    const list = (texts || []).map((t) => this.truncate(t));
    if (!list.length || !this.isConfigured()) return list.map(() => null);

    try {
      if (this.provider === "openai" || this.transport === "openai-compatible") {
        return await this.embedOpenAiCompatible(list);
      }
      return await this.embedHuggingFace(list);
    } catch (err) {
      console.warn("EmbeddingService.embedBatch error:", err.message);
      return list.map(() => null);
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
export { BGE_M3_MODEL, BGE_M3_DIMENSION };
