import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    introduction: String,
    content: String,
    structure: String,
    conclusion: String,
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    answerId: { type: mongoose.Schema.Types.ObjectId, ref: "Answer", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    score: { type: Number, required: true },
    feedback: feedbackSchema,
    strengths: [String],
    weaknesses: [String],
    improvements: [String],
    modelAnswer: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Evaluation = mongoose.model("Evaluation", evaluationSchema);
