import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    summary: { type: String, default: "" },
    content: { type: String, default: "" },
    contentHtml: { type: String, default: "" },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NoteCategory",
      required: true,
    },
    subject: { type: String, default: "" },
    tags: [{ type: String }],
    coverImage: { type: String, default: "" },
    /** Free notes are readable by anyone; premium requires purchase or isPremiumStudent */
    isPremium: { type: Boolean, default: false },
    price: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    estimatedReadMinutes: { type: Number, default: 0 },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

noteSchema.index({ isPublished: 1, isPremium: 1, category: 1 });
noteSchema.index({ subject: 1, isPublished: 1 });
noteSchema.index({ title: "text", summary: "text", tags: "text" });

export const Note = mongoose.model("Note", noteSchema);
