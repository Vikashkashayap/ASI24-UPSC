import mongoose from "mongoose";
import { slugify } from "../utils/slugify.js";

const kbTagSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    usageCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

kbTagSchema.pre("validate", function (next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});

export const KbTag = mongoose.model("KbTag", kbTagSchema);
export default KbTag;
