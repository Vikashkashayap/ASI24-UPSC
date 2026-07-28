import mongoose from "mongoose";
import { slugify } from "../utils/slugify.js";

const kbSubjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: "" },
    gsPaper: { type: String, default: "", trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

kbSubjectSchema.index({ name: 1 });
kbSubjectSchema.index({ isActive: 1, isDeleted: 1, sortOrder: 1 });

kbSubjectSchema.pre("validate", function (next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});

export const KbSubject = mongoose.model("KbSubject", kbSubjectSchema);
export default KbSubject;
