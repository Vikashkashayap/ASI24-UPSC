import { Order, NOTES_SUBSCRIPTION_TYPES } from "../models/Order.js";
import { Subscription } from "../models/Subscription.js";
import { NotesSubscriptionPlan } from "../models/NotesSubscriptionPlan.js";
import { NotesPayment } from "../models/NotesPayment.js";
import {
  createOrderForNotesPlan,
  verifyRazorpaySignature,
  razorpayClient,
} from "../utils/razorpay.js";
import {
  computePlanEndDate,
  getNotesAccessContext,
} from "./notesPortalAccess.service.js";

export function resolveSubscriptionType(plan, explicit) {
  if (explicit && NOTES_SUBSCRIPTION_TYPES.includes(explicit)) {
    return explicit;
  }
  const raw = String(explicit || "").toLowerCase().trim();
  if (raw === "lifetime" || raw === "life" || raw.includes("life")) {
    return "notes_lifetime";
  }
  if (raw === "yearly" || raw === "year" || raw.includes("year")) {
    return "notes_yearly";
  }
  if (raw === "monthly" || raw === "month" || raw.includes("month")) {
    return "notes_monthly";
  }

  const d = String(plan?.duration || plan?.title || "").toLowerCase();
  if (d.includes("life")) return "notes_lifetime";
  if (d.includes("year")) return "notes_yearly";
  if (d.includes("month")) return "notes_monthly";
  if (plan?.durationDays == null || Number(plan.durationDays) <= 0) {
    return "notes_lifetime";
  }
  if (Number(plan.durationDays) >= 365) return "notes_yearly";
  return "notes_monthly";
}

/** Normalize checkout plan keys: lifetime | monthly | yearly | notes_lifetime | … */
function normalizePlanKey(value) {
  const raw = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^notes_/, "")
    .replace(/-/g, "");
  if (!raw) return null;
  if (raw.includes("life")) return "lifetime";
  if (raw.includes("year")) return "yearly";
  if (raw.includes("month")) return "monthly";
  return raw;
}

/**
 * Resolve active NotesSubscriptionPlan from Mongo id OR checkout key
 * (lifetime / monthly / yearly / notes_lifetime / plan title / duration).
 */
export async function resolveActivePlan({ planId, planKey, subscriptionType }) {
  if (planId) {
    const byId = await NotesSubscriptionPlan.findOne({
      _id: planId,
      status: "active",
    });
    if (byId) return byId;
  }

  const key = normalizePlanKey(planKey || subscriptionType);
  let activePlans = await NotesSubscriptionPlan.find({ status: "active" }).sort({
    sortOrder: 1,
    price: 1,
  });

  // Auto-provision default Lifetime plan so Upgrade Now always works
  if (!activePlans.length) {
    const seedPrice = Number(process.env.NOTES_DEFAULT_PLAN_PRICE) || 199;
    const seeded = await NotesSubscriptionPlan.create({
      title: "Lifetime Notes Access",
      description: "Unlimited chapters, all subjects, future updates",
      price: seedPrice,
      duration: "Lifetime",
      durationDays: null,
      features: [
        "Unlimited Chapters",
        "350+ Premium Notes",
        "All Subjects",
        "Future Updates",
        "Lifetime Access",
      ],
      status: "active",
      sortOrder: 1,
    });
    console.log("[orders] seeded default Lifetime plan:", seeded._id.toString());
    activePlans = [seeded];
  }

  if (key) {
    const matched = activePlans.find((p) => {
      const blob = `${p.title || ""} ${p.duration || ""}`.toLowerCase();
      if (key === "lifetime") {
        return (
          blob.includes("life") ||
          p.durationDays == null ||
          Number(p.durationDays) <= 0
        );
      }
      if (key === "yearly") {
        return blob.includes("year") || Number(p.durationDays) >= 365;
      }
      if (key === "monthly") {
        return (
          (blob.includes("month") && !blob.includes("year")) ||
          (Number(p.durationDays) > 0 && Number(p.durationDays) < 365)
        );
      }
      return blob.includes(key);
    });
    if (matched) return matched;

    // If asking for lifetime but only other plans exist, create lifetime
    if (key === "lifetime") {
      const seedPrice = Number(process.env.NOTES_DEFAULT_PLAN_PRICE) || 199;
      const seeded = await NotesSubscriptionPlan.create({
        title: "Lifetime Notes Access",
        description: "Unlimited chapters, all subjects, future updates",
        price: seedPrice,
        duration: "Lifetime",
        durationDays: null,
        features: [
          "Unlimited Chapters",
          "350+ Premium Notes",
          "All Subjects",
          "Future Updates",
          "Lifetime Access",
        ],
        status: "active",
        sortOrder: 0,
      });
      console.log("[orders] seeded Lifetime plan:", seeded._id.toString());
      return seeded;
    }
  }

  if (activePlans.length === 1) return activePlans[0];

  const err = new Error(
    `Plan not found. Send planId or plan (lifetime|monthly|yearly). Received: ${
      planId || planKey || subscriptionType || "(empty)"
    }`
  );
  err.status = 404;
  throw err;
}

