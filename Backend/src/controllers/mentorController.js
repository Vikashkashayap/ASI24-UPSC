import { getMentorResponse } from "../services/mentorService.js";

export const mentorChat = async (req, res) => {
  try {
    const userId = req.user._id;
    const { message } = req.body;
    const result = await getMentorResponse({ userId, message });
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
