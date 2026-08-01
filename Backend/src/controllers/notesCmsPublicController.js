import mongoose from "mongoose";
import { NotesSubject } from "../models/NotesSubject.js";
import { NotesChapter } from "../models/NotesChapter.js";
import { NotesContent } from "../models/NotesContent.js";
import { NotesSubscriptionPlan } from "../models/NotesSubscriptionPlan.js";
import {
  getNotesAccessContext,
  getFreeChapterIds,
  canAccessChapter,
} from "../services/notesPortalAccess.service.js";
import {
  createPendingOrder,
  verifyAndActivateSubscription,
} from "../services/order.service.js";

/* -------------------- Catalog (public + gated content) -------------------- */

export const listPublicSubjects = async (req, res) => {
  try {
    const items = await NotesSubject.find({ status: "active" })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const listPublicChapters = async (req, res) => {
  try {
    const { subjectId, subjectSlug } = req.query;
    let subject = null;
    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      subject = await NotesSubject.findOne({ _id: subjectId, status: "active" }).lean();
    } else if (subjectSlug) {
      subject = await NotesSubject.findOne({
        slug: String(subjectSlug).toLowerCase(),
        status: "active",
      }).lean();
    }
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }

    const chapters = await NotesChapter.find({
      subject: subject._id,
      status: "published",
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    const access = await getNotesAccessContext(req.user);
    const freeIds = access.fullAccess
      ? chapters.map((c) => String(c._id))
      : await getFreeChapterIds(subject._id, 2);
    const freeSet = new Set(freeIds);

    const data = chapters.map((c, index) => ({
      ...c,
      chapterIndex: index + 1,
      hasAccess: access.fullAccess || freeSet.has(String(c._id)),
      locked: !(access.fullAccess || freeSet.has(String(c._id))),
    }));

    return res.json({
      success: true,
      data: {
        subject,
        access: {
          fullAccess: access.fullAccess,
          source: access.source,
          hasSubscription: access.hasSubscription,
          reason: access.reason,
        },
        chapters: data,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const listPublicNotesInChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const chapter = await NotesChapter.findOne({
      _id: chapterId,
      status: "published",
    }).lean();
    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    const accessResult = await canAccessChapter(req.user, chapter.subject, chapter._id);
    const notes = await NotesContent.find({
      chapter: chapter._id,
      status: "published",
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .select("-content -contentHtml")
      .lean();

    return res.json({
      success: true,
      data: {
        chapter,
        hasAccess: accessResult.hasAccess,
        locked: accessResult.locked,
        access: accessResult,
        notes: notes.map((n) => ({
          ...n,
          hasAccess: accessResult.hasAccess,
          locked: accessResult.locked,
        })),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getPublicNoteContent = async (req, res) => {
  try {
    const { slugOrId } = req.params;
    const query = mongoose.Types.ObjectId.isValid(slugOrId)
      ? { $or: [{ _id: slugOrId }, { slug: slugOrId }], status: "published" }
      : { slug: slugOrId, status: "published" };

    const note = await NotesContent.findOne(query)
      .populate("subject", "name slug")
      .populate("chapter", "title slug sortOrder status")
      .lean();

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    const accessResult = await canAccessChapter(req.user, note.subject._id || note.subject, note.chapter._id || note.chapter);

    if (!accessResult.hasAccess) {
      return res.status(402).json({
        success: false,
        message: "Subscription required to open this note",
        code: "CHAPTER_LOCKED",
        data: {
          _id: note._id,
          title: note.title,
          slug: note.slug,
          summary: note.summary,
          thumbnail: note.thumbnail,
          subject: note.subject,
          chapter: note.chapter,
          locked: true,
          hasAccess: false,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        ...note,
        locked: false,
        hasAccess: true,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyNotesAccess = async (req, res) => {
  try {
    const access = await getNotesAccessContext(req.user);
    return res.json({ success: true, data: access });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------- Plans & Subscribe -------------------- */

export const listPublicPlans = async (_req, res) => {
  try {
    const items = await NotesSubscriptionPlan.find({ status: "active" })
      .sort({ sortOrder: 1, price: 1 })
      .lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createSubscriptionOrder = async (req, res) => {
  try {
    const body = req.body || {};
    const planId =
      body.planId ||
      body.plan_id ||
      (typeof body.plan === "string" && /^[a-f\d]{24}$/i.test(body.plan)
        ? body.plan
        : undefined);
    const planKey =
      body.planSlug ||
      body.planKey ||
      (typeof body.plan === "string" && !/^[a-f\d]{24}$/i.test(body.plan)
        ? body.plan
        : undefined);
    const { amount, source, subscriptionType } = body;

    const result = await createPendingOrder({
      user: req.user,
      planId,
      planKey,
      amount,
      source: source || "notes",
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
        currency: result.razorpayOrder.currency,
        keyId: result.keyId,
        plan: {
          _id: result.plan._id,
          title: result.plan.title,
          price: result.plan.price,
          duration: result.plan.duration,
        },
      },
    });
  } catch (err) {
    console.error("createSubscriptionOrder:", err);
    return res.status(err.status || 500).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }
};

export const verifySubscriptionOrder = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
    } = req.body;

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
        endDate: result.subscription.endDate ?? result.subscription.expiryDate,
        fullAccess: true,
      },
    });
  } catch (err) {
    console.error("verifySubscriptionOrder:", err);
    return res.status(err.status || 500).json({
      success: false,
      message: err.message,
    });
  }
};
