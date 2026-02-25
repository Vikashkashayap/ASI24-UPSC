import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    // Authorization role used across the app (admin vs non-admin)
    role: {
      type: String,
      enum: ["student", "agent", "admin"],
      default: "student",
    },
    // Subscription user type (spec: "role" for subscription) – controls access
    // - "admin-created": created from admin dashboard, full access without payment
    // - "paid-user": self-registered user who must purchase a plan
    accountType: {
      type: String,
      enum: ["admin-created", "paid-user"],
      default: "paid-user",
    },
    // High-level lifecycle of the account
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Subscription fields – used for Razorpay-based plans
    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },
    // Store reference to the pricing plan the user purchased
    subscriptionPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PricingPlan",
      default: null,
    },
    subscriptionStartDate: {
      type: Date,
      default: null,
    },
    subscriptionEndDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model("User", userSchema);
