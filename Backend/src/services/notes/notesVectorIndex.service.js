/**
 * Hash-gated embedding + Qdrant indexing for notes/PDF chunks (Step 3).
 * Embeddings are generated only when chunk content hashes change (unless force).
 */

import ContentChunk from "../../models/ContentChunk.js";
import ContentTopic from "../../models/ContentTopic.js";
import SourceUrl from "../../models/SourceUrl.js";
import { embeddingService } from "../ai/embedding.service.js";
import { qdrantService, hashTexts } from "../ai/qdrant.service.js";

const EMBED_BATCH = parseInt(process.env.EMBEDDING_BATCH_SIZE, 10) || 8;

function isReady() {
  return embeddingService.isConfigured() && qdrantService.isConfigured();
}

/**
 * Index a single topic's chunks into Qdrant.
 * @returns {Promise<{ indexed: number, skipped: boolean, reason?: string }>}
 */
export async function indexTopicInVectorDb(topicId, opts = {}) {
  if (!isReady()) {
    return {
      indexed: 0,
      skipped: true,
      reason: "Embedding or Qdrant not configured",
    };
  }

  const topic = await ContentTopic.findById(topicId).lean();
  if (!topic) throw new Error("Topic not found");

  const chunks = await ContentChunk.find({ topicId }).sort({ order: 1 }).lean();
  if (!chunks.length) {
    return { indexed: 0, skipped: true, reason: "No chunks" };
  }

  const contentHash = hashTexts(chunks.map((c) => c.text));
  const modelName = embeddingService.getModelName();

  // Per-topic skip: all chunks already stamped with same model + matching chapter-level handling is separate
  const already =
    !opts.force &&
    chunks.every(
      (c) =>
        c.embeddingModel === modelName &&
        c.embeddedAt &&
        c.embeddingHash === contentHash
    );
  if (already) {
    return { indexed: 0, skipped: true, reason: "Topic embeddings unchanged" };
  }

  await qdrantService.deleteNoteChunks(String(topicId));

  const vectors = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const slice = chunks.slice(i, i + EMBED_BATCH);
    const batchVectors = await embeddingService.generateBatchEmbeddings(
      slice.map((c) => c.text),
      { task: "passage" }
    );
    vectors.push(...batchVectors);
  }

  const upsertRows = [];
  const now = new Date();
  const stampIds = [];

  for (let idx = 0; idx < chunks.length; idx += 1) {
    const chunk = chunks[idx];
    const vector = vectors[idx];
    if (!Array.isArray(vector) || !vector.length) continue;

    upsertRows.push({
      id: chunk._id.toString(),
      vector,
      payload: {
        topicId: String(chunk.topicId),
        sourceUrlId: String(chunk.sourceUrlId),
        subject: topic.subject || "",
        order: chunk.order,
        heading: chunk.heading || "",
        text: chunk.text || "",
        sourceUrl: chunk.sourceUrl || "",
        tokenCount: chunk.tokenCount || 0,
        page: chunk.page ?? null,
        subTopic: chunk.subTopic || "",
        chunkNumber: chunk.chunkNumber ?? chunk.order + 1,
        source: chunk.source || "notes",
        embeddingModel: modelName,
      },
    });
    stampIds.push(chunk._id);
  }

  const inserted = await qdrantService.upsertChunks({ chunks: upsertRows });

  if (stampIds.length) {
    await ContentChunk.updateMany(
      { _id: { $in: stampIds } },
      {
        $set: {
          embeddedAt: now,
          embeddingModel: modelName,
          embeddingHash: contentHash,
        },
      }
    );
  }

  if (inserted > 0) {
    console.log(
      `🧠 Qdrant indexed ${inserted}/${chunks.length} chunks for topic ${topicId} (${modelName})`
    );
  }

  return {
    indexed: inserted,
    skipped: inserted === 0,
    reason: inserted === 0 ? "No vectors produced" : undefined,
    model: modelName,
  };
}

/**
 * Index all topics under a chapter. Skips when chapter embeddingHash matches
 * current chunk texts unless force=true.
 */
export async function indexChapterInVectorDb(chapterId, opts = {}) {
  const force = Boolean(opts.force);
  const chapter = await SourceUrl.findById(chapterId);
  if (!chapter) throw new Error("Chapter not found");

  if (!isReady()) {
    chapter.embeddingStatus = "skipped";
    chapter.embeddingError =
      "Set QDRANT_URL and JINA_API_KEY (or other EMBEDDING_PROVIDER credentials)";
    await chapter.save();
    return {
      chapterId: chapter._id,
      skipped: true,
      reason: chapter.embeddingError,
      indexed: 0,
      topics: 0,
    };
  }

  const chunks = await ContentChunk.find({ sourceUrlId: chapter._id })
    .select("text")
    .sort({ topicId: 1, order: 1 })
    .lean();

  if (!chunks.length) {
    chapter.embeddingStatus = "skipped";
    chapter.embeddingError = "No chunks to embed";
    await chapter.save();
    return {
      chapterId: chapter._id,
      skipped: true,
      reason: "No chunks to embed",
      indexed: 0,
      topics: 0,
    };
  }

  const contentHash = hashTexts(chunks.map((c) => c.text));
  const modelName = embeddingService.getModelName();

  if (
    !force &&
    chapter.embeddingHash === contentHash &&
    chapter.embeddingModel === modelName &&
    chapter.embeddingStatus === "indexed"
  ) {
    return {
      chapterId: chapter._id,
      skipped: true,
      reason: "Embeddings already up to date (content unchanged)",
      indexed: 0,
      topics: 0,
      embeddingHash: contentHash,
      model: modelName,
    };
  }

  chapter.embeddingStatus = "indexing";
  chapter.embeddingError = null;
  await chapter.save();

  try {
    const topics = await ContentTopic.find({ sourceUrlId: chapter._id }).select("_id").lean();
    let indexed = 0;
    const topicResults = [];

    for (const t of topics) {
      const result = await indexTopicInVectorDb(t._id, { force: true });
      indexed += result.indexed || 0;
      topicResults.push({ topicId: t._id, ...result });
    }

    chapter.embeddingHash = contentHash;
    chapter.embeddingModel = modelName;
    chapter.embeddingsIndexedAt = new Date();
    chapter.embeddingStatus = indexed > 0 ? "indexed" : "failed";
    chapter.embeddingError = indexed > 0 ? null : "No vectors were upserted";
    await chapter.save();

    return {
      chapterId: chapter._id,
      skipped: false,
      indexed,
      topics: topics.length,
      embeddingHash: contentHash,
      model: modelName,
      status: chapter.embeddingStatus,
      topicResults,
    };
  } catch (err) {
    chapter.embeddingStatus = "failed";
    chapter.embeddingError = err.message || String(err);
    await chapter.save();
    throw err;
  }
}

export const notesVectorIndexService = {
  indexTopicInVectorDb,
  indexChapterInVectorDb,
  isReady,
};
