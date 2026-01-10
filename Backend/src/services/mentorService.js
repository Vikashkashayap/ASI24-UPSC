import { runPerformanceChain } from "../chains/performanceChain.js";
import { runMentorChain } from "../chains/mentorChain.js";

export const getMentorResponse = async ({ userId, message }) => {
  // Write Answer feature has been removed
  // Mentor now works without Answer/Evaluation data
  const latestEvaluation = null;
  const merged = [];

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
