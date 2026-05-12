import mongoose from "mongoose";

const pricingPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    duration: { type: String, required: true }, // e.g. "Monthly", "Yearly"
    description: { type: String, default: "" },
    features: [{ type: String }],
    isPopular: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "draft"],
      default: "draft",
    },
  },
  { timestamps: true }
);

export const PricingPlan = mongoose.model("PricingPlan", pricingPlanSchema);
