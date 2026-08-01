import mongoose from "mongoose";

const noteCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    subject: { type: String, default: "" },
    icon: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

noteCategorySchema.index({ isActive: 1, sortOrder: 1 });

export const NoteCategory = mongoose.model("NoteCategory", noteCategorySchema);
