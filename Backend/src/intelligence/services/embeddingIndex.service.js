import crypto from "crypto";
import { embeddingService } from "../../services/ai/embedding.service.js";
import DocumentChunk from "../../processing/models/DocumentChunk.js";
import KbDocument from "../../knowledge/models/KbDocument.js";
import { buildEmbeddingPayload, extractKeywords } from "../utils/payloadBuilder.js";
import { embeddingRepo, keywordRepo, syncLogRepo } from "../repositories/index.js";
import { knowledgeQdrant } from "./qdrantKnowledge.service.js";
import { cacheGet, cacheSet, cacheKey } from "./searchCache.service.js";

function hashText(text) {
  return crypto.createHash("sha256").update(String(text || "")).digest("hex");
}

function storeVectorsEnabled() {
  return String(process.env.INTEL_STORE_VECTORS || "").toLowerCase() === "true";
}

/**
 * Index all chunks for a processed document into embeddings + Qdrant + keyword index.
 */
export async function indexProcessedDocument(processedDocumentId) {
  if (!embeddingService.isConfigured()) {
    return {
      ok: false,
      skipped: true,
      reason: "Embedding provider not configured (OPENAI_API_KEY / OPENROUTER_API_KEY / EMBEDDING_PROVIDER)",
    };
  }
  if (!knowledgeQdrant.isConfigured()) {
    return {
      ok: false,
      skipped: true,
      reason: "Qdrant not configured (QDRANT_URL)",
    };
  }

  const chunks = await DocumentChunk.find({
    processedDocumentId,
    isDuplicate: { $ne: true },
  })
    .sort({ chunkOrder: 1 })
    .lean();

  if (!chunks.length) {
    return { ok: true, indexed: 0, message: "No chunks to embed" };
  }

  const kb = await KbDocument.findById(chunks[0].documentId).lean();
  const batchSize = parseInt(process.env.EMBEDDING_BATCH_SIZE, 10) || 4;
  let indexed = 0;
  let failed = 0;
  const points = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const payloads = batch.map((c) => {
      const keywords = extractKeywords(c.chunkText);
      const embeddingText = buildEmbeddingPayload({
        title: kb?.title || "",
        subject: c.subject || "",
        chapter: c.chapter || "",
        topic: c.topic || "",
        heading: c.topic || "",
        chunkText: c.chunkText,
        keywords,
        explanation: "",
        source: kb?.sourceLabel || kb?.publication || "",
      });
      return { chunk: c, keywords, embeddingText, embeddingHash: hashText(embeddingText) };
    });

    // Skip unchanged
    const toEmbed = [];
    for (const row of payloads) {
      const existing = await embeddingRepo.findByChunk(row.chunk._id);
      if (
        existing &&
        existing.status === "Completed" &&
        existing.embeddingHash === row.embeddingHash &&
        existing.qdrantSynced
      ) {
        indexed += 1;
        continue;
      }
      await embeddingRepo.upsertForChunk(row.chunk._id, {
        documentId: row.chunk.documentId,
        processedDocumentId,
        chunkId: row.chunk._id,
        embeddingText: row.embeddingText,
        embeddingHash: row.embeddingHash,
        status: "Generating",
        subject: row.chunk.subject || "",
        chapter: row.chunk.chapter || "",
        topic: row.chunk.topic || "",
        source: kb?.sourceLabel || "",
        year: kb?.year ?? null,
        difficulty: kb?.difficulty || "",
        language: kb?.language || "English",
        tags: kb?.tags || row.keywords,
        page: row.chunk.page,
        chunkOrder: row.chunk.chunkOrder,
        provider: embeddingService.getProvider(),
        model: embeddingService.getModelName(),
        errorMessage: null,
      });
      toEmbed.push(row);
    }

    if (!toEmbed.length) continue;

    let vectors = [];
    try {
      vectors = await embeddingService.generateBatchEmbeddings(
        toEmbed.map((r) => r.embeddingText),
        { task: "passage" }
      );
    } catch (err) {
      for (const row of toEmbed) {
        failed += 1;
        await embeddingRepo.upsertForChunk(row.chunk._id, {
          status: "Failed",
          errorMessage: err?.message || "Embedding failed",
        });
      }
      continue;
    }

    for (let j = 0; j < toEmbed.length; j += 1) {
      const row = toEmbed[j];
      const vector = vectors[j];
      if (!Array.isArray(vector) || !vector.length) {
        failed += 1;
        await embeddingRepo.upsertForChunk(row.chunk._id, {
          status: "Failed",
          errorMessage: "Empty vector",
        });
        continue;
      }

      const pointId = knowledgeQdrant.toPointId(row.chunk._id);
      const update = {
        status: "Completed",
        dimensions: vector.length,
        qdrantPointId: pointId,
        qdrantSynced: false,
        generatedAt: new Date(),
        provider: embeddingService.getProvider(),
        model: embeddingService.getModelName(),
        errorMessage: null,
      };
      if (storeVectorsEnabled()) update.vector = vector;

      const rec = await embeddingRepo.upsertForChunk(row.chunk._id, update);

      points.push({
        id: pointId,
        vector,
        payload: {
          documentId: String(row.chunk.documentId),
          chunkId: String(row.chunk._id),
          processedDocumentId: String(processedDocumentId),
          embeddingId: String(rec._id),
          subject: row.chunk.subject || "",
          chapter: row.chunk.chapter || "",
          topic: row.chunk.topic || "",
          source: kb?.sourceLabel || "",
          year: kb?.year ?? null,
          difficulty: kb?.difficulty || "",
          language: kb?.language || "English",
          tags: kb?.tags || row.keywords,
          page: row.chunk.page,
          chunkText: String(row.chunk.chunkText || "").slice(0, 1200),
          title: kb?.title || "",
        },
      });

      // keyword index
      await keywordRepo.deleteByChunk(row.chunk._id);
      const terms = [...new Set([...row.keywords, ...extractKeywords(row.embeddingText, 20)])];
      await keywordRepo.insertMany(
        terms.map((term) => ({
          term,
          chunkId: row.chunk._id,
          documentId: row.chunk.documentId,
          processedDocumentId,
          tf: 1,
          subject: row.chunk.subject || "",
          chapter: row.chunk.chapter || "",
          topic: row.chunk.topic || "",
          page: row.chunk.page,
        }))
      );

      indexed += 1;
    }
  }

  if (points.length) {
    const started = Date.now();
    try {
      await knowledgeQdrant.upsertPoints(points);
      for (const p of points) {
        await embeddingRepo.upsertForChunk(p.payload.chunkId, {
          qdrantSynced: true,
          qdrantSyncedAt: new Date(),
          qdrantPointId: p.id,
          status: "Completed",
        });
      }
      await syncLogRepo.create({
        processedDocumentId,
        documentId: chunks[0].documentId,
        action: "sync",
        status: "completed",
        collectionName: knowledgeQdrant.getCollection(),
        message: `Upserted ${points.length} points`,
        durationMs: Date.now() - started,
      });
    } catch (err) {
      await syncLogRepo.create({
        processedDocumentId,
        documentId: chunks[0].documentId,
        action: "sync",
        status: "failed",
        collectionName: knowledgeQdrant.getCollection(),
        errorMessage: err?.message || "Qdrant upsert failed",
        durationMs: Date.now() - started,
      });
      throw err;
    }
  }

  // Update DocumentChunk embeddingStatus
  await DocumentChunk.updateMany(
    { processedDocumentId, isDuplicate: { $ne: true } },
    { $set: { embeddingStatus: "completed" } }
  );

  return { ok: true, indexed, failed, points: points.length };
}

