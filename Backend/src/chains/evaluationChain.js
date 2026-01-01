import { evaluateUPSCAnswer } from "../services/evaluationService.js";

export const runEvaluationChain = async (payload) => {
  const { question, answerText } = payload;

  // Use the new evaluation service
  const evaluation = await evaluateUPSCAnswer(question, answerText);

  // Return in the format expected by answerService
  return {
    success: true,
    evaluation: evaluation
  };
};
