import { Evaluation } from "../models/Evaluation.js";
import { Answer } from "../models/Answer.js";
import { runPerformanceChain } from "../chains/performanceChain.js";
import { runMentorChain } from "../chains/mentorChain.js";

export const getMentorResponse = async ({ userId, message }) => {
  const latestEvaluation = await Evaluation.findOne({ userId })
    .sort({ createdAt: -1 })
    .lean();

  const evaluations = await Evaluation.find({ userId }).sort({ createdAt: 1 }).lean();
  const answers = await Answer.find({ userId }).sort({ createdAt: 1 }).lean();

  const merged = evaluations.map((ev) => {
    const ans = answers.find((a) => String(a._id) === String(ev.answerId));
    return {
      ...ev,
      subject: ans?.subject,
      question: ans?.question,
    };
  });

  const performanceSummary = await runPerformanceChain(merged);

  const mentorPayload = {
    message,
    latestEvaluation,
    performanceSummary,
  };

  const mentorResult = await runMentorChain(mentorPayload);

  return {
    mentorMessage: mentorResult.mentorMessage,
  };
};
