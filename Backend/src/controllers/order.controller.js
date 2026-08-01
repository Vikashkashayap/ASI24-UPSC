import {
  createPendingOrder,
  verifyAndActivateSubscription,
  listMyOrders,
  listAllOrdersAdmin,
  listSubscriptionsAdmin,
  getOrdersDashboardStats,
} from "../services/order.service.js";

/**
 * POST /api/orders
 * Body accepts any of:
 *   planId | plan | planSlug | subscriptionType
 * plus optional amount, source
 *
 * Notes Website checkout often sends:
 *   { plan: "lifetime", amount: 199, source: "notes", subscriptionType: "notes_lifetime" }
 */
export const createOrder = async (req, res) => {
  try {
    const body = req.body || {};
    const q = req.query || {};
    const planId =
      body.planId ||
      body.plan_id ||
      q.planId ||
      (typeof body.plan === "string" && /^[a-f\d]{24}$/i.test(body.plan)
        ? body.plan
        : undefined);
    const planKey =
      body.planSlug ||
      body.planKey ||
      q.plan ||
      (typeof body.plan === "string" && !/^[a-f\d]{24}$/i.test(body.plan)
        ? body.plan
        : undefined) ||
      (typeof q.plan === "string" && !/^[a-f\d]{24}$/i.test(q.plan) ? q.plan : undefined);
    const subscriptionType =
      body.subscriptionType || body.subscription_type || q.subscriptionType;
    const amount = body.amount ?? q.amount;
    const source = body.source || q.source || "notes";

    console.log("[orders] POST /api/orders body:", {
      planId,
      planKey,
      subscriptionType,
      amount,
      source,
      rawKeys: Object.keys(body),
    });

    const result = await createPendingOrder({
      user: req.user,
      planId,
      planKey,
      amount,
      source,
      subscriptionType,
    });

    return res.status(201).json({
      success: true,
      orderId: result.order._id,
      paymentRequired: true,
      data: {
        orderId: result.order._id,
        razorpayOrderId: result.razorpayOrder.id,
        amount: result.razorpayOrder.amount,
        currency: result.razorpayOrder.currency || "INR",
        keyId: result.keyId,
        paymentGateway: "razorpay",
        subscriptionType: result.order.subscriptionType,
        plan: {
          _id: result.plan._id,
          title: result.plan.title,
          price: result.plan.price,
          duration: result.plan.duration,
        },
      },
    });
  } catch (err) {
    console.error("POST /api/orders:", err);
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Failed to create order",
      code: err.code,
    });
  }
};

/**
 * GET /api/orders/my
 */
export const getMyOrders = async (req, res) => {
  try {
    const orders = await listMyOrders(req.user._id);
    return res.json({ success: true, data: orders });
  } catch (err) {
    console.error("GET /api/orders/my:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch orders",
    });
  }
};

/**
 * GET /api/admin/orders
 */
export const adminGetOrders = async (req, res) => {
  try {
    const result = await listAllOrdersAdmin({
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("GET /api/admin/orders:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch orders",
    });
  }
};

/**
 * GET /api/admin/subscriptions
 */
export const adminGetSubscriptions = async (req, res) => {
  try {
    const result = await listSubscriptionsAdmin({
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("GET /api/admin/subscriptions:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch subscriptions",
    });
  }
};

/**
 * GET /api/admin/orders/stats
 */
export const adminOrdersStats = async (req, res) => {
  try {
    const stats = await getOrdersDashboardStats();
    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error("GET /api/admin/orders/stats:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch stats",
    });
  }
};

/**
 * POST /api/payments/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId? }
 */
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
    } = req.body || {};

    const result = await verifyAndActivateSubscription({
      user: req.user,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
    });

    return res.json({
      success: true,
      message: "Payment verified — subscription activated",
      data: {
        orderId: result.order._id,
        paymentId: result.payment._id,
        subscriptionId: result.subscription._id,
        expiryDate: result.subscription.expiryDate ?? result.subscription.endDate,
        fullAccess: true,
      },
    });
  } catch (err) {
    console.error("POST /api/payments/verify:", err);
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Payment verification failed",
    });
  }
};
