import mongoose from "mongoose";

/**
 * Published notes content for the Notes Website.
 * Collection: notes
 */
const notesContentSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotesSubject",
      required: true,
      index: true,
    },
    chapter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotesChapter",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    summary: { type: String, default: "" },
    content: { type: String, default: "" },
    contentHtml: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    price: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["published", "draft"],
      default: "draft",
    },
    sortOrder: { type: Number, default: 0 },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    tags: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, collection: "notes" }
);

notesContentSchema.index({ chapter: 1, slug: 1 }, { unique: true });
notesContentSchema.index({ subject: 1, chapter: 1, status: 1, sortOrder: 1 });
notesContentSchema.index({ title: "text", summary: "text", tags: "text" });

export const NotesContent = mongoose.model("NotesContent", notesContentSchema);
