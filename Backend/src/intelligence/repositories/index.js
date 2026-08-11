import EmbeddingRecord from "../models/EmbeddingRecord.js";
import VectorSyncLog from "../models/VectorSyncLog.js";
import SearchLog from "../models/SearchLog.js";
import KeywordIndex from "../models/KeywordIndex.js";

export const embeddingRepo = {
  findByChunk: (chunkId) => EmbeddingRecord.findOne({ chunkId }),
  findById: (id) => EmbeddingRecord.findById(id),
  upsertForChunk: (chunkId, data) =>
    EmbeddingRecord.findOneAndUpdate(
      { chunkId },
      { $set: data },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),
  update: (id, data) => EmbeddingRecord.findByIdAndUpdate(id, data, { new: true }),
  list: (filter = {}, { page = 1, limit = 20 } = {}) =>
    Promise.all([
      EmbeddingRecord.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      EmbeddingRecord.countDocuments(filter),
    ]),
  stats: async () => {
    const [agg] = await EmbeddingRecord.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
          queued: { $sum: { $cond: [{ $eq: ["$status", "Queued"] }, 1, 0] } },
          generating: {
            $sum: { $cond: [{ $eq: ["$status", "Generating"] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
          },
          failed: { $sum: { $cond: [{ $eq: ["$status", "Failed"] }, 1, 0] } },
          synced: { $sum: { $cond: ["$qdrantSynced", 1, 0] } },
        },
      },
    ]);
    return (
      agg || {
        total: 0,
        pending: 0,
        queued: 0,
        generating: 0,
        completed: 0,
        failed: 0,
        synced: 0,
      }
    );
  },
  findFailed: (limit = 50) =>
    EmbeddingRecord.find({ status: "Failed" }).sort({ updatedAt: -1 }).limit(limit).lean(),
  findByDocument: (documentId) => EmbeddingRecord.find({ documentId }).lean(),
  deleteByDocument: (documentId) => EmbeddingRecord.deleteMany({ documentId }),
  deleteByChunkIds: (chunkIds) =>
    EmbeddingRecord.deleteMany({ chunkId: { $in: chunkIds } }),
};

export const syncLogRepo = {
  create: (data) => VectorSyncLog.create(data),
  list: (filter = {}, limit = 50) =>
    VectorSyncLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
};

export const searchLogRepo = {
  create: (data) => SearchLog.create(data),
  history: (userId, limit = 50) => {
    const filter = userId ? { userId } : {};
    return SearchLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  },
};

export const keywordRepo = {
  deleteByChunk: (chunkId) => KeywordIndex.deleteMany({ chunkId }),
  deleteByDocument: (documentId) => KeywordIndex.deleteMany({ documentId }),
  insertMany: (docs) => (docs.length ? KeywordIndex.insertMany(docs, { ordered: false }).catch((e) => {
    if (e?.code !== 11000) throw e;
  }) : Promise.resolve()),
  searchTerms: async (terms, { subject, subjects, limit = 40 } = {}) => {
    const filter = { term: { $in: terms.map((t) => t.toLowerCase()) } };
    const list = Array.isArray(subjects) && subjects.length
      ? subjects.map((s) => String(s || "").trim()).filter(Boolean)
      : subject
        ? [String(subject).trim()].filter(Boolean)
        : [];
    if (list.length > 1) filter.subject = { $in: list };
    else if (list.length === 1) filter.subject = list[0];
    const rows = await KeywordIndex.find(filter).limit(500).lean();
    const byChunk = new Map();
    for (const row of rows) {
      const id = String(row.chunkId);
      const prev = byChunk.get(id) || {
        chunkId: row.chunkId,
        documentId: row.documentId,
        score: 0,
        subject: row.subject,
        chapter: row.chapter,
        topic: row.topic,
        page: row.page,
      };
      prev.score += row.tf || 1;
      byChunk.set(id, prev);
    }
    return [...byChunk.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },
};
