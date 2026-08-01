import { authMiddleware } from "./authMiddleware.js";
import { getNotesAccessContext, canAccessChapter } from "../services/notesPortalAccess.service.js";

/**
 * Attaches req.notesAccess = { fullAccess, source, hasSubscription, reason }
 */
export const notesAccessContextMiddleware = async (req, res, next) => {
  try {
    req.notesAccess = await getNotesAccessContext(req.user || null);
    return next();
  } catch (err) {
    console.error("notesAccessContextMiddleware:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Requires auth + chapter access.
 * Expects req.params.chapterId or req.body.chapterId and subjectId.
 */
export const requireChapterAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    const subjectId = req.params.subjectId || req.body.subjectId || req.query.subjectId;
    const chapterId = req.params.chapterId || req.body.chapterId || req.query.chapterId;

    if (!subjectId || !chapterId) {
      return res.status(400).json({
        success: false,
        message: "subjectId and chapterId are required",
      });
    }

    const result = await canAccessChapter(req.user, subjectId, chapterId);
    req.notesAccess = result;

    if (!result.hasAccess) {
      return res.status(402).json({
        success: false,
        message: "Subscription required to unlock this chapter",
        code: "CHAPTER_LOCKED",
        data: {
          freeChapterIds: result.freeChapterIds || [],
          hasSubscription: result.hasSubscription,
          source: result.source,
        },
      });
    }

    return next();
  } catch (err) {
    console.error("requireChapterAccess:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const requireNotesAuth = [authMiddleware, notesAccessContextMiddleware];
