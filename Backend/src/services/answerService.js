import { Answer } from "../models/Answer.js";
import { Evaluation } from "../models/Evaluation.js";
import { runEvaluationChain } from "../chains/evaluationChain.js";
import { runPerformanceChain } from "../chains/performanceChain.js";
import { runPlannerChain } from "../chains/plannerChain.js";

export const submitAnswerWithEvaluation = async ({ userId, question, subject, answerText, wordLimit }) => {
  const answer = await Answer.create({ userId, question, subject, answerText, wordLimit });

  const evaluationResult = await runEvaluationChain({
    question,
    subject,
    answerText,
    wordLimit,
  });

  const evaluation = await Evaluation.create({
    answerId: answer._id,
    userId,
    score: evaluationResult.score,
    feedback: evaluationResult.feedback,
    strengths: evaluationResult.strengths,
    weaknesses: evaluationResult.weaknesses,
    improvements: evaluationResult.improvements,
    modelAnswer: evaluationResult.modelAnswer,
  });

  const userEvaluations = await Evaluation.find({ userId }).sort({ createdAt: 1 }).lean();
  const answers = await Answer.find({ userId }).sort({ createdAt: 1 }).lean();

  const merged = userEvaluations.map((ev) => {
    const ans = answers.find((a) => String(a._id) === String(ev.answerId));
    return {
      ...ev,
      subject: ans?.subject,
      question: ans?.question,
    };
  });

  const performanceSummary = await runPerformanceChain(merged);
  const plannerSummary = await runPlannerChain({
    weakSubjects: performanceSummary.weakSubjects,
    averageScore: performanceSummary.averageScore,
  });

  return {
    answer,
    evaluation,
    performanceSummary,
    plannerSummary,
  };
};

export const getUserEvaluations = async (userId) => {
  const evaluations = await Evaluation.find({ userId })
    .sort({ createdAt: -1 })
    .populate({ path: "answerId", select: "question subject wordLimit" })
    .lean();
  return evaluations.map((ev) => ({
    id: ev._id,
    score: ev.score,
    question: ev.answerId?.question,
    subject: ev.answerId?.subject,
    wordLimit: ev.answerId?.wordLimit,
    feedback: ev.feedback,
    strengths: ev.strengths,
    weaknesses: ev.weaknesses,
    improvements: ev.improvements,
    modelAnswer: ev.modelAnswer,
    createdAt: ev.createdAt,
  }));
};
