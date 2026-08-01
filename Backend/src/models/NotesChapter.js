import mongoose from "mongoose";

const notesChapterSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotesSubject",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["published", "draft"],
      default: "draft",
    },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, collection: "chapters" }
);

notesChapterSchema.index({ subject: 1, slug: 1 }, { unique: true });
notesChapterSchema.index({ subject: 1, sortOrder: 1, status: 1 });

export const NotesChapter = mongoose.model("NotesChapter", notesChapterSchema);
