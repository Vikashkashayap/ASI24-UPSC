import { NoteOrder } from "../models/NoteOrder.js";
import { NotePermission } from "../models/NotePermission.js";

/**
 * Premium access rules for the public Notes Website:
 * - isPremiumStudent === true → all premium notes (portal MD / paid students)
 * - otherwise → must have an active NotePermission or paid NoteOrder
 */
export function userHasGlobalPremiumNotesAccess(user) {
  if (!user) return false;
  if (user.role === "admin" || user.role === "super_admin") return true;
  return user.isPremiumStudent === true;
}

export async function userHasNoteAccess(user, note) {
  if (!note) return false;
  if (!note.isPremium) return true;
  if (!user) return false;
  if (userHasGlobalPremiumNotesAccess(user)) return true;

  const noteId = note._id || note;

  const permission = await NotePermission.findOne({
    user: user._id,
    note: noteId,
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).lean();

  if (permission) return true;

  const paidOrder = await NoteOrder.findOne({
    user: user._id,
    note: noteId,
    status: "paid",
  }).lean();

  return Boolean(paidOrder);
}

export async function grantNotePermission({
  userId,
  noteId,
  source = "purchase",
  orderId = null,
  grantedBy = null,
  expiresAt = null,
}) {
  return NotePermission.findOneAndUpdate(
    { user: userId, note: noteId },
    {
      $set: {
        source,
        order: orderId,
        grantedBy,
        expiresAt,
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Public-safe note payload (strips body when locked). */
export function serializeNoteForClient(note, { hasAccess = false, includeContent = false } = {}) {
  if (!note) return null;
  const obj = typeof note.toObject === "function" ? note.toObject() : { ...note };
  const base = {
    _id: obj._id,
    title: obj.title,
    slug: obj.slug,
    summary: obj.summary || "",
    category: obj.category,
    subject: obj.subject || "",
    tags: obj.tags || [],
    coverImage: obj.coverImage || "",
    isPremium: Boolean(obj.isPremium),
    price: obj.isPremium ? Number(obj.price) || 0 : 0,
    currency: obj.currency || "INR",
    isPublished: Boolean(obj.isPublished),
    isFeatured: Boolean(obj.isFeatured),
    sortOrder: obj.sortOrder || 0,
    estimatedReadMinutes: obj.estimatedReadMinutes || 0,
    metaTitle: obj.metaTitle || "",
    metaDescription: obj.metaDescription || "",
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    hasAccess: Boolean(hasAccess),
  };

  if (includeContent && hasAccess) {
    base.content = obj.content || "";
    base.contentHtml = obj.contentHtml || "";
  } else if (obj.isPremium && !hasAccess) {
    base.content = null;
    base.contentHtml = null;
    base.locked = true;
  } else if (!obj.isPremium) {
    base.content = obj.content || "";
    base.contentHtml = obj.contentHtml || "";
    base.locked = false;
  }

  return base;
}
