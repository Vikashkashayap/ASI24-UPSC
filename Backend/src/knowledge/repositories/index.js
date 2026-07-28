import KbSubject from "../models/KbSubject.js";
import KbChapter from "../models/KbChapter.js";
import KbTopic from "../models/KbTopic.js";
import KbCategory from "../models/KbCategory.js";
import KbDocument from "../models/KbDocument.js";
import KbUpload from "../models/KbUpload.js";
import KbSource from "../models/KbSource.js";
import KbTag from "../models/KbTag.js";

export const subjectRepo = {
  findActive: (filter = {}) =>
    KbSubject.find({ isDeleted: false, ...filter }).sort({ sortOrder: 1, name: 1 }).lean(),
  findById: (id) => KbSubject.findOne({ _id: id, isDeleted: false }),
  create: (data) => KbSubject.create(data),
  update: (id, data) =>
    KbSubject.findOneAndUpdate({ _id: id, isDeleted: false }, data, { new: true }),
  softDelete: (id) =>
    KbSubject.findOneAndUpdate({ _id: id }, { isDeleted: true, isActive: false }, { new: true }),
};

export const chapterRepo = {
  find: (filter = {}) =>
    KbChapter.find({ isDeleted: false, ...filter }).sort({ sortOrder: 1, name: 1 }).lean(),
  findById: (id) => KbChapter.findOne({ _id: id, isDeleted: false }),
  create: (data) => KbChapter.create(data),
  update: (id, data) =>
    KbChapter.findOneAndUpdate({ _id: id, isDeleted: false }, data, { new: true }),
  softDelete: (id) =>
    KbChapter.findOneAndUpdate({ _id: id }, { isDeleted: true, isActive: false }, { new: true }),
};

export const topicRepo = {
  find: (filter = {}) =>
    KbTopic.find({ isDeleted: false, ...filter }).sort({ sortOrder: 1, name: 1 }).lean(),
  findById: (id) => KbTopic.findOne({ _id: id, isDeleted: false }),
  create: (data) => KbTopic.create(data),
  update: (id, data) =>
    KbTopic.findOneAndUpdate({ _id: id, isDeleted: false }, data, { new: true }),
  softDelete: (id) =>
    KbTopic.findOneAndUpdate({ _id: id }, { isDeleted: true, isActive: false }, { new: true }),
};

export const categoryRepo = {
  findActive: () =>
    KbCategory.find({ isDeleted: false }).sort({ isSystem: -1, name: 1 }).lean(),
  findById: (id) => KbCategory.findOne({ _id: id, isDeleted: false }),
  create: (data) => KbCategory.create(data),
  update: (id, data) =>
    KbCategory.findOneAndUpdate({ _id: id, isDeleted: false }, data, { new: true }),
  softDelete: (id) =>
    KbCategory.findOneAndUpdate({ _id: id }, { isDeleted: true, isActive: false }, { new: true }),
};

export const sourceRepo = {
  findActive: () => KbSource.find({ isDeleted: false }).sort({ name: 1 }).lean(),
  findById: (id) => KbSource.findOne({ _id: id, isDeleted: false }),
  create: (data) => KbSource.create(data),
  findOrCreateByName: async (name, userId) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return null;
    const existing = await KbSource.findOne({
      name: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      isDeleted: false,
    });
    if (existing) return existing;
    return KbSource.create({ name: trimmed, createdBy: userId || null });
  },
};

export const tagRepo = {
  upsertMany: async (names = [], userId) => {
    const out = [];
    for (const raw of names) {
      const name = String(raw || "").trim();
      if (!name) continue;
      const doc = await KbTag.findOneAndUpdate(
        { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        {
          $setOnInsert: { name, createdBy: userId || null },
          $inc: { usageCount: 1 },
          $set: { isDeleted: false },
        },
        { upsert: true, new: true }
      );
      out.push(doc);
    }
    return out;
  },
  findActive: () => KbTag.find({ isDeleted: false }).sort({ usageCount: -1, name: 1 }).limit(200).lean(),
};

export const documentRepo = {
  findById: (id) =>
    KbDocument.findOne({ _id: id, isDeleted: false })
      .populate("subjectId", "name slug")
      .populate("chapterId", "name slug")
      .populate("topicId", "name slug")
      .populate("categoryId", "name slug color")
      .populate("sourceId", "name publication")
      .populate("uploadedBy", "name email"),
  create: (data) => KbDocument.create(data),
  update: (id, data) =>
    KbDocument.findOneAndUpdate({ _id: id, isDeleted: false }, data, { new: true }),
  softDelete: (id) =>
    KbDocument.findOneAndUpdate(
      { _id: id },
      { isDeleted: true, status: "archived" },
      { new: true }
    ),
  softDeleteMany: (ids) =>
    KbDocument.updateMany(
      { _id: { $in: ids } },
      { isDeleted: true, status: "archived" }
    ),
  updateMany: (ids, data) =>
    KbDocument.updateMany({ _id: { $in: ids }, isDeleted: false }, data),
  aggregateStats: () =>
    KbDocument.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          storageUsed: { $sum: "$fileSize" },
          pending: {
            $sum: { $cond: [{ $eq: ["$processingStatus", "Pending"] }, 1, 0] },
          },
          queued: {
            $sum: { $cond: [{ $eq: ["$processingStatus", "Queued"] }, 1, 0] },
          },
          uploading: {
            $sum: { $cond: [{ $eq: ["$processingStatus", "Uploading"] }, 1, 0] },
          },
          uploaded: {
            $sum: { $cond: [{ $eq: ["$processingStatus", "Uploaded"] }, 1, 0] },
          },
          processing: {
            $sum: { $cond: [{ $eq: ["$processingStatus", "Processing"] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ["$processingStatus", "Completed"] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ["$processingStatus", "Failed"] }, 1, 0] },
          },
          pdfs: {
            $sum: {
              $cond: [{ $eq: [{ $toLower: "$extension" }, ".pdf"] }, 1, 0],
            },
          },
        },
      },
    ]),
};

export const uploadRepo = {
  create: (data) => KbUpload.create(data),
  findById: (id) => KbUpload.findById(id),
  update: (id, data) => KbUpload.findByIdAndUpdate(id, data, { new: true }),
};
