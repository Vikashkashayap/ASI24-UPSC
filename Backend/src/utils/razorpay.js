import Razorpay from "razorpay";
import crypto from "crypto";

// Lazy client: created on first use so process.env is already loaded (dotenv runs in server.js after imports).
let _razorpayClient = null;

/** Lazy client so process.env is loaded (dotenv runs in server.js after imports). */
function getRazorpayClient() {
  if (!_razorpayClient) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error("Razorpay keys are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env");
    }
    _razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return _razorpayClient;
}

// Backward-compat: proxy so existing code using razorpayClient.orders.fetch() still works
export const razorpayClient = {
  get orders() {
    return getRazorpayClient().orders;
  },
};

export const createOrderForPlan = async (plan, userId) => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys are not configured on the server");
  }

  const amountInPaise = Math.round(Number(plan.price) * 100);
  if (!amountInPaise || amountInPaise <= 0) {
    throw new Error("Invalid plan amount");
  }

  // Razorpay requires receipt length <= 40 characters.
  const shortPlanId = String(plan._id).slice(-8);
  const shortUserId = String(userId).slice(-8);
  const shortTs = Date.now().toString(36).slice(-6);
  const receipt = `pln_${shortPlanId}_${shortUserId}_${shortTs}`.slice(0, 40);

  const options = {
    amount: amountInPaise,
    currency: "INR",
    receipt,
    notes: {
      planId: String(plan._id),
      userId: String(userId),
      planName: plan.name,
    },
  };

  const order = await getRazorpayClient().orders.create(options);
  return order;
};

export const verifyRazorpaySignature = ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  return expectedSignature === razorpay_signature;
};

