import { PricingPlan } from "../models/PricingPlan.js";
import { User } from "../models/User.js";
import {
  createOrderForPlan,
  razorpayClient,
  verifyRazorpaySignature,
} from "../utils/razorpay.js";
import { sendPaymentReceiptEmail } from "../utils/sendEmail.js";

// Helper: convert human-readable duration string into an end date.
const calculateEndDate = (startDate, durationLabel) => {
  const start = new Date(startDate);
  const label = (durationLabel || "").toLowerCase();
  const end = new Date(start);

  if (label.includes("year")) {
    end.setMonth(end.getMonth() + 12);
  } else if (label.includes("half")) {
    end.setMonth(end.getMonth() + 6);
  } else if (label.includes("quarter")) {
    end.setMonth(end.getMonth() + 3);
  } else if (label.includes("month")) {
    end.setMonth(end.getMonth() + 1);
  } else if (label.includes("week")) {
    end.setDate(end.getDate() + 7);
  } else if (label.includes("day")) {
    end.setDate(end.getDate() + 1);
  } else {
    // Sensible default if duration is custom text
    end.setMonth(end.getMonth() + 1);
  }

  return end;
};

/**
 * POST /api/payment/create-order
 * Body: { planId }
 *
 * Creates a Razorpay order for the selected plan.
 * Amount is always taken from the PricingPlan model – never from the frontend.
 */
export const createOrder = async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res
        .status(400)
        .json({ success: false, message: "planId is required" });
    }

    const plan = await PricingPlan.findOne({
      _id: planId,
      status: "active",
    });
    if (!plan) {
      return res
        .status(404)
        .json({ success: false, message: "Pricing plan not found" });
    }

    const userId = req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const order = await createOrderForPlan(plan, userId);

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        plan: {
          id: plan._id,
          name: plan.name,
          price: plan.price,
          duration: plan.duration,
        },
      },
    });
  } catch (err) {
    console.error("createOrder error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create order" });
  }
};

/**
 * POST /api/payment/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId }
 *
 * Verifies Razorpay signature and activates subscription on the user.
 */
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !planId
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification fields",
      });
    }

    const isValidSignature = verifyRazorpaySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValidSignature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Razorpay signature" });
    }

    // Fetch order from Razorpay to validate amount and notes.
    const order = await razorpayClient.orders.fetch(razorpay_order_id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found on Razorpay" });
    }

    const plan = await PricingPlan.findOne({
      _id: planId,
      status: "active",
    });
    if (!plan) {
      return res
        .status(404)
        .json({ success: false, message: "Pricing plan not found" });
    }

    const expectedAmount = Math.round(Number(plan.price) * 100);
    if (order.amount !== expectedAmount) {
      return res.status(400).json({
        success: false,
        message: "Payment amount mismatch",
      });
    }

    const userIdFromToken = req.user?._id;
    if (!userIdFromToken) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const user = await User.findById(userIdFromToken);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const now = new Date();
    const endDate = calculateEndDate(now, plan.duration);

    user.subscriptionStatus = "active";
    user.subscriptionPlanId = plan._id;
    user.subscriptionStartDate = now;
    user.subscriptionEndDate = endDate;
    // Ensure self-registered users are marked as paid users after successful payment
    if (!user.accountType || user.accountType === "paid-user") {
      user.accountType = "paid-user";
    }

    await user.save();

    // Try to send receipt email, but don't fail payment if it errors
    try {
      await sendPaymentReceiptEmail(user, {
        id: plan._id,
        name: plan.name,
        price: plan.price,
        duration: plan.duration,
        transactionId: razorpay_payment_id,
      });
    } catch (emailErr) {
      console.error("Failed to send payment receipt email:", emailErr);
    }

    return res.json({
      success: true,
      message: "Payment verified and subscription activated",
      data: {
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlanId: user.subscriptionPlanId,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionEndDate: user.subscriptionEndDate,
        accountType: user.accountType,
      },
    });
  } catch (err) {
    console.error("verifyPayment error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to verify payment" });
  }
};

