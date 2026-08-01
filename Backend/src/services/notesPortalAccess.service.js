import { NotesChapter } from "../models/NotesChapter.js";
import { NotesSubscription } from "../models/NotesSubscription.js";

/**
 * Notes Website access rules:
 * - source === "portal" → full access (Student Portal users)
 * - active Notes subscription → full access
 * - else (notes users, no sub) → first 2 published chapters per subject only
 */
export async function userHasActiveNotesSubscription(userId) {
  if (!userId) return false;
  const now = new Date();
  const sub = await NotesSubscription.findOne({
    status: "active",
    $and: [
      { $or: [{ userId }, { user: userId }] },
      {
        $or: [
          // Lifetime (no expiry)
          {
            $and: [
              { $or: [{ expiryDate: null }, { expiryDate: { $exists: false } }] },
              { $or: [{ endDate: null }, { endDate: { $exists: false } }] },
            ],
          },
          { expiryDate: { $gt: now } },
          { endDate: { $gt: now } },
        ],
      },
    ],
  }).lean();
  return Boolean(sub);
}

export async function getNotesAccessContext(user) {
  if (!user) {
    return {
      authenticated: false,
      fullAccess: false,
      source: null,
      hasSubscription: false,
      reason: "unauthenticated",
    };
  }

  if (user.role === "admin" || user.role === "super_admin") {
    return {
      authenticated: true,
      fullAccess: true,
      source: user.source || "portal",
      hasSubscription: true,
      reason: "admin",
    };
  }

  const source = user.source || "portal";

  if (source === "portal") {
    return {
      authenticated: true,
      fullAccess: true,
      source,
      hasSubscription: true,
      reason: "portal_user",
    };
  }

  const hasSubscription = await userHasActiveNotesSubscription(user._id);
  if (hasSubscription) {
    return {
      authenticated: true,
      fullAccess: true,
      source,
      hasSubscription: true,
      reason: "active_subscription",
    };
  }

  return {
    authenticated: true,
    fullAccess: false,
    source,
    hasSubscription: false,
    reason: "free_tier_first_2_chapters",
  };
}

/** First N published chapters for a subject (by sortOrder, then createdAt). */
export async function getFreeChapterIds(subjectId, limit = 2) {
  const chapters = await NotesChapter.find({
    subject: subjectId,
    status: "published",
  })
    .sort({ sortOrder: 1, createdAt: 1 })
    .select("_id")
    .limit(limit)
    .lean();
  return chapters.map((c) => String(c._id));
}

export async function canAccessChapter(user, subjectId, chapterId) {
  const ctx = await getNotesAccessContext(user);
  if (ctx.fullAccess) {
    return { ...ctx, hasAccess: true, locked: false };
  }
  if (!ctx.authenticated) {
    return { ...ctx, hasAccess: false, locked: true };
  }
  const freeIds = await getFreeChapterIds(subjectId, 2);
  const hasAccess = freeIds.includes(String(chapterId));
  return {
    ...ctx,
    hasAccess,
    locked: !hasAccess,
    freeChapterIds: freeIds,
  };
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

export function computePlanEndDate(startDate, plan) {
  if (!plan) return null;
  if (plan.durationDays == null) {
    const d = String(plan.duration || "").toLowerCase();
    if (d.includes("life")) return null;
    if (d.includes("year")) {
      const end = new Date(startDate);
      end.setFullYear(end.getFullYear() + 1);
      return end;
    }
    if (d.includes("month")) {
      const months = parseInt(d, 10) || 1;
      const end = new Date(startDate);
      end.setMonth(end.getMonth() + months);
      return end;
    }
    return null;
  }
  if (Number(plan.durationDays) <= 0) return null;
  const end = new Date(startDate);
  end.setDate(end.getDate() + Number(plan.durationDays));
  return end;
}
