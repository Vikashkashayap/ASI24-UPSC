import mongoose from "mongoose";
import { slugify } from "../utils/slugify.js";

const kbSourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    publication: { type: String, default: "", trim: true },
    website: { type: String, default: "" },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

kbSourceSchema.pre("validate", function (next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});

export const KbSource = mongoose.model("KbSource", kbSourceSchema);
export default KbSource;
