/**
 * Qdrant collection manager for Knowledge Intelligence (separate from notes RAG).
 */

import { QdrantClient } from "@qdrant/js-client-rest";
import { v5 as uuidv5 } from "uuid";
import { embeddingService } from "../../services/ai/embedding.service.js";
import { getKnowledgeCollection } from "../utils/constants.js";
import { syncLogRepo } from "../repositories/index.js";

const POINT_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function normalizeDistance(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v.startsWith("dot")) return "Dot";
  if (v.startsWith("euc")) return "Euclid";
  return "Cosine";
}

class KnowledgeQdrantService {
  constructor() {
    this.client = null;
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

  getCollection() {
    return getKnowledgeCollection();
  }

  getVectorSize() {
    return (
      parseInt(process.env.QDRANT_VECTOR_SIZE || process.env.EMBEDDING_DIMENSION, 10) ||
      embeddingService.getDimension() ||
      1024
    );
  }

  toPointId(chunkId) {
    return uuidv5(`ki:${String(chunkId)}`, POINT_NAMESPACE);
  }

  async getCollectionInfo() {
    const client = this.getClient();
    if (!client) return null;
    try {
      return await client.getCollection(this.getCollection());
    } catch {
      return null;
    }
  }

  async ensureCollection() {
    const client = this.getClient();
    if (!client) return false;
    const name = this.getCollection();
    const wanted = this.getVectorSize();
    const distance = normalizeDistance(process.env.QDRANT_DISTANCE || "Cosine");
    const existing = await this.getCollectionInfo();

    if (!existing) {
      await client.createCollection(name, {
        vectors: { size: wanted, distance },
      });
      await syncLogRepo.create({
        action: "ensure_collection",
        status: "completed",
        collectionName: name,
        message: `Created collection size=${wanted}`,
      });
    }

    for (const field of ["documentId", "chunkId", "subject", "topic", "language", "year"]) {
      try {
        await client.createPayloadIndex(name, {
          field_name: field,
          field_schema: field === "year" ? "integer" : "keyword",
        });
      } catch {
        // already exists
      }
    }
    return true;
  }

  async upsertPoints(points = []) {
    const client = this.getClient();
    if (!client || !points.length) return 0;
    await this.ensureCollection();
    const name = this.getCollection();
    const batchSize = parseInt(process.env.QDRANT_UPSERT_BATCH || "64", 10) || 64;
    let count = 0;
    for (let i = 0; i < points.length; i += batchSize) {
      const slice = points.slice(i, i + batchSize);
      await client.upsert(name, { wait: true, points: slice });
      count += slice.length;
    }
    return count;
  }

  async deleteByDocumentId(documentId) {
    const client = this.getClient();
    if (!client || !documentId) return;
    await client.delete(this.getCollection(), {
      wait: true,
      filter: {
        must: [{ key: "documentId", match: { value: String(documentId) } }],
      },
    });
  }

  async deletePoint(pointId) {
    const client = this.getClient();
    if (!client || !pointId) return;
    await client.delete(this.getCollection(), {
      wait: true,
      points: [pointId],
    });
  }

  async updatePayload(pointId, payload) {
    const client = this.getClient();
    if (!client || !pointId) return;
    await client.setPayload(this.getCollection(), {
      wait: true,
      payload,
      points: [pointId],
    });
  }

  async search({ vector, filters = {}, topK = 10 }) {
    const client = this.getClient();
    if (!client || !Array.isArray(vector) || !vector.length) return [];

    const must = [];
    // Accept alias family (Ancient History ↔ History) so syllabus labels still hit generic KB uploads
    const subjectAliases = [
      ...(Array.isArray(filters.subjectAliases) ? filters.subjectAliases : []),
      ...(filters.subject ? [filters.subject] : []),
    ]
      .map((s) => String(s || "").trim())
      .filter(Boolean);
    const uniqueSubjects = [...new Set(subjectAliases)];
    if (uniqueSubjects.length > 1) {
      must.push({ key: "subject", match: { any: uniqueSubjects } });
    } else if (uniqueSubjects.length === 1) {
      must.push({ key: "subject", match: { value: uniqueSubjects[0] } });
    }
    if (filters.chapter) must.push({ key: "chapter", match: { value: String(filters.chapter) } });
    if (filters.topic) must.push({ key: "topic", match: { value: String(filters.topic) } });
    if (filters.language) must.push({ key: "language", match: { value: String(filters.language) } });
    if (filters.source) must.push({ key: "source", match: { value: String(filters.source) } });
    if (filters.difficulty) must.push({ key: "difficulty", match: { value: String(filters.difficulty) } });
    if (filters.year != null) must.push({ key: "year", match: { value: Number(filters.year) } });
    if (filters.documentId) {
      must.push({ key: "documentId", match: { value: String(filters.documentId) } });
    }

    return (
      (await client.search(this.getCollection(), {
        vector,
        limit: topK,
        with_payload: true,
        filter: must.length ? { must } : undefined,
      })) || []
    );
  }

  async health() {
    const client = this.getClient();
    if (!client) return { ok: false, configured: false, message: "QDRANT_URL not set" };
    try {
      await this.ensureCollection();
      const info = await this.getCollectionInfo();
      return {
        ok: true,
        configured: true,
        collection: this.getCollection(),
        pointsCount: info?.points_count ?? info?.pointsCount ?? null,
        vectorSize: this.getVectorSize(),
      };
    } catch (err) {
      return {
        ok: false,
        configured: true,
        collection: this.getCollection(),
        message: err?.message || "Qdrant health failed",
      };
    }
  }

  async deleteCollection() {
    const client = this.getClient();
    if (!client) return false;
    await client.deleteCollection(this.getCollection());
    return true;
  }
}

export const knowledgeQdrant = new KnowledgeQdrantService();
export default knowledgeQdrant;
