import mongoose from "mongoose";

const mentorFeedbackSchema = new mongoose.Schema(
  {
    mentorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    studentUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8000,
    },
  },
  { timestamps: true }
);

mentorFeedbackSchema.index({ mentorUserId: 1, studentUserId: 1, createdAt: -1 });

export const MentorFeedback = mongoose.model("MentorFeedback", mentorFeedbackSchema);
