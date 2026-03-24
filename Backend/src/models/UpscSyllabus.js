import mongoose from "mongoose";

const syllabusTopicSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    subtopics: { type: [String], default: [] },
  },
  { _id: false }
);

const syllabusSubjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    topics: { type: [syllabusTopicSchema], default: [] },
  },
  { _id: false }
);

const upscSyllabusSchema = new mongoose.Schema(
  {
    label: { type: String, default: "" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fileName: { type: String, default: "" },
    subjects: { type: [syllabusSubjectSchema], default: [] },
    totalTopicRows: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

upscSyllabusSchema.index({ createdAt: -1 });
upscSyllabusSchema.index({ isActive: 1 });

export const UpscSyllabus = mongoose.model("UpscSyllabus", upscSyllabusSchema);
