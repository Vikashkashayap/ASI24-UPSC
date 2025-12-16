import { submitAnswerWithEvaluation, getUserEvaluations } from "../services/answerService.js";

export const submitAnswer = async (req, res) => {
  try {
    const { question, subject, answerText, wordLimit } = req.body;
    const userId = req.user._id;
    const result = await submitAnswerWithEvaluation({
      userId,
      question,
      subject,
      answerText,
      wordLimit,
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const listEvaluations = async (req, res) => {
  try {
    const userId = req.user._id;
    const evaluations = await getUserEvaluations(userId);
    res.json({ evaluations });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
