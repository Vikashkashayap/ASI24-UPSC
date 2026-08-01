import mongoose from "mongoose";
import { NotesSubject } from "../models/NotesSubject.js";
import { NotesChapter } from "../models/NotesChapter.js";
import { NotesContent } from "../models/NotesContent.js";
import { NotesSubscriptionPlan } from "../models/NotesSubscriptionPlan.js";
import { NotesSubscription } from "../models/NotesSubscription.js";
import { NotesStoreOrder } from "../models/NotesStoreOrder.js";
import { NotesPayment } from "../models/NotesPayment.js";
import { User } from "../models/User.js";
import { slugify } from "../services/notesPortalAccess.service.js";

/* -------------------- Subjects -------------------- */

export const adminListSubjects = async (req, res) => {
  try {
    const items = await NotesSubject.find().sort({ sortOrder: 1, name: 1 });
    return res.json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminCreateSubject = async (req, res) => {
  try {
    const { name, slug, description, thumbnail, sortOrder, status, metaTitle, metaDescription } =
      req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });
    const finalSlug = slugify(slug || name);
    if (await NotesSubject.findOne({ slug: finalSlug })) {
      return res.status(400).json({ success: false, message: "Subject slug already exists" });
    }
    const item = await NotesSubject.create({
      name: String(name).trim(),
      slug: finalSlug,
      description: String(description || "").trim(),
      thumbnail: String(thumbnail || "").trim(),
      sortOrder: Number(sortOrder) || 0,
      status: status === "inactive" ? "inactive" : "active",
      metaTitle: String(metaTitle || "").trim(),
      metaDescription: String(metaDescription || "").trim(),
      createdBy: req.user?._id,
    });
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminUpdateSubject = async (req, res) => {
  try {
    const item = await NotesSubject.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Subject not found" });
    const b = req.body;
    if (b.name !== undefined) item.name = String(b.name).trim();
    if (b.slug !== undefined) item.slug = slugify(b.slug);
    if (b.description !== undefined) item.description = String(b.description).trim();
    if (b.thumbnail !== undefined) item.thumbnail = String(b.thumbnail).trim();
    if (b.sortOrder !== undefined) item.sortOrder = Number(b.sortOrder) || 0;
    if (b.status !== undefined) item.status = b.status === "inactive" ? "inactive" : "active";
    if (b.metaTitle !== undefined) item.metaTitle = String(b.metaTitle).trim();
    if (b.metaDescription !== undefined) item.metaDescription = String(b.metaDescription).trim();
    await item.save();
    return res.json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminDeleteSubject = async (req, res) => {
  try {
    const [chapterCount, noteCount] = await Promise.all([
      NotesChapter.countDocuments({ subject: req.params.id }),
      NotesContent.countDocuments({ subject: req.params.id }),
    ]);
    if (chapterCount || noteCount) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${chapterCount} chapter(s) and ${noteCount} note(s) exist. Delete them first.`,
      });
    }
    const item = await NotesSubject.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Subject not found" });
    return res.json({ success: true, message: "Subject deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------- Chapters -------------------- */

export const adminListChapters = async (req, res) => {
  try {
    const filter = {};
    if (req.query.subject && mongoose.Types.ObjectId.isValid(req.query.subject)) {
      filter.subject = req.query.subject;
    }
    const items = await NotesChapter.find(filter)
      .populate("subject", "name slug")
      .sort({ sortOrder: 1, createdAt: 1 });
    return res.json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminCreateChapter = async (req, res) => {
  try {
    const {
      subject,
      title,
      slug,
      description,
      thumbnail,
      sortOrder,
      status,
      metaTitle,
      metaDescription,
    } = req.body;
    if (!subject || !title) {
      return res.status(400).json({ success: false, message: "subject and title are required" });
    }
    const sub = await NotesSubject.findById(subject);
    if (!sub) return res.status(404).json({ success: false, message: "Subject not found" });
    const finalSlug = slugify(slug || title);
    if (await NotesChapter.findOne({ subject, slug: finalSlug })) {
      return res.status(400).json({ success: false, message: "Chapter slug already exists in subject" });
    }
    const item = await NotesChapter.create({
      subject,
      title: String(title).trim(),
      slug: finalSlug,
      description: String(description || "").trim(),
      thumbnail: String(thumbnail || "").trim(),
      sortOrder: Number(sortOrder) || 0,
      status: status === "published" ? "published" : "draft",
      metaTitle: String(metaTitle || "").trim(),
      metaDescription: String(metaDescription || "").trim(),
      createdBy: req.user?._id,
    });
    await item.populate("subject", "name slug");
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminUpdateChapter = async (req, res) => {
  try {
    const item = await NotesChapter.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Chapter not found" });
    const b = req.body;
    if (b.subject !== undefined) item.subject = b.subject;
    if (b.title !== undefined) item.title = String(b.title).trim();
    if (b.slug !== undefined) item.slug = slugify(b.slug);
    if (b.description !== undefined) item.description = String(b.description).trim();
    if (b.thumbnail !== undefined) item.thumbnail = String(b.thumbnail).trim();
    if (b.sortOrder !== undefined) item.sortOrder = Number(b.sortOrder) || 0;
    if (b.status !== undefined) item.status = b.status === "published" ? "published" : "draft";
    if (b.metaTitle !== undefined) item.metaTitle = String(b.metaTitle).trim();
    if (b.metaDescription !== undefined) item.metaDescription = String(b.metaDescription).trim();
    await item.save();
    await item.populate("subject", "name slug");
    return res.json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminDeleteChapter = async (req, res) => {
  try {
    const noteCount = await NotesContent.countDocuments({ chapter: req.params.id });
    if (noteCount) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete chapter with ${noteCount} note(s). Delete notes first.`,
      });
    }
    const item = await NotesChapter.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Chapter not found" });
    return res.json({ success: true, message: "Chapter deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------- Notes content -------------------- */

export const adminListNotesContent = async (req, res) => {
  try {
    const filter = {};
    if (req.query.subject && mongoose.Types.ObjectId.isValid(req.query.subject)) {
      filter.subject = req.query.subject;
    }
    if (req.query.chapter && mongoose.Types.ObjectId.isValid(req.query.chapter)) {
      filter.chapter = req.query.chapter;
    }
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      const re = new RegExp(String(req.query.search).trim(), "i");
      filter.$or = [{ title: re }, { summary: re }];
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [total, items] = await Promise.all([
      NotesContent.countDocuments(filter),
      NotesContent.find(filter)
        .populate("subject", "name slug")
        .populate("chapter", "title slug sortOrder")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    return res.json({
      success: true,
      data: { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminGetNoteContent = async (req, res) => {
  try {
    const item = await NotesContent.findById(req.params.id)
      .populate("subject", "name slug")
      .populate("chapter", "title slug");
    if (!item) return res.status(404).json({ success: false, message: "Note not found" });
    return res.json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminCreateNoteContent = async (req, res) => {
  try {
    const b = req.body;
    if (!b.subject || !b.chapter || !b.title) {
      return res.status(400).json({
        success: false,
        message: "subject, chapter and title are required",
      });
    }
    const finalSlug = slugify(b.slug || b.title);
    if (await NotesContent.findOne({ chapter: b.chapter, slug: finalSlug })) {
      return res.status(400).json({ success: false, message: "Note slug already exists in chapter" });
    }
    const item = await NotesContent.create({
      subject: b.subject,
      chapter: b.chapter,
      title: String(b.title).trim(),
      slug: finalSlug,
      summary: String(b.summary || "").trim(),
      content: String(b.content || ""),
      contentHtml: String(b.contentHtml || ""),
      thumbnail: String(b.thumbnail || "").trim(),
      price: Number(b.price) || 0,
      status: b.status === "published" ? "published" : "draft",
      sortOrder: Number(b.sortOrder) || 0,
      metaTitle: String(b.metaTitle || "").trim(),
      metaDescription: String(b.metaDescription || "").trim(),
      tags: Array.isArray(b.tags)
        ? b.tags
        : String(b.tags || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });
    await item.populate([
      { path: "subject", select: "name slug" },
      { path: "chapter", select: "title slug" },
    ]);
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminUpdateNoteContent = async (req, res) => {
  try {
    const item = await NotesContent.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Note not found" });
    const b = req.body;
    if (b.subject !== undefined) item.subject = b.subject;
    if (b.chapter !== undefined) item.chapter = b.chapter;
    if (b.title !== undefined) item.title = String(b.title).trim();
    if (b.slug !== undefined) item.slug = slugify(b.slug);
    if (b.summary !== undefined) item.summary = String(b.summary).trim();
    if (b.content !== undefined) item.content = String(b.content);
    if (b.contentHtml !== undefined) item.contentHtml = String(b.contentHtml);
    if (b.thumbnail !== undefined) item.thumbnail = String(b.thumbnail).trim();
    if (b.price !== undefined) item.price = Number(b.price) || 0;
    if (b.status !== undefined) item.status = b.status === "published" ? "published" : "draft";
    if (b.sortOrder !== undefined) item.sortOrder = Number(b.sortOrder) || 0;
    if (b.metaTitle !== undefined) item.metaTitle = String(b.metaTitle).trim();
    if (b.metaDescription !== undefined) item.metaDescription = String(b.metaDescription).trim();
    if (b.tags !== undefined) {
      item.tags = Array.isArray(b.tags)
        ? b.tags
        : String(b.tags || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
    }
    item.updatedBy = req.user?._id;
    await item.save();
    await item.populate([
      { path: "subject", select: "name slug" },
      { path: "chapter", select: "title slug" },
    ]);
    return res.json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminDeleteNoteContent = async (req, res) => {
  try {
    const item = await NotesContent.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Note not found" });
    return res.json({ success: true, message: "Note deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------- Pricing plans -------------------- */

export const adminListPlans = async (req, res) => {
  try {
    const items = await NotesSubscriptionPlan.find().sort({ sortOrder: 1, createdAt: -1 });
    return res.json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminCreatePlan = async (req, res) => {
  try {
    const { title, description, price, duration, durationDays, features, status, sortOrder } =
      req.body;
    if (!title || price === undefined || !duration) {
      return res.status(400).json({
        success: false,
        message: "title, price and duration are required",
      });
    }
    const item = await NotesSubscriptionPlan.create({
      title: String(title).trim(),
      description: String(description || "").trim(),
      price: Number(price) || 0,
      duration: String(duration).trim(),
      durationDays:
        durationDays === null || durationDays === "" || durationDays === undefined
          ? null
          : Number(durationDays),
      features: Array.isArray(features)
        ? features.map((f) => String(f).trim()).filter(Boolean)
        : String(features || "")
            .split("\n")
            .map((f) => f.trim())
            .filter(Boolean),
      status: status === "active" ? "active" : "inactive",
      sortOrder: Number(sortOrder) || 0,
      createdBy: req.user?._id,
    });
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminUpdatePlan = async (req, res) => {
  try {
    const item = await NotesSubscriptionPlan.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Plan not found" });
    const b = req.body;
    if (b.title !== undefined) item.title = String(b.title).trim();
    if (b.description !== undefined) item.description = String(b.description).trim();
    if (b.price !== undefined) item.price = Number(b.price) || 0;
    if (b.duration !== undefined) item.duration = String(b.duration).trim();
    if (b.durationDays !== undefined) {
      item.durationDays =
        b.durationDays === null || b.durationDays === "" ? null : Number(b.durationDays);
    }
    if (b.features !== undefined) {
      item.features = Array.isArray(b.features)
        ? b.features.map((f) => String(f).trim()).filter(Boolean)
        : String(b.features || "")
            .split("\n")
            .map((f) => f.trim())
            .filter(Boolean);
    }
    if (b.status !== undefined) item.status = b.status === "active" ? "active" : "inactive";
    if (b.sortOrder !== undefined) item.sortOrder = Number(b.sortOrder) || 0;
    await item.save();
    return res.json({ success: true, data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminDeletePlan = async (req, res) => {
  try {
    const activeSubs = await NotesSubscription.countDocuments({
      plan: req.params.id,
      status: "active",
    });
    if (activeSubs) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan with ${activeSubs} active subscription(s). Deactivate instead.`,
      });
    }
    const item = await NotesSubscriptionPlan.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Plan not found" });
    return res.json({ success: true, message: "Plan deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------- Orders & Payments -------------------- */

export const adminListOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [total, items] = await Promise.all([
      NotesStoreOrder.countDocuments(filter),
      NotesStoreOrder.find(filter)
        .populate("user", "name email phone source")
        .populate("userId", "name email phone source")
        .populate("plan", "title price duration")
        .populate("planId", "title price duration")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const mapped = items.map((o) => {
      const user = o.userId || o.user;
      const plan = o.planId || o.plan;
      return {
        ...o,
        user,
        plan,
        planName: o.planName || plan?.title || "",
        paymentStatus: o.status,
        email: user?.email || "",
      };
    });

    return res.json({
      success: true,
      data: {
        items: mapped,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminListPayments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [total, items] = await Promise.all([
      NotesPayment.countDocuments(filter),
      NotesPayment.find(filter)
        .populate("user", "name email phone source")
        .populate("plan", "title price duration")
        .populate("order", "status amount")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    return res.json({
      success: true,
      data: { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------- Registered Notes Users -------------------- */

export const adminListNotesUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = { role: "student", source: "notes" };
    if (search && String(search).trim().length >= 2) {
      const re = new RegExp(String(search).trim(), "i");
      filter.$or = [{ name: re }, { email: re }, { phone: re }];
    }
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select(
          "name email phone source isPremiumStudent isActive status notesLastLoginAt createdAt"
        )
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
    ]);

    const userIds = users.map((u) => u._id);
    const subs = await NotesSubscription.find({
      user: { $in: userIds },
      status: "active",
    })
      .populate("plan", "title price duration")
      .lean();
    const subByUser = new Map(subs.map((s) => [String(s.user), s]));

    const items = users.map((u) => {
      const sub = subByUser.get(String(u._id));
      return {
        ...u,
        subscription: sub
          ? {
              status: sub.status,
              planTitle: sub.plan?.title || "",
              endDate: sub.endDate,
            }
          : { status: "none", planTitle: "", endDate: null },
      };
    });

    console.log("Notes Users", items.length);

    return res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (err) {
    console.error("adminListNotesUsers:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------- Analytics dashboard -------------------- */

export const adminNotesAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const [
      totalNotesUsers,
      premiumSubscribers,
      revenueAgg,
      plansSold,
      latestRegistrations,
      latestPayments,
      totalNotes,
      publishedNotes,
      totalSubjects,
      totalChapters,
    ] = await Promise.all([
      User.countDocuments({ role: "student", source: "notes" }),
      NotesSubscription.countDocuments({
        status: "active",
        $or: [{ endDate: null }, { endDate: { $gt: now } }],
      }),
      NotesPayment.aggregate([
        { $match: { status: "success" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      NotesStoreOrder.countDocuments({ status: "paid" }),
      User.find({ role: "student", source: "notes" })
        .select("name email phone createdAt notesLastLoginAt")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      NotesPayment.find({ status: "success" })
        .populate("user", "name email")
        .populate("plan", "title price")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      NotesContent.countDocuments(),
      NotesContent.countDocuments({ status: "published" }),
      NotesSubject.countDocuments(),
      NotesChapter.countDocuments(),
    ]);

    return res.json({
      success: true,
      data: {
        totalNotesUsers,
        premiumSubscribers,
        revenue: revenueAgg[0]?.total || 0,
        plansSold,
        totalOrders: plansSold,
        activeSubscriptions: premiumSubscribers,
        premiumUsers: premiumSubscribers,
        totalNotes,
        publishedNotes,
        totalSubjects,
        totalChapters,
        latestRegistrations,
        latestPayments,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