/**
 * Create a pending Notes order + Razorpay order.
 */
export async function createPendingOrder({
  user,
  planId,
  planKey,
  amount: clientAmount,
  source = "notes",
  subscriptionType: clientType,
}) {
  if (!planId && !planKey && !clientType) {
    const err = new Error(
      "planId (or plan / subscriptionType) is required. Example: { plan: \"lifetime\" } or { planId: \"...\" }"
    );
    err.status = 400;
    throw err;
  }

  if (user.source === "portal") {
    const err = new Error("Portal students already have full notes access");
    err.status = 400;
    err.code = "PORTAL_FULL_ACCESS";
    throw err;
  }

  const access = await getNotesAccessContext(user);
  if (access.fullAccess) {
    const err = new Error("You already have an active subscription");
    err.status = 400;
    err.code = "ALREADY_SUBSCRIBED";
    throw err;
  }

  const plan = await resolveActivePlan({
    planId,
    planKey,
    subscriptionType: clientType,
  });
  if (!plan) {
    const err = new Error("Plan not found");
    err.status = 404;
    throw err;
  }

  // Never trust client amount — use plan price from DB
  const amount = Number(plan.price);
  if (clientAmount != null && Number(clientAmount) !== amount) {
    // Soft warning only; still charge plan price
    console.warn(
      `[orders] client amount ${clientAmount} ignored; using plan price ${amount}`
    );
  }

  const subscriptionType = resolveSubscriptionType(plan, clientType);
  const razorpayOrder = await createOrderForNotesPlan(plan, user._id);

  let order = await Order.findOne({
    $and: [
      { $or: [{ userId: user._id }, { user: user._id }] },
      { $or: [{ planId: plan._id }, { plan: plan._id }] },
      { status: { $in: ["created", "pending"] } },
    ],
  });

  if (order) {
    order.amount = amount;
    order.planName = plan.title;
    order.subscriptionType = subscriptionType;
    order.source = source || "notes";
    order.paymentGateway = "razorpay";
    order.orderId = razorpayOrder.id;
    order.razorpayOrderId = razorpayOrder.id;
    order.receipt = razorpayOrder.receipt || "";
    order.status = "pending";
    order.user = user._id;
    order.plan = plan._id;
    await order.save();
  } else {
    order = await Order.create({
      userId: user._id,
      user: user._id,
      planId: plan._id,
      plan: plan._id,
      planName: plan.title,
      amount,
      currency: "INR",
      paymentGateway: "razorpay",
      orderId: razorpayOrder.id,
      razorpayOrderId: razorpayOrder.id,
      subscriptionType,
      status: "pending",
      source: source || "notes",
      receipt: razorpayOrder.receipt || "",
    });
  }

  return {
    order,
    plan,
    razorpayOrder,
    keyId: process.env.RAZORPAY_KEY_ID,
  };
}

/**
 * Verify Razorpay payment, mark order paid, create subscription.
 */
