import { authMiddleware } from "./authMiddleware.js";

/**
 * Admin Middleware
 * Ensures the user is authenticated AND has admin role
 * Must be used after authMiddleware
 */
export const adminMiddleware = async (req, res, next) => {
  // First check if user is authenticated (authMiddleware should have set req.user)
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Check if user has admin role
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }

  next();
};

/**
 * Combined middleware: Authentication + Admin check
 * Use this for admin-only routes
 */
export const requireAdmin = [authMiddleware, adminMiddleware];
