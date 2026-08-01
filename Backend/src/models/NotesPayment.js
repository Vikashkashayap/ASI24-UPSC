import mongoose from "mongoose";

const notesPaymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotesStoreOrder",
      required: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotesSubscriptionPlan",
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    paymentId: { type: String, required: true, index: true },
    razorpayOrderId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    status: {
      type: String,
      enum: ["success", "failed", "refunded"],
      default: "success",
      index: true,
    },
    paidAt: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "payments" }
);

notesPaymentSchema.index({ user: 1, createdAt: -1 });

export const NotesPayment = mongoose.model("NotesPayment", notesPaymentSchema);
