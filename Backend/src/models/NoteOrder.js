import mongoose from "mongoose";

const noteOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    note: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["created", "pending", "paid", "failed", "refunded"],
      default: "created",
    },
    razorpayOrderId: { type: String, default: null, index: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    receipt: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

noteOrderSchema.index({ user: 1, note: 1, status: 1 });
noteOrderSchema.index({ user: 1, note: 1 }, { unique: true, partialFilterExpression: { status: "paid" } });

export const NoteOrder = mongoose.model("NoteOrder", noteOrderSchema);
