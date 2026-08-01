import { authMiddleware } from "./authMiddleware.js";

/**
 * Attaches req.user when a valid Bearer token is present; otherwise continues as guest.
 */
export const optionalAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }
  return authMiddleware(req, res, next);
};
