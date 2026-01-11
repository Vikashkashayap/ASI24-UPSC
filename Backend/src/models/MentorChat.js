import mongoose from "mongoose";

const mentorChatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'mentor'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const mentorChatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sessionId: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString()
    },
    messages: [mentorChatMessageSchema],
    isActive: {
      type: Boolean,
      default: true
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

// Index for efficient queries
mentorChatSchema.index({ userId: 1, lastActivity: -1 });
mentorChatSchema.index({ userId: 1, isActive: 1 });

export const MentorChat = mongoose.model("MentorChat", mentorChatSchema);
