import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const createToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

export const registerUser = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new Error("Email already registered");
  }
  const user = await User.create({ name, email, password });
  const token = createToken(user);
  return { user, token };
};

export const loginUser = async ({ email, password }) => {
  // First try to find user in database
  const user = await User.findOne({ email });
  if (user) {
    const match = await user.comparePassword(password);
    if (match) {
      const token = createToken(user);
      return { user, token };
    }
  }

  // If database authentication fails, check admin credentials from env vars
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
    // Create a virtual admin user object for JWT token
    const adminUser = {
      _id: "admin-user-id",
      name: "Admin User",
      email: adminEmail,
      role: "admin"
    };
    const token = createToken(adminUser);
    return { user: adminUser, token };
  }

  throw new Error("Invalid credentials");
};
