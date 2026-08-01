import mongoose from "mongoose";

export const NOTES_SUBSCRIPTION_TYPES = [
  "notes_lifetime",
  "notes_monthly",
  "notes_yearly",
];

/**
 * Canonical Notes Website / Portal order document.
 * Collection: `orders` (shared with legacy NotesStoreOrder exports).
 */
const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotesSubscriptionPlan",
      required: true,
    },
    planName: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    paymentGateway: { type: String, default: "razorpay" },
    /** Razorpay payment id (set after verify) */
    paymentId: { type: String, default: null, index: true },
    /** Razorpay order id */
    orderId: { type: String, default: null, index: true },
    subscriptionType: {
      type: String,
      enum: NOTES_SUBSCRIPTION_TYPES,
      default: "notes_lifetime",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "created"],
      default: "pending",
      index: true,
    },
    source: {
      type: String,
      enum: ["notes", "portal"],
      default: "notes",
      index: true,
    },
    receipt: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },

    /**
     * Legacy aliases kept in sync for existing CMS controllers / populates.
     * Prefer userId / planId / orderId in new code.
     */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotesSubscriptionPlan",
    },
    razorpayOrderId: { type: String, default: null },
  },
  { timestamps: true, collection: "orders" }
);

orderSchema.pre("validate", function syncLegacyFields(next) {
  if (this.userId && !this.user) this.user = this.userId;
  if (this.user && !this.userId) this.userId = this.user;
  if (this.planId && !this.plan) this.plan = this.planId;
  if (this.plan && !this.planId) this.planId = this.plan;
  if (this.orderId && !this.razorpayOrderId) this.razorpayOrderId = this.orderId;
  if (this.razorpayOrderId && !this.orderId) this.orderId = this.razorpayOrderId;
  next();
});

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ subscriptionType: 1 });
orderSchema.index({ razorpayOrderId: 1 });

// Keep mongoose model name "NotesStoreOrder" so existing refs/populates keep working.
export const Order =
  mongoose.models.NotesStoreOrder ||
  mongoose.model("NotesStoreOrder", orderSchema);

/** @deprecated Prefer Order — kept for existing imports */
export const NotesStoreOrder = Order;
