/**
 * Subject catalog model — UPSC Prelims subjects for Knowledge Base + Practice.
 * Seeds from notesCatalog; documents are optional (API also works with string subjects).
 */

import mongoose from "mongoose";
import { UPSC_NOTES_CATALOG } from "../../config/notesCatalog.js";

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    gsPaper: { type: String, default: "", trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    exam: { type: String, default: "UPSC Prelims" },
    isActive: { type: Boolean, default: true },
    chapterCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "rag_subjects" }
);

const Subject =
  mongoose.models.RagSubject || mongoose.model("RagSubject", subjectSchema);

function toSlug(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Upsert catalog subjects into Mongo (idempotent). */
export async function ensureSubjectsSeeded() {
  const ops = UPSC_NOTES_CATALOG.map((row) => ({
    updateOne: {
      filter: { name: row.subject },
      update: {
        $set: {
          name: row.subject,
          gsPaper: row.gsPaper,
          slug: toSlug(row.subject),
          exam: "UPSC Prelims",
          isActive: true,
          chapterCount: (row.chapters || []).length,
        },
      },
      upsert: true,
    },
  }));
  if (ops.length) await Subject.bulkWrite(ops, { ordered: false });
  return Subject.find({ isActive: true }).sort({ name: 1 }).lean();
}

export default Subject;
