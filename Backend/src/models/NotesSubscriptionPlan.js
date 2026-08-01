import mongoose from "mongoose";

const notesSubscriptionPlanSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    duration: {
      type: String,
      required: true,
      trim: true,
      // e.g. "Lifetime", "Monthly", "Yearly", "3 Months"
    },
    durationDays: {
      type: Number,
      default: null, // null = lifetime
    },
    features: [{ type: String }],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, collection: "subscription_plans" }
);

notesSubscriptionPlanSchema.index({ status: 1, sortOrder: 1 });

export const NotesSubscriptionPlan = mongoose.model(
  "NotesSubscriptionPlan",
  notesSubscriptionPlanSchema
);
