import crypto from "crypto";
import { QdrantClient } from "@qdrant/js-client-rest";
import { v5 as uuidv5 } from "uuid";
import { embeddingService } from "./embedding.service.js";

const DEFAULT_COLLECTION = process.env.QDRANT_COLLECTION || "notes_chunks";
/** Deterministic UUID namespace for Mongo ObjectId → Qdrant point id. */
const POINT_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function defaultVectorSize() {
  return (
    parseInt(process.env.QDRANT_VECTOR_SIZE || process.env.EMBEDDING_DIMENSION, 10) ||
    embeddingService.getDimension() ||
    1024
  );
}

class QdrantService {
  constructor() {
    this.client = null;
    this.collection = DEFAULT_COLLECTION;
  }

  getClient() {
    if (this.client) return this.client;
    const url = process.env.QDRANT_URL;
    if (!url) return null;
    this.client = new QdrantClient({
      url,
      apiKey: process.env.QDRANT_API_KEY || undefined,
    });
    return this.client;
  }

  isConfigured() {
    return Boolean(this.getClient());
  }

  getVectorSize() {
    return defaultVectorSize();
  }

  /** Stable UUID point id from Mongo chunk _id. */
  toPointId(chunkId) {
    return uuidv5(String(chunkId), POINT_NAMESPACE);
  }

  async getCollectionInfo() {
    const client = this.getClient();
    if (!client) return null;
    try {
      return await client.getCollection(this.collection);
    } catch {
      return null;
    }
  }

  /**
   * Ensure collection exists with the configured vector size.
   * If an existing collection has a mismatched size, recreate when QDRANT_RECREATE_ON_DIM_MISMATCH=true.
   */
  async ensureCollection() {
    const client = this.getClient();
    if (!client) return false;

    const wanted = this.getVectorSize();
    const existing = await this.getCollectionInfo();

    if (existing) {
      const vectorsCfg = existing?.config?.params?.vectors;
      const size =
        (typeof vectorsCfg?.size === "number" ? vectorsCfg.size : null) ??
        (vectorsCfg && typeof vectorsCfg === "object" && vectorsCfg[""]?.size) ??
        null;
      if (size && Number(size) !== Number(wanted)) {
        const recreate =
          String(process.env.QDRANT_RECREATE_ON_DIM_MISMATCH || "").toLowerCase() === "true";
        if (!recreate) {
          throw new Error(
            `Qdrant collection "${this.collection}" has vector size ${size}, but configured size is ${wanted}. ` +
              `Set QDRANT_VECTOR_SIZE=${size} or QDRANT_RECREATE_ON_DIM_MISMATCH=true to recreate.`
          );
        }
        console.warn(
          `[qdrant] Recreating collection ${this.collection}: size ${size} → ${wanted}`
        );
        await client.deleteCollection(this.collection);
      } else {
        return true;
      }
    }

    await client.createCollection(this.collection, {
      vectors: {
        size: wanted,
        distance: "Cosine",
      },
    });

    // Payload indexes for filtered RAG
    try {
      await client.createPayloadIndex(this.collection, {
        field_name: "topicId",
        field_schema: "keyword",
      });
      await client.createPayloadIndex(this.collection, {
        field_name: "sourceUrlId",
        field_schema: "keyword",
      });
      await client.createPayloadIndex(this.collection, {
        field_name: "subject",
        field_schema: "keyword",
      });
    } catch (err) {
      // Indexes may already exist
      console.warn("[qdrant] payload index:", err?.message || err);
    }

    return true;
  }

  /** @deprecated use ensureCollection */
  async createCollection() {
    return this.ensureCollection();
  }

  async upsertChunks({ chunks = [] }) {
    const client = this.getClient();
    if (!client || !chunks.length) return 0;
    await this.ensureCollection();

    const points = chunks
      .filter((c) => Array.isArray(c.vector) && c.vector.length)
      .map((c) => ({
        id: c.pointId || this.toPointId(c.id),
        vector: c.vector,
        payload: {
          ...(c.payload || {}),
          mongoChunkId: String(c.id),
        },
      }));

    if (!points.length) return 0;

    // Qdrant prefers batches; keep moderate size for HF rate limits upstream
    const batchSize = parseInt(process.env.QDRANT_UPSERT_BATCH || "64", 10) || 64;
    for (let i = 0; i < points.length; i += batchSize) {
      const slice = points.slice(i, i + batchSize);
      await client.upsert(this.collection, { wait: true, points: slice });
    }
    return points.length;
  }

  async searchChunks({ vector, topicId, sourceUrlId, subject, topK = 5 }) {
    const client = this.getClient();
    if (!client || !Array.isArray(vector) || !vector.length) return [];

    const must = [];
    if (topicId) must.push({ key: "topicId", match: { value: String(topicId) } });
    if (sourceUrlId) must.push({ key: "sourceUrlId", match: { value: String(sourceUrlId) } });
    if (subject) must.push({ key: "subject", match: { value: String(subject) } });

    const result = await client.search(this.collection, {
      vector,
      limit: topK,
      with_payload: true,
      filter: must.length ? { must } : undefined,
    });
    return result || [];
  }

  async deleteNoteChunks(topicId) {
    const client = this.getClient();
    if (!client || !topicId) return 0;
    await client.delete(this.collection, {
      wait: true,
      filter: {
        must: [{ key: "topicId", match: { value: String(topicId) } }],
      },
    });
    return 1;
  }

  async deleteChapterChunks(sourceUrlId) {
    const client = this.getClient();
    if (!client || !sourceUrlId) return 0;
    await client.delete(this.collection, {
      wait: true,
      filter: {
        must: [{ key: "sourceUrlId", match: { value: String(sourceUrlId) } }],
      },
    });
    return 1;
  }

  /**
   * Lightweight ping for admin stats.
   */
  async health() {
    const client = this.getClient();
    if (!client) return { ok: false, reason: "QDRANT_URL not set" };
    try {
      const info = await this.getCollectionInfo();
      return {
        ok: true,
        collection: this.collection,
        exists: Boolean(info),
        pointsCount: info?.points_count ?? info?.pointsCount ?? null,
        vectorSize: this.getVectorSize(),
      };
    } catch (err) {
      return { ok: false, reason: err.message || String(err) };
    }
  }
}

export function hashTexts(texts) {
  const h = crypto.createHash("sha256");
  for (const t of texts || []) {
    h.update(String(t || ""));
    h.update("\n");
  }
  return h.digest("hex");
}

export const qdrantService = new QdrantService();
export default qdrantService;
