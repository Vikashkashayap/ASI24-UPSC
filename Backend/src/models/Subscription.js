import mongoose from "mongoose";

/**
 * Notes Website subscription (premium unlock).
 * Collection: `subscriptions` (shared with legacy NotesSubscription exports).
 *
 * Spec fields: userId, planId, status, startDate, expiryDate, paymentId
 * Legacy fields (user/plan/endDate/order/payment) kept in sync for CMS code.
 */
const subscriptionSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
      index: true,
    },
    startDate: { type: Date, default: Date.now },
    /** null = lifetime */
    expiryDate: { type: Date, default: null },
    /** Razorpay payment id string */
    paymentId: { type: String, default: null, index: true },

    /* Legacy aliases */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotesSubscriptionPlan",
    },
    endDate: { type: Date, default: null },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotesStoreOrder",
      default: null,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotesPayment",
      default: null,
    },
  },
  { timestamps: true, collection: "subscriptions" }
);

subscriptionSchema.pre("validate", function syncLegacyFields(next) {
  if (this.userId && !this.user) this.user = this.userId;
  if (this.user && !this.userId) this.userId = this.user;
  if (this.planId && !this.plan) this.plan = this.planId;
  if (this.plan && !this.planId) this.planId = this.plan;
  if (this.expiryDate != null && this.endDate == null) {
    this.endDate = this.expiryDate;
  }
  if (this.endDate != null && this.expiryDate == null) {
    this.expiryDate = this.endDate;
  }
  next();
});

subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ user: 1, status: 1 });

// Keep mongoose model name "NotesSubscription" so existing refs/populates keep working.
export const Subscription =
  mongoose.models.NotesSubscription ||
  mongoose.model("NotesSubscription", subscriptionSchema);

/** @deprecated Prefer Subscription — kept for existing imports */
export const NotesSubscription = Subscription;
