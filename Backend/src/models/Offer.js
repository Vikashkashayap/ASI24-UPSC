import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    discount: { type: Number, default: 0 }, // percentage, e.g. 20
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    isHidden: { type: Boolean, default: false },
    ctaText: { type: String, default: "Claim Offer" },
    redirectUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

offerSchema.index({ startDate: 1, endDate: 1 });
offerSchema.index({ isActive: 1, isHidden: 1 });

export const Offer = mongoose.model("Offer", offerSchema);
