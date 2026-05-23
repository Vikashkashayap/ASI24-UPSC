import mongoose from "mongoose";

const weakTopicSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true },
    topic: { type: String, default: "" },
    accuracy: { type: Number, default: 0 },
    source: { type: String, enum: ["self_reported", "mock", "planner"], default: "planner" },
    priority: { type: String, enum: ["low", "medium", "high"], default: "high" },
  },
  { timestamps: true }
);

weakTopicSchema.index({ userId: 1, subject: 1 });

export const WeakTopic = mongoose.model("WeakTopic", weakTopicSchema);
