import mongoose from "mongoose";
import { slugify } from "../utils/slugify.js";

export const DEFAULT_CATEGORIES = [
  "PYQ",
  "Notes",
  "Magazine",
  "NCERT",
  "Current Affairs",
  "Government Report",
  "MentorsDaily Notes",
  "Custom Category",
  "Test Series",
];

const kbCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: "" },
    color: { type: String, default: "#2563eb" },
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

kbCategorySchema.index({ isActive: 1, isDeleted: 1, name: 1 });

kbCategorySchema.pre("validate", function (next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});

export const KbCategory = mongoose.model("KbCategory", kbCategorySchema);
export default KbCategory;
