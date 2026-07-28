import ProcessedDocument from "../models/ProcessedDocument.js";
import DocumentPage from "../models/DocumentPage.js";
import DocumentSection from "../models/DocumentSection.js";
import DocumentChunk from "../models/DocumentChunk.js";
import ExtractedQuestion from "../models/ExtractedQuestion.js";
import QuestionOption from "../models/QuestionOption.js";
import QuestionAnswer from "../models/QuestionAnswer.js";
import ProcessingLog from "../models/ProcessingLog.js";
import ProcessingError from "../models/ProcessingError.js";
import { STAGE_PROGRESS } from "../utils/constants.js";
import { durationMs } from "../utils/helpers.js";

export const processedDocRepo = {
  findByDocumentId: (documentId) =>
    ProcessedDocument.findOne({ documentId, isDeleted: false }),
  findById: (id) => ProcessedDocument.findOne({ _id: id, isDeleted: false }),
  create: (data) => ProcessedDocument.create(data),
  update: (id, data) =>
    ProcessedDocument.findByIdAndUpdate(id, data, { new: true }),
  setStage: async (id, stage, extra = {}) =>
    ProcessedDocument.findByIdAndUpdate(
      id,
      {
        $set: {
          stage,
          progress: STAGE_PROGRESS[stage] ?? extra.progress,
          ...extra,
        },
      },
      { new: true }
    ),
  list: (filter = {}, { page = 1, limit = 20 } = {}) => {
    const q = { isDeleted: false, ...filter };
    return Promise.all([
      ProcessedDocument.find(q)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ProcessedDocument.countDocuments(q),
    ]);
  },
  stats: async () => {
    const [agg] = await ProcessedDocument.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          queued: { $sum: { $cond: [{ $eq: ["$status", "queued"] }, 1, 0] } },
          running: { $sum: { $cond: [{ $eq: ["$status", "running"] }, 1, 0] } },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          retrying: {
            $sum: { $cond: [{ $eq: ["$status", "retrying"] }, 1, 0] },
          },
        },
      },
    ]);
    return (
      agg || {
        total: 0,
        queued: 0,
        running: 0,
        completed: 0,
        failed: 0,
        retrying: 0,
      }
    );
  },
};

export const pageRepo = {
  deleteByProcessed: (processedDocumentId) =>
    DocumentPage.deleteMany({ processedDocumentId }),
  insertMany: (docs) => DocumentPage.insertMany(docs),
  findByProcessed: (processedDocumentId) =>
    DocumentPage.find({ processedDocumentId }).sort({ pageNumber: 1 }).lean(),
};

export const sectionRepo = {
  deleteByProcessed: (processedDocumentId) =>
    DocumentSection.deleteMany({ processedDocumentId }),
  insertMany: (docs) => DocumentSection.insertMany(docs),
  findByProcessed: (processedDocumentId) =>
    DocumentSection.find({ processedDocumentId }).sort({ order: 1 }).lean(),
};

export const chunkRepo = {
  deleteByProcessed: (processedDocumentId) =>
    DocumentChunk.deleteMany({ processedDocumentId }),
  insertMany: (docs) => DocumentChunk.insertMany(docs),
  findRecentHashes: (hashes) =>
    DocumentChunk.find({ chunkHash: { $in: hashes }, isDuplicate: false })
      .select("_id chunkHash chunkText")
      .limit(500)
      .lean(),
  countByProcessed: (processedDocumentId) =>
    DocumentChunk.countDocuments({ processedDocumentId }),
};

export const questionRepo = {
  deleteByProcessed: async (processedDocumentId) => {
    const qs = await ExtractedQuestion.find({ processedDocumentId }).select("_id");
    const ids = qs.map((q) => q._id);
    await QuestionOption.deleteMany({ questionId: { $in: ids } });
    await QuestionAnswer.deleteMany({ questionId: { $in: ids } });
    await ExtractedQuestion.deleteMany({ processedDocumentId });
  },
  createWithRelations: async (questionDoc) => {
    const q = await ExtractedQuestion.create(questionDoc);
    if (questionDoc.options?.length) {
      await QuestionOption.insertMany(
        questionDoc.options.map((o, i) => ({
          questionId: q._id,
          processedDocumentId: questionDoc.processedDocumentId,
          label: o.label,
          text: o.text,
          isCorrect: Boolean(o.isCorrect),
          order: i,
        }))
      );
    }
    if (questionDoc.correctAnswer || questionDoc.explanation) {
      await QuestionAnswer.create({
        questionId: q._id,
        processedDocumentId: questionDoc.processedDocumentId,
        correctAnswer: questionDoc.correctAnswer || "",
        explanation: questionDoc.explanation || "",
      });
    }
    return q;
  },
  findByHash: (hash) =>
    ExtractedQuestion.findOne({ questionHash: hash, isDuplicate: false }),
  countByProcessed: (processedDocumentId) =>
    ExtractedQuestion.countDocuments({ processedDocumentId }),
};

export const logRepo = {
  start: async ({
    processedDocumentId,
    documentId,
    stage,
    workerName,
    queueName,
    jobId,
    message,
  }) =>
    ProcessingLog.create({
      processedDocumentId,
      documentId,
      stage,
      workerName,
      queueName,
      jobId,
      status: "started",
      message: message || `${workerName} started`,
      startedAt: new Date(),
    }),
  complete: async (logId, { message, meta } = {}) => {
    const log = await ProcessingLog.findById(logId);
    if (!log) return null;
    log.status = "completed";
    log.completedAt = new Date();
    log.duration = durationMs(log.startedAt);
    if (message) log.message = message;
    if (meta) log.meta = meta;
    await log.save();
    return log;
  },
  fail: async (logId, errorMessage) => {
    const log = await ProcessingLog.findById(logId);
    if (!log) return null;
    log.status = "failed";
    log.completedAt = new Date();
    log.duration = durationMs(log.startedAt);
    log.errorMessage = errorMessage;
    await log.save();
    return log;
  },
  listByDocument: (documentId, limit = 100) =>
    ProcessingLog.find({ documentId }).sort({ createdAt: -1 }).limit(limit).lean(),
  listByProcessed: (processedDocumentId, limit = 100) =>
    ProcessingLog.find({ processedDocumentId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
};

export const errorRepo = {
  create: (data) => ProcessingError.create(data),
  listByDocument: (documentId, limit = 50) =>
    ProcessingError.find({ documentId }).sort({ createdAt: -1 }).limit(limit).lean(),
  listByProcessed: (processedDocumentId, limit = 50) =>
    ProcessingError.find({ processedDocumentId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
  resolveForDocument: (processedDocumentId) =>
    ProcessingError.updateMany(
      { processedDocumentId, resolved: false },
      { resolved: true, resolvedAt: new Date() }
    ),
};
