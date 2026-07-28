import mongoose from "mongoose";
import { slugify } from "../utils/slugify.js";

const kbChapterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    description: { type: String, default: "" },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KbSubject",
      required: true,
      index: true,
    },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

kbChapterSchema.index({ subjectId: 1, slug: 1 }, { unique: true });
kbChapterSchema.index({ subjectId: 1, isDeleted: 1, sortOrder: 1 });

kbChapterSchema.pre("validate", function (next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});

export const KbChapter = mongoose.model("KbChapter", kbChapterSchema);
export default KbChapter;
