import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: false }, // optional for Google OAuth users
    googleId: { type: String, required: false, sparse: true }, // unique per Google user
    phone: { type: String, default: "" },
    city: { type: String, default: "" },
    attempt: { type: String, default: "" },
    targetYear: { type: String, default: "" },
    prepStartDate: { type: String, default: "" },
    dailyStudyHours: { type: String, default: "" },
    educationBackground: { type: String, default: "" },
    isEmailVerified: { type: Boolean, default: false },
    otpCode: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    otpLastSentAt: { type: Date, default: null },
    otpVerifyAttempts: { type: Number, default: 0 },
    // Authorization role used across the app (admin vs non-admin)
    role: {
      type: String,
      enum: ["student", "agent", "admin", "mentor"],
      default: "student",
    },
    /** Set for students assigned to a human mentor (User id with role mentor) */
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model("User", userSchema);
