import { authMiddleware } from "./authMiddleware.js";

/**
 * @param {string[]} roles - allowed roles (e.g. ["mentor"])
 */
export const requireRoles =
  (...roles) =>
  async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this role",
      });
    }
    next();
  };

/** Auth + human mentor role only */
export const requireMentor = [authMiddleware, requireRoles("mentor")];
