import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    question: { type: String, required: true },
    subject: {
      type: String,
      enum: ["GS1", "GS2", "GS3", "GS4", "Essay", "Optional"],
      required: true,
    },
    answerText: { type: String, required: true },
    wordLimit: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Answer = mongoose.model("Answer", answerSchema);
