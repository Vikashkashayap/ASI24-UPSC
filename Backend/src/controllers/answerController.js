import { submitAnswerWithEvaluation, getUserEvaluations } from "../services/answerService.js";

export const submitAnswer = async (req, res) => {
  try {
    const { question, subject, answerText, wordLimit } = req.body;
    
    // Validate required fields
    if (!question || !answerText) {
      return res.status(400).json({ 
        message: "Question and answer text are required" 
      });
    }
    
    const userId = req.user._id;
    const result = await submitAnswerWithEvaluation({
      userId,
      question,
      subject,
      answerText,
      wordLimit,
    });
    
    // Return response in format expected by frontend
    res.status(201).json({
      evaluation: result.evaluation,
      answer: result.answer,
      performanceSummary: result.performanceSummary,
      plannerSummary: result.plannerSummary,
    });
  } catch (error) {
    console.error("Error in submitAnswer:", error);
    res.status(400).json({ 
      message: error.message || "Failed to evaluate answer" 
    });
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