export async function verifyAndActivateSubscription({
  user,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  planId,
}) {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    const err = new Error("Missing payment verification fields");
    err.status = 400;
    throw err;
  }

  const isValid = verifyRazorpaySignature({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });
  if (!isValid) {
    const err = new Error("Invalid Razorpay signature");
    err.status = 400;
    throw err;
  }

  const rzOrder = await razorpayClient.orders.fetch(razorpay_order_id);
  if (!rzOrder) {
    const err = new Error("Order not found on Razorpay");
    err.status = 404;
    throw err;
  }

  let order = await Order.findOne({
    userId: user._id,
    orderId: razorpay_order_id,
  });

  if (!order) {
    order = await Order.findOne({
      user: user._id,
      razorpayOrderId: razorpay_order_id,
    });
  }

  const resolvedPlanId = planId || order?.planId || order?.plan;
  if (!resolvedPlanId) {
    const err = new Error("planId is required");
    err.status = 400;
    throw err;
  }

  const plan = await NotesSubscriptionPlan.findById(resolvedPlanId);
  if (!plan) {
    const err = new Error("Plan not found");
    err.status = 404;
    throw err;
  }

  const expectedAmount = Math.round(Number(plan.price) * 100);
  if (rzOrder.amount !== expectedAmount) {
    const err = new Error("Payment amount mismatch");
    err.status = 400;
    throw err;
  }

  if (!order) {
    order = await Order.create({
      userId: user._id,
      user: user._id,
      planId: plan._id,
      plan: plan._id,
      planName: plan.title,
      amount: plan.price,
      currency: "INR",
      paymentGateway: "razorpay",
      orderId: razorpay_order_id,
      razorpayOrderId: razorpay_order_id,
      subscriptionType: resolveSubscriptionType(plan),
      status: "pending",
      source: "notes",
    });
  }

  order.status = "paid";
  order.paymentId = razorpay_payment_id;
  order.paidAt = new Date();
  order.planName = order.planName || plan.title;
  await order.save();

  const payment = await NotesPayment.create({
    user: user._id,
    order: order._id,
    plan: plan._id,
    amount: plan.price,
    currency: "INR",
    paymentId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
    razorpaySignature: razorpay_signature,
    status: "success",
    paidAt: new Date(),
  });

  const startDate = new Date();
  const expiryDate = computePlanEndDate(startDate, plan);

  await Subscription.updateMany(
    { userId: user._id, status: "active" },
    { $set: { status: "cancelled" } }
  );
  // Also cancel legacy-shaped docs
  await Subscription.updateMany(
    { user: user._id, status: "active" },
    { $set: { status: "cancelled" } }
  );

  const subscription = await Subscription.create({
    userId: user._id,
    user: user._id,
    planId: plan._id,
    plan: plan._id,
    status: "active",
    startDate,
    expiryDate,
    endDate: expiryDate,
    paymentId: razorpay_payment_id,
    order: order._id,
    payment: payment._id,
  });

  return { order, payment, subscription, plan };
}

export async function listMyOrders(userId) {
  return Order.find({
    $or: [{ userId }, { user: userId }],
  })
    .populate("planId", "title price duration")
    .populate("plan", "title price duration")
    .sort({ createdAt: -1 })
    .lean();
}

export async function listAllOrdersAdmin({ status, page = 1, limit = 50 } = {}) {
  const filter = {};
  if (status) filter.status = status;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  const [total, items] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .populate("userId", "name email phone source")
      .populate("user", "name email phone source")
      .populate("planId", "title price duration")
      .populate("plan", "title price duration")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
  ]);

  const mapped = items.map((o) => {
    const user = o.userId || o.user;
    const plan = o.planId || o.plan;
    return {
      _id: o._id,
      userId: user?._id || o.userId,
      userName: user?.name || "",
      email: user?.email || "",
      plan: plan?.title || o.planName || "",
      planName: plan?.title || o.planName || "",
      amount: o.amount,
      currency: o.currency,
      paymentStatus: o.status,
      status: o.status,
      paymentId: o.paymentId,
      orderId: o.orderId || o.razorpayOrderId,
      subscriptionType: o.subscriptionType,
      source: o.source,
      date: o.createdAt,
      createdAt: o.createdAt,
      user,
      planDoc: plan,
    };
  });

  return {
    items: mapped,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

export async function listSubscriptionsAdmin({ status, page = 1, limit = 50 } = {}) {
  const filter = {};
  if (status) filter.status = status;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  const [total, items] = await Promise.all([
    Subscription.countDocuments(filter),
    Subscription.find(filter)
      .populate("userId", "name email phone source")
      .populate("user", "name email phone source")
      .populate("planId", "title price duration")
      .populate("plan", "title price duration")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
  ]);

  return {
    items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
}

export async function getOrdersDashboardStats() {
  const now = new Date();
  const activeFilter = {
    status: "active",
    $or: [
      {
        $and: [
          { $or: [{ expiryDate: null }, { expiryDate: { $exists: false } }] },
          { $or: [{ endDate: null }, { endDate: { $exists: false } }] },
        ],
      },
      { expiryDate: { $gt: now } },
      { endDate: { $gt: now } },
    ],
  };

  const [totalOrders, paidOrders, revenueAgg, activeSubscriptions, premiumUserIds] =
    await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: "paid" }),
      Order.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Subscription.countDocuments(activeFilter),
      Subscription.distinct("userId", activeFilter),
    ]);

  const legacyUserIds = await Subscription.distinct("user", {
    ...activeFilter,
    userId: { $exists: false },
  });

  const premiumSet = new Set(
    [...premiumUserIds, ...legacyUserIds].filter(Boolean).map(String)
  );

  return {
    totalOrders,
    paidOrders,
    revenue: revenueAgg[0]?.total || 0,
    activeSubscriptions,
    premiumUsers: premiumSet.size,
  };
}