export async function embedQuery(query) {
  const key = cacheKey(["qemb", query]);
  const cached = await cacheGet(key);
  if (cached) return cached;
  const vector = await embeddingService.generateEmbedding(query, { task: "query" });
  if (vector) await cacheSet(key, vector, 10 * 60 * 1000);
  return vector;
}

export async function deleteDocumentVectors(documentId) {
  await knowledgeQdrant.deleteByDocumentId(documentId);
  await embeddingRepo.deleteByDocument(documentId);
  await keywordRepo.deleteByDocument(documentId);
  await syncLogRepo.create({
    documentId,
    action: "delete",
    status: "completed",
    collectionName: knowledgeQdrant.getCollection(),
    message: "Deleted document vectors",
  });
}

export async function retryFailedEmbeddings({ documentId, limit = 50 } = {}) {
  const filter = { status: "Failed" };
  if (documentId) filter.documentId = documentId;
  const failed = await EmbeddingRecordFind(filter, limit);
  const byProcessed = new Map();
  for (const row of failed) {
    const pid = String(row.processedDocumentId || "");
    if (!pid) continue;
    byProcessed.set(pid, true);
  }
  const results = [];
  for (const pid of byProcessed.keys()) {
    results.push(await indexProcessedDocument(pid));
  }
  return results;
}

async function EmbeddingRecordFind(filter, limit) {
  const EmbeddingRecord = (await import("../models/EmbeddingRecord.js")).default;
  return EmbeddingRecord.find(filter).limit(limit).lean();
}
