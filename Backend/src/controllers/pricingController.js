import { PricingPlan } from "../models/PricingPlan.js";

/**
 * Public: Get all active pricing plans (for landing page).
 * GET /api/pricing
 */
export const getActivePlans = async (req, res) => {
  try {
    const plans = await PricingPlan.find({ status: "active" }).sort({
      isPopular: -1,
      price: 1,
    });
    return res.json({ success: true, data: plans });
  } catch (err) {
    console.error("getActivePlans:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin: Get all plans (active + draft).
 * GET /api/admin/pricing
 */
export const getAllPlans = async (req, res) => {
  try {
    const plans = await PricingPlan.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: plans });
  } catch (err) {
    console.error("getAllPlans:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin: Create a new pricing plan.
 * If isPopular is true, unset isPopular on all other plans (only one "Most Popular").
 * POST /api/admin/pricing
 */
export const createPlan = async (req, res) => {
  try {
    const { name, price, duration, description, features, isPopular, status } =
      req.body;

    if (!name || price == null || !duration) {
      return res.status(400).json({
        success: false,
        message: "name, price, and duration are required",
      });
    }

    if (isPopular) {
      await PricingPlan.updateMany({}, { $set: { isPopular: false } });
    }

    const plan = await PricingPlan.create({
      name: name.trim(),
      price: Number(price),
      duration: duration.trim(),
      description: (description || "").trim(),
      features: Array.isArray(features) ? features.filter(Boolean) : [],
      isPopular: Boolean(isPopular),
      status: status === "active" ? "active" : "draft",
    });

    return res.status(201).json({ success: true, data: plan });
  } catch (err) {
    console.error("createPlan:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin: Update a pricing plan.
 * If isPopular is set to true, unset isPopular on all other plans.
 * PUT /api/admin/pricing/:id
 */
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, duration, description, features, isPopular, status } =
      req.body;

    const plan = await PricingPlan.findById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    if (name !== undefined) plan.name = name.trim();
    if (price != null) plan.price = Number(price);
    if (duration !== undefined) plan.duration = duration.trim();
    if (description !== undefined) plan.description = description.trim();
    if (Array.isArray(features)) plan.features = features.filter(Boolean);
    if (typeof isPopular === "boolean") {
      if (isPopular) {
        await PricingPlan.updateMany(
          { _id: { $ne: id } },
          { $set: { isPopular: false } }
        );
      }
      plan.isPopular = isPopular;
    }
    if (status === "active" || status === "draft") plan.status = status;

    await plan.save();
    return res.json({ success: true, data: plan });
  } catch (err) {
    console.error("updatePlan:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin: Delete a pricing plan.
 * DELETE /api/admin/pricing/:id
 */
export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await PricingPlan.findByIdAndDelete(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }
    return res.json({ success: true, message: "Plan deleted" });
  } catch (err) {
    console.error("deletePlan:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
