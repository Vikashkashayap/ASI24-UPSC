import mongoose from "mongoose";

/**
 * Human mentor profile: one per User with role "mentor".
 * assignedStudents kept in sync with User.mentorId for fast listing.
 */
const mentorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    assignedStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

mentorSchema.index({ userId: 1 });

export const Mentor = mongoose.model("Mentor", mentorSchema);
