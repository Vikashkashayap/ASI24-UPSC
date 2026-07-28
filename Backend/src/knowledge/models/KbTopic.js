import mongoose from "mongoose";
import { slugify } from "../utils/slugify.js";

const kbTopicSchema = new mongoose.Schema(
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
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KbChapter",
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

kbTopicSchema.index({ chapterId: 1, slug: 1 }, { unique: true });
kbTopicSchema.index({ subjectId: 1, chapterId: 1, isDeleted: 1, sortOrder: 1 });

kbTopicSchema.pre("validate", function (next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});

export const KbTopic = mongoose.model("KbTopic", kbTopicSchema);
export default KbTopic;
