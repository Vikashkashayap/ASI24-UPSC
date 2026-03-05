import mongoose from "mongoose";

/**
 * CurrentAffair Schema – Daily UPSC Current Affairs (from GNews + Claude)
 */
const currentAffairSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    summary: { type: String, required: true },
    keyPoints: [{ type: String }],
    gsPaper: { type: String, required: true, trim: true }, // GS1, GS2, GS3, GS4
    prelimsFocus: { type: String, default: "" },
    mainsAngle: { type: String, default: "" },
    keywords: [{ type: String }],
    difficulty: {
      type: String,
      enum: ["Easy", "Moderate", "Hard"],
      default: "Moderate",
    },
    sourceUrl: { type: String, default: "" },
    date: { type: Date, default: Date.now },
    slug: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

currentAffairSchema.index({ date: -1, isActive: 1 });
currentAffairSchema.index({ sourceUrl: 1 }); // duplicate check by URL
// slug already has unique: true → index created automatically
currentAffairSchema.index({ title: 1 });
currentAffairSchema.index({ gsPaper: 1, isActive: 1 });
currentAffairSchema.index({ difficulty: 1, isActive: 1 });

/**
 * Generate URL-safe slug from title
 */
export function slugify(title) {
  if (!title || typeof title !== "string") return "";
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 120);
}

/**
 * Ensure unique slug by appending short id if needed (called before save)
 */
currentAffairSchema.pre("save", function (next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title);
  }
  next();
});

export default mongoose.model("CurrentAffair", currentAffairSchema);
