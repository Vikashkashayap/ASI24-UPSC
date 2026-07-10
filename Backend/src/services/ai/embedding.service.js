import fetch from "node-fetch";

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

/**
 * EmbeddingService — pluggable text embeddings.
 * Default: OpenAI text-embedding-3-small (or OpenRouter-compatible key).
 * Future: swap provider without changing retriever / generator logic.
 */
class EmbeddingService {
  constructor() {
    this.model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
    this.baseUrl = String(process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL).replace(/\/$/, "");
    this.embedUrl = `${this.baseUrl}/embeddings`;
    this.apiKey = this.resolveApiKey();
    this.dimension = parseInt(process.env.PINECONE_DIMENSION, 10) || 1536;
    this.disabled = false;
    this.warned = false;
  }

  isConfigured() {
    return Boolean(this.apiKey) && !this.disabled;
  }

  resolveApiKey() {
    const explicit = String(process.env.OPENAI_API_KEY || "").trim();
    if (explicit) return explicit;

    // Never send OpenRouter keys to OpenAI endpoint. Only allow fallback when
    // caller explicitly points embeddings to an OpenRouter-compatible base URL.
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

  /**
   * @param {string} text
   * @returns {Promise<number[]|null>}
   */
  async embed(text) {
    const input = String(text || "").trim().slice(0, 8000);
    if (!input || !this.isConfigured()) return null;

    try {
      const response = await fetch(this.embedUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 401 || response.status === 403) {
          this.disableWithWarning(
            `EmbeddingService disabled due to auth failure (${response.status}). Set OPENAI_API_KEY for ${this.baseUrl}.`
          );
          return null;
        }
        console.warn("EmbeddingService.embed failed:", response.status, errText.slice(0, 200));
        return null;
      }

      const data = await response.json();
      return data?.data?.[0]?.embedding || null;
    } catch (err) {
      console.warn("EmbeddingService.embed error:", err.message);
      return null;
    }
  }

  /**
   * @param {string[]} texts
   * @returns {Promise<(number[]|null)[]>}
   */
  async embedBatch(texts) {
    const list = (texts || []).map((t) => String(t || "").trim().slice(0, 8000));
    if (!list.length || !this.isConfigured()) return list.map(() => null);

    try {
      const response = await fetch(this.embedUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: list,
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.disableWithWarning(
            `EmbeddingService disabled due to auth failure (${response.status}). Set OPENAI_API_KEY for ${this.baseUrl}.`
          );
          return list.map(() => null);
        }
        console.warn("EmbeddingService.embedBatch failed:", response.status);
        return list.map(() => null);
      }

      const data = await response.json();
      const byIndex = new Map((data?.data || []).map((row) => [row.index, row.embedding]));
      return list.map((_, i) => byIndex.get(i) || null);
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
