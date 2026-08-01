import mongoose from "mongoose";
import { NoteCategory } from "../models/NoteCategory.js";
import { Note } from "../models/Note.js";
import { NotePermission } from "../models/NotePermission.js";
import { NoteOrder } from "../models/NoteOrder.js";
import { User } from "../models/User.js";
import {
  userHasNoteAccess,
  userHasGlobalPremiumNotesAccess,
  serializeNoteForClient,
  slugify,
  grantNotePermission,
} from "../services/notesAccess.service.js";

/* -------------------- Public: Categories -------------------- */

export const listPublicCategories = async (req, res) => {
  try {
    const categories = await NoteCategory.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    return res.json({ success: true, data: categories });
  } catch (err) {
    console.error("listPublicCategories:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------- Public: Notes -------------------- */

export const listPublicNotes = async (req, res) => {
  try {
    const {
      category,
      subject,
      search,
      featured,
      premium,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { isPublished: true };
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }
    if (subject) filter.subject = String(subject).trim();
    if (featured === "true") filter.isFeatured = true;
    if (premium === "true") filter.isPremium = true;
    if (premium === "false") filter.isPremium = false;
    if (search && String(search).trim()) {
      filter.$text = { $search: String(search).trim() };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, notes] = await Promise.all([
      Note.countDocuments(filter),
      Note.find(filter)
        .populate("category", "name slug subject")
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select("-content -contentHtml")
        .lean(),
    ]);

    const globalPremium = userHasGlobalPremiumNotesAccess(req.user);
    let purchasedIds = new Set();
    if (req.user && !globalPremium) {
      const [perms, orders] = await Promise.all([
        NotePermission.find({
          user: req.user._id,
          isActive: true,
          $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        })
          .select("note")
          .lean(),
        NoteOrder.find({ user: req.user._id, status: "paid" }).select("note").lean(),
      ]);
      purchasedIds = new Set([
        ...perms.map((p) => String(p.note)),
        ...orders.map((o) => String(o.note)),
      ]);
    }

    const data = notes.map((n) => {
      const hasAccess =
        !n.isPremium ||
        globalPremium ||
        purchasedIds.has(String(n._id));
      return serializeNoteForClient(n, { hasAccess, includeContent: false });
    });

    return res.json({
      success: true,
      data: {
        items: data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (err) {
    console.error("listPublicNotes:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getPublicNoteBySlugOrId = async (req, res) => {
  try {
    const { slugOrId } = req.params;
    const query = mongoose.Types.ObjectId.isValid(slugOrId)
      ? { $or: [{ _id: slugOrId }, { slug: slugOrId }] }
      : { slug: slugOrId };

    const note = await Note.findOne({ ...query, isPublished: true })
      .populate("category", "name slug subject")
      .lean();

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    const hasAccess = await userHasNoteAccess(req.user, note);

    if (note.isPremium && !hasAccess) {
      return res.status(402).json({
        success: false,
        message: "Purchase required to open this premium note",
        code: "NOTE_PURCHASE_REQUIRED",
        data: serializeNoteForClient(note, { hasAccess: false, includeContent: false }),
      });
    }

    return res.json({
      success: true,
      data: serializeNoteForClient(note, { hasAccess: true, includeContent: true }),
    });
  } catch (err) {
    console.error("getPublicNoteBySlugOrId:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------- Public: Permissions -------------------- */

export const getMyNotePermissions = async (req, res) => {
  try {
    const globalPremium = userHasGlobalPremiumNotesAccess(req.user);

    if (globalPremium) {
      return res.json({
        success: true,
        data: {
          isPremiumStudent: true,
          globalAccess: true,
          noteIds: [],
          message: "Premium student — all notes unlocked",
        },
      });
    }

    const [perms, orders] = await Promise.all([
      NotePermission.find({
        user: req.user._id,
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      })
        .populate("note", "title slug isPremium price")
        .lean(),
      NoteOrder.find({ user: req.user._id, status: "paid" })
        .populate("note", "title slug isPremium price")
        .lean(),
    ]);

    const byNote = new Map();
    for (const p of perms) {
      byNote.set(String(p.note?._id || p.note), {
        noteId: p.note?._id || p.note,
        note: p.note,
        source: p.source,
        expiresAt: p.expiresAt,
      });
    }
    for (const o of orders) {
      const id = String(o.note?._id || o.note);
      if (!byNote.has(id)) {
        byNote.set(id, {
          noteId: o.note?._id || o.note,
          note: o.note,
          source: "purchase",
          orderId: o._id,
        });
      }
    }

    return res.json({
      success: true,
      data: {
        isPremiumStudent: false,
        globalAccess: false,
        noteIds: [...byNote.keys()],
        permissions: [...byNote.values()],
      },
    });
  } catch (err) {
    console.error("getMyNotePermissions:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const checkNotePermission = async (req, res) => {
  try {
    const { noteId } = req.params;
    const note = await Note.findById(noteId).lean();
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }
    const hasAccess = await userHasNoteAccess(req.user, note);
    return res.json({
      success: true,
      data: {
        noteId: note._id,
        isPremium: note.isPremium,
        hasAccess,
        isPremiumStudent: Boolean(req.user?.isPremiumStudent),
      },
    });
  } catch (err) {
    console.error("checkNotePermission:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------- Admin: Categories CRUD -------------------- */

export const adminListCategories = async (req, res) => {
  try {
    const categories = await NoteCategory.find().sort({ sortOrder: 1, name: 1 });
    return res.json({ success: true, data: categories });
  } catch (err) {
    console.error("adminListCategories:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminCreateCategory = async (req, res) => {
  try {
    const { name, slug, description, subject, icon, sortOrder, isActive } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "name is required" });
    }
    const finalSlug = slugify(slug || name);
    const existing = await NoteCategory.findOne({ slug: finalSlug });
    if (existing) {
      return res.status(400).json({ success: false, message: "Category slug already exists" });
    }
    const category = await NoteCategory.create({
      name: String(name).trim(),
      slug: finalSlug,
      description: String(description || "").trim(),
      subject: String(subject || "").trim(),
      icon: String(icon || "").trim(),
      sortOrder: Number(sortOrder) || 0,
      isActive: isActive !== false,
      createdBy: req.user?._id,
    });
    return res.status(201).json({ success: true, data: category });
  } catch (err) {
    console.error("adminCreateCategory:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminUpdateCategory = async (req, res) => {
  try {
    const category = await NoteCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    const { name, slug, description, subject, icon, sortOrder, isActive } = req.body;
    if (name !== undefined) category.name = String(name).trim();
    if (slug !== undefined) category.slug = slugify(slug);
    if (description !== undefined) category.description = String(description).trim();
    if (subject !== undefined) category.subject = String(subject).trim();
    if (icon !== undefined) category.icon = String(icon).trim();
    if (sortOrder !== undefined) category.sortOrder = Number(sortOrder) || 0;
    if (typeof isActive === "boolean") category.isActive = isActive;
    await category.save();
    return res.json({ success: true, data: category });
  } catch (err) {
    console.error("adminUpdateCategory:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminDeleteCategory = async (req, res) => {
  try {
    const noteCount = await Note.countDocuments({ category: req.params.id });
    if (noteCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category with ${noteCount} note(s). Reassign or delete notes first.`,
      });
    }
    const category = await NoteCategory.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    return res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    console.error("adminDeleteCategory:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------- Admin: Notes CRUD -------------------- */

export const adminListNotes = async (req, res) => {
  try {
    const { category, search, published, premium, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (category && mongoose.Types.ObjectId.isValid(category)) filter.category = category;
    if (published === "true") filter.isPublished = true;
    if (published === "false") filter.isPublished = false;
    if (premium === "true") filter.isPremium = true;
    if (premium === "false") filter.isPremium = false;
    if (search && String(search).trim()) {
      const re = new RegExp(String(search).trim(), "i");
      filter.$or = [{ title: re }, { summary: re }, { subject: re }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [total, notes] = await Promise.all([
      Note.countDocuments(filter),
      Note.find(filter)
        .populate("category", "name slug")
        .sort({ updatedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
    ]);

    return res.json({
      success: true,
      data: {
        items: notes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (err) {
    console.error("adminListNotes:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminGetNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).populate("category", "name slug");
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }
    return res.json({ success: true, data: note });
  } catch (err) {
    console.error("adminGetNote:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

function buildNotePayload(body, { partial = false } = {}) {
  const fields = {};
  const map = [
    "title",
    "summary",
    "content",
    "contentHtml",
    "subject",
    "coverImage",
    "currency",
    "metaTitle",
    "metaDescription",
  ];
  for (const key of map) {
    if (body[key] !== undefined) fields[key] = String(body[key] ?? "").trim();
  }
  if (body.slug !== undefined) fields.slug = slugify(body.slug);
  if (body.category !== undefined) fields.category = body.category;
  if (body.tags !== undefined) {
    fields.tags = Array.isArray(body.tags)
      ? body.tags.map((t) => String(t).trim()).filter(Boolean)
      : String(body.tags || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
  }
  if (body.isPremium !== undefined) fields.isPremium = Boolean(body.isPremium);
  if (body.price !== undefined) fields.price = Number(body.price) || 0;
  if (body.isPublished !== undefined) fields.isPublished = Boolean(body.isPublished);
  if (body.isFeatured !== undefined) fields.isFeatured = Boolean(body.isFeatured);
  if (body.sortOrder !== undefined) fields.sortOrder = Number(body.sortOrder) || 0;
  if (body.estimatedReadMinutes !== undefined) {
    fields.estimatedReadMinutes = Number(body.estimatedReadMinutes) || 0;
  }
  if (!partial && !fields.slug && fields.title) {
    fields.slug = slugify(fields.title);
  }
  return fields;
}

export const adminCreateNote = async (req, res) => {
  try {
    const payload = buildNotePayload(req.body);
    if (!payload.title || !payload.category) {
      return res.status(400).json({
        success: false,
        message: "title and category are required",
      });
    }
    if (!payload.slug) payload.slug = slugify(payload.title);

    const exists = await Note.findOne({ slug: payload.slug });
    if (exists) {
      return res.status(400).json({ success: false, message: "Note slug already exists" });
    }

    if (payload.isPremium && !(payload.price > 0)) {
      return res.status(400).json({
        success: false,
        message: "Premium notes require a price greater than 0",
      });
    }

    const note = await Note.create({
      ...payload,
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });
    await note.populate("category", "name slug");
    return res.status(201).json({ success: true, data: note });
  } catch (err) {
    console.error("adminCreateNote:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminUpdateNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }
    const payload = buildNotePayload(req.body, { partial: true });
    Object.assign(note, payload);
    note.updatedBy = req.user?._id;

    if (note.isPremium && !(Number(note.price) > 0)) {
      return res.status(400).json({
        success: false,
        message: "Premium notes require a price greater than 0",
      });
    }

    await note.save();
    await note.populate("category", "name slug");
    return res.json({ success: true, data: note });
  } catch (err) {
    console.error("adminUpdateNote:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminDeleteNote = async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }
    await Promise.all([
      NotePermission.deleteMany({ note: note._id }),
      NoteOrder.deleteMany({ note: note._id, status: { $ne: "paid" } }),
    ]);
    return res.json({ success: true, message: "Note deleted" });
  } catch (err) {
    console.error("adminDeleteNote:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------- Admin: Permissions -------------------- */

export const adminListPermissions = async (req, res) => {
  try {
    const { userId, noteId, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (userId) filter.user = userId;
    if (noteId) filter.note = noteId;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const [total, items] = await Promise.all([
      NotePermission.countDocuments(filter),
      NotePermission.find(filter)
        .populate("user", "name email source isPremiumStudent")
        .populate("note", "title slug isPremium price")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
    ]);

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
    console.error("adminListPermissions:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminGrantPermission = async (req, res) => {
  try {
    const { userId, noteId, expiresAt } = req.body;
    if (!userId || !noteId) {
      return res.status(400).json({
        success: false,
        message: "userId and noteId are required",
      });
    }
    const note = await Note.findById(noteId);
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }
    const permission = await grantNotePermission({
      userId,
      noteId,
      source: "admin_grant",
      grantedBy: req.user?._id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });
    return res.status(201).json({ success: true, data: permission });
  } catch (err) {
    console.error("adminGrantPermission:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const adminRevokePermission = async (req, res) => {
  try {
    const permission = await NotePermission.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );
    if (!permission) {
      return res.status(404).json({ success: false, message: "Permission not found" });
    }
    return res.json({ success: true, data: permission, message: "Permission revoked" });
  } catch (err) {
    console.error("adminRevokePermission:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* -------------------- Admin: Orders list -------------------- */

export const adminListOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const [total, items] = await Promise.all([
      NoteOrder.countDocuments(filter),
      NoteOrder.find(filter)
        .populate("user", "name email source")
        .populate("note", "title slug price")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
    ]);

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
    console.error("adminListOrders:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admin: Registered Student List — ONLY Notes Website registrations
 * Query: User.find({ source: "notes" })
 */
export const adminListNotesStudents = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = {
      role: "student",
      source: "notes",
    };

    if (search && String(search).trim().length >= 2) {
      const re = new RegExp(String(search).trim(), "i");
      filter.$or = [{ name: re }, { email: re }, { phone: re }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const [total, students] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select(
          "name email phone source isPremiumStudent accountType subscriptionStatus isActive status notesLastLoginAt createdAt"
        )
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
    ]);

    console.log("Notes Users", students.length);

    return res.json({
      success: true,
      data: {
        items: students,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (err) {
    console.error("adminListNotesStudents:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
