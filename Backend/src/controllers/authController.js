import { registerUser, loginUser } from "../services/authService.js";

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const { user, token } = await registerUser({ name, email, password });
    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await loginUser({ email, password });
    res.json({
      user: { id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const me = async (req, res) => {
  res.json({ user: req.user });
};
