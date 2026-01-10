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
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("Invalid credentials");
  }
  const match = await user.comparePassword(password);
  if (!match) {
    throw new Error("Invalid credentials");
  }
  const token = createToken(user);
  return { user, token };
};
