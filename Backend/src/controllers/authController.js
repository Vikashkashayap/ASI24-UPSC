import { registerUser, loginUser, changeUserPassword } from "../services/authService.js";
import { PricingPlan } from "../models/PricingPlan.js";

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const { user, token } = await registerUser({ name, email, password });
    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        accountType: user.accountType,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlanId: user.subscriptionPlanId,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionEndDate: user.subscriptionEndDate,
      },
      token,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await loginUser({ email, password });
    let subscriptionPlan = null;
    if (user.subscriptionPlanId) {
      const plan = await PricingPlan.findById(user.subscriptionPlanId)
        .select("name duration")
        .lean();
      if (plan) subscriptionPlan = plan;
    }
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        accountType: user.accountType,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlanId: user.subscriptionPlanId,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionEndDate: user.subscriptionEndDate,
        subscriptionPlan: subscriptionPlan || undefined,
      },
      token,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }
    await changeUserPassword(req.user._id, newPassword);
    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const me = async (req, res) => {
  const user = req.user;
  // Virtual admin user has no subscription
  if (user._id === "000000000000000000000000") {
    return res.json({ user: { ...user, id: user._id } });
  }
  let subscriptionPlan = null;
  if (user.subscriptionPlanId) {
    const plan = await PricingPlan.findById(user.subscriptionPlanId)
      .select("name duration")
      .lean();
    if (plan) subscriptionPlan = plan;
  }
  const userObj = user.toObject ? user.toObject() : { ...user };
  res.json({
    user: {
      ...userObj,
      id: userObj._id || userObj.id,
      subscriptionPlan: subscriptionPlan || undefined,
    },
  });
};
