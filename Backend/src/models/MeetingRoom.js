import mongoose from "mongoose";

const meetingRoomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    passcode: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        socketId: String,
        speakingLanguage: String,
        listeningLanguage: String,
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
meetingRoomSchema.index({ roomId: 1, passcode: 1 });
meetingRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const MeetingRoom = mongoose.model("MeetingRoom", meetingRoomSchema);

