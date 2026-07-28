import mongoose from "mongoose";
import KbDocument from "../models/KbDocument.js";
import { documentRepo } from "../repositories/index.js";
import { listQuerySchema, bulkActionSchema } from "../validators/knowledge.validators.js";
import { removeDocument, retryDocumentUpload } from "./upload.service.js";
import { uniqueSlug } from "../utils/slugify.js";
import { checkS3Health } from "./s3.service.js";

const POPULATE = [
  { path: "subjectId", select: "name slug" },
  { path: "chapterId", select: "name slug" },
  { path: "topicId", select: "name slug" },
  { path: "categoryId", select: "name slug color" },
  { path: "sourceId", select: "name publication" },
  { path: "uploadedBy", select: "name email" },
];

export async function listDocuments(query) {
  const params = listQuerySchema.parse(query || {});
  const filter = { isDeleted: false };

  if (params.subjectId) filter.subjectId = params.subjectId;
  if (params.chapterId) filter.chapterId = params.chapterId;
  if (params.topicId) filter.topicId = params.topicId;
  if (params.categoryId) filter.categoryId = params.categoryId;
  if (params.status) filter.status = params.status;
  if (params.processingStatus) filter.processingStatus = params.processingStatus;
  if (params.year) filter.year = params.year;
  if (params.language) filter.language = params.language;

  if (params.q) {
    filter.$or = [
      { title: new RegExp(params.q, "i") },
      { description: new RegExp(params.q, "i") },
      { originalFileName: new RegExp(params.q, "i") },
      { tags: new RegExp(params.q, "i") },
    ];
  }

  const sortField = ["title", "year", "fileSize", "createdAt", "updatedAt", "processingStatus"].includes(
    params.sort
  )
    ? params.sort
    : "createdAt";
  const sort = { [sortField]: params.order === "asc" ? 1 : -1 };

  const skip = (params.page - 1) * params.limit;
  const [items, total] = await Promise.all([
    KbDocument.find(filter)
      .populate(POPULATE)
      .sort(sort)
      .skip(skip)
      .limit(params.limit)
      .lean(),
    KbDocument.countDocuments(filter),
  ]);

  return {
    items,
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
  };
}

export async function getDocument(id) {
  const doc = await documentRepo.findById(id);
  if (!doc) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
  return doc;
}

export async function updateDocument(id, body) {
  const existing = await KbDocument.findOne({ _id: id, isDeleted: false });
  if (!existing) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }

  const allowed = [
    "title",
    "description",
    "subjectId",
    "chapterId",
    "topicId",
    "categoryId",
    "sourceId",
    "tags",
    "language",
    "year",
    "publication",
    "sourceLabel",
    "difficulty",
    "contentType",
    "priority",
    "status",
  ];

  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key] === "" ? null : body[key];
    }
  }

  if (updates.title && updates.title !== existing.title) {
    updates.slug = await uniqueSlug(KbDocument, updates.title, {
      _id: { $ne: existing._id },
    });
  }

  await KbDocument.findByIdAndUpdate(id, { $set: updates });
  return documentRepo.findById(id);
}

export async function archiveDocuments(ids) {
  await documentRepo.updateMany(ids, { status: "archived" });
  return { archived: ids.length };
}

export async function bulkAction(body) {
  const parsed = bulkActionSchema.parse(body);
  const { ids, action } = parsed;

  switch (action) {
    case "delete": {
      for (const id of ids) {
        await removeDocument(id);
      }
      return { deleted: ids.length };
    }
    case "archive":
      return archiveDocuments(ids);
    case "retry": {
      const results = [];
      for (const id of ids) {
        results.push(await retryDocumentUpload(id));
      }
      return { retried: results.length, items: results };
    }
    case "changeCategory":
      await documentRepo.updateMany(ids, { categoryId: parsed.categoryId || null });
      return { updated: ids.length };
    case "changeSubject":
    case "move":
      await documentRepo.updateMany(ids, {
        subjectId: parsed.subjectId || null,
        ...(parsed.chapterId !== undefined ? { chapterId: parsed.chapterId || null } : {}),
        ...(parsed.topicId !== undefined ? { topicId: parsed.topicId || null } : {}),
        ...(parsed.categoryId !== undefined ? { categoryId: parsed.categoryId || null } : {}),
      });
      return { updated: ids.length };
    default: {
      const err = new Error("Unknown bulk action");
      err.statusCode = 400;
      throw err;
    }
  }
}

export async function getDashboardStats() {
  const [agg] = await documentRepo.aggregateStats();
  const byCategory = await KbDocument.aggregate([
    { $match: { isDeleted: false, categoryId: { $ne: null } } },
    { $group: { _id: "$categoryId", count: { $sum: 1 } } },
  ]);

  const notesCategoryIds = byCategory; // kept for UI breakdown if needed
  const recent = await KbDocument.find({ isDeleted: false })
    .populate(POPULATE)
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  const s3 = await checkS3Health();

  const stats = agg || {
    total: 0,
    storageUsed: 0,
    pending: 0,
    queued: 0,
    uploading: 0,
    uploaded: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    pdfs: 0,
  };

  // Notes approx = non-PDF docs or category named Notes — keep simple: total - pdfs
  const notes = Math.max(0, (stats.total || 0) - (stats.pdfs || 0));
  const pyqs = 0; // filled when category filter used on frontend; optional count:
  const pyqCount = await KbDocument.countDocuments({
    isDeleted: false,
    // populated name not available in count — skip, UI can filter
  });

  void notesCategoryIds;
  void pyqCount;

  return {
    totalDocuments: stats.total || 0,
    totalPdfs: stats.pdfs || 0,
    totalNotes: notes,
    totalPyqs: await countByCategorySlug("pyq"),
    processingDocuments:
      (stats.processing || 0) + (stats.queued || 0) + (stats.uploading || 0),
    completedDocuments: (stats.completed || 0) + (stats.uploaded || 0),
    failedDocuments: stats.failed || 0,
    pendingDocuments: stats.pending || 0,
    storageUsed: stats.storageUsed || 0,
    recentUploads: recent,
    s3,
  };
}

async function countByCategorySlug(slug) {
  const cat = await mongoose.model("KbCategory").findOne({ slug, isDeleted: false }).lean();
  if (!cat) return 0;
  return KbDocument.countDocuments({ isDeleted: false, categoryId: cat._id });
}
