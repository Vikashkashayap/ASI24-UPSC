import { authMiddleware } from "../../middleware/authMiddleware.js";

const KNOWLEDGE_ROLES = new Set(["admin", "editor", "super_admin"]);

/**
 * Knowledge Base access: Admin / Editor / Super Admin.
 * Existing platform uses role "admin"; editor & super_admin are future-ready.
 */
export async function knowledgeRoleMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (!KNOWLEDGE_ROLES.has(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Knowledge Base requires Admin, Editor, or Super Admin.",
    });
  }

  return next();
}

export const requireKnowledgeAccess = [authMiddleware, knowledgeRoleMiddleware];
