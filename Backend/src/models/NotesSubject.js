import mongoose from "mongoose";

const notesSubjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, collection: "subjects" }
);

notesSubjectSchema.index({ status: 1, sortOrder: 1 });

export const NotesSubject = mongoose.model("NotesSubject", notesSubjectSchema);
