import { QdrantClient } from "@qdrant/js-client-rest";

const DEFAULT_COLLECTION = process.env.QDRANT_COLLECTION || "notes_chunks";
const VECTOR_SIZE = parseInt(process.env.QDRANT_VECTOR_SIZE || process.env.PINECONE_DIMENSION, 10) || 1536;

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

  async createCollection() {
    const client = this.getClient();
    if (!client) return false;
    try {
      await client.getCollection(this.collection);
      return true;
    } catch {
      await client.createCollection(this.collection, {
        vectors: {
          size: VECTOR_SIZE,
          distance: "Cosine",
        },
      });
      return true;
    }
  }

  async upsertChunks({ chunks = [] }) {
    const client = this.getClient();
    if (!client || !chunks.length) return 0;
    await this.createCollection();
    const points = chunks
      .filter((c) => Array.isArray(c.vector) && c.vector.length)
      .map((c) => ({
        id: String(c.id),
        vector: c.vector,
        payload: c.payload || {},
      }));
    if (!points.length) return 0;
    await client.upsert(this.collection, { wait: false, points });
    return points.length;
  }

  async searchChunks({ vector, topicId, topK = 5 }) {
    const client = this.getClient();
    if (!client || !Array.isArray(vector) || !vector.length) return [];
    const result = await client.search(this.collection, {
      vector,
      limit: topK,
      with_payload: true,
      filter: topicId
        ? {
            must: [{ key: "topicId", match: { value: String(topicId) } }],
          }
        : undefined,
    });
    return result || [];
  }

  async deleteNoteChunks(topicId) {
    const client = this.getClient();
    if (!client || !topicId) return 0;
    await client.delete(this.collection, {
      wait: false,
      filter: {
        must: [{ key: "topicId", match: { value: String(topicId) } }],
      },
    });
    return 1;
  }
}

export const qdrantService = new QdrantService();
export default qdrantService;
