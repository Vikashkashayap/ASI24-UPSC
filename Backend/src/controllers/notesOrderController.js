import { Note } from "../models/Note.js";
import { NoteOrder } from "../models/NoteOrder.js";
import {
  createOrderForNote,
  verifyRazorpaySignature,
  razorpayClient,
} from "../utils/razorpay.js";
import {
  userHasNoteAccess,
  userHasGlobalPremiumNotesAccess,
  grantNotePermission,
} from "../services/notesAccess.service.js";

/**
 * Create a Razorpay order to unlock a premium note.
 * Portal premium students (isPremiumStudent) should not need this.
 */
export const createNoteOrder = async (req, res) => {
  try {
    const { noteId } = req.body;
    if (!noteId) {
      return res.status(400).json({ success: false, message: "noteId is required" });
    }

    const note = await Note.findOne({ _id: noteId, isPublished: true });
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }
    if (!note.isPremium) {
      return res.status(400).json({
        success: false,
        message: "This note is free — no purchase required",
      });
    }

    if (userHasGlobalPremiumNotesAccess(req.user)) {
      return res.status(400).json({
        success: false,
        message: "You already have premium access to all notes",
        code: "ALREADY_PREMIUM",
      });
    }

    const already = await userHasNoteAccess(req.user, note);
    if (already) {
      return res.status(400).json({
        success: false,
        message: "You already have access to this note",
        code: "ALREADY_OWNED",
      });
    }

    const price = Number(note.price) || 0;
    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid note price. Contact admin.",
      });
    }

    const razorpayOrder = await createOrderForNote(note, req.user._id);

    let order = await NoteOrder.findOne({
      user: req.user._id,
      note: note._id,
      status: { $in: ["created", "pending"] },
    });

    if (order) {
      order.amount = price;
      order.currency = note.currency || "INR";
      order.razorpayOrderId = razorpayOrder.id;
      order.receipt = razorpayOrder.receipt || "";
      order.status = "pending";
      await order.save();
    } else {
      order = await NoteOrder.create({
        user: req.user._id,
        note: note._id,
        amount: price,
        currency: note.currency || "INR",
        status: "pending",
        razorpayOrderId: razorpayOrder.id,
        receipt: razorpayOrder.receipt || "",
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        orderId: order._id,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        note: {
          _id: note._id,
          title: note.title,
          slug: note.slug,
          price: note.price,
        },
      },
    });
  } catch (err) {
    console.error("createNoteOrder:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create note order",
    });
  }
};

export const verifyNoteOrder = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      noteId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !noteId) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification fields",
      });
    }

    const isValid = verifyRazorpaySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay signature",
      });
    }

    const rzOrder = await razorpayClient.orders.fetch(razorpay_order_id);
    if (!rzOrder) {
      return res.status(404).json({ success: false, message: "Order not found on Razorpay" });
    }

    const note = await Note.findById(noteId);
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    const expectedAmount = Math.round(Number(note.price) * 100);
    if (rzOrder.amount !== expectedAmount) {
      return res.status(400).json({
        success: false,
        message: "Payment amount mismatch",
      });
    }

    let order = await NoteOrder.findOne({
      user: req.user._id,
      note: note._id,
      razorpayOrderId: razorpay_order_id,
    });

    if (!order) {
      order = await NoteOrder.create({
        user: req.user._id,
        note: note._id,
        amount: note.price,
        currency: note.currency || "INR",
        status: "pending",
        razorpayOrderId: razorpay_order_id,
      });
    }

    order.status = "paid";
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.paidAt = new Date();
    await order.save();

    await grantNotePermission({
      userId: req.user._id,
      noteId: note._id,
      source: "purchase",
      orderId: order._id,
    });

    return res.json({
      success: true,
      message: "Payment verified — note unlocked",
      data: {
        orderId: order._id,
        noteId: note._id,
        status: order.status,
        hasAccess: true,
      },
    });
  } catch (err) {
    console.error("verifyNoteOrder:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to verify note payment",
    });
  }
};

export const listMyNoteOrders = async (req, res) => {
  try {
    const orders = await NoteOrder.find({ user: req.user._id })
      .populate("note", "title slug isPremium price coverImage")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data: orders });
  } catch (err) {
    console.error("listMyNoteOrders:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
