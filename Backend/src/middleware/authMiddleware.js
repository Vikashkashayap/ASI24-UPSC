import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const token = authHeader.split(" ")[1];

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "Server auth not configured" });
  }

  try {
    const decoded = jwt.verify(token, secret);

    // Handle virtual admin user from env vars
    if (decoded.id === "000000000000000000000000") {
      req.user = {
        _id: "000000000000000000000000",
        name: "Admin User",
        email: process.env.ADMIN_EMAIL,
        role: "admin",
      };
      return next();
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Token expired"
        : error.name === "JsonWebTokenError"
          ? "Invalid token"
          : "Token failed";
    return res.status(401).json({ message });
  }
};
