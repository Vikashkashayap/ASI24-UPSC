import { runPerformanceChain } from "../chains/performanceChain.js";
import { runMentorChain } from "../chains/mentorChain.js";
import {
  OPENROUTER_APP_TITLES,
  runWithOpenRouterAppTitle,
} from "../config/openRouterAppTitle.js";

export const getMentorResponse = async ({ userId, message }) => {
  return runWithOpenRouterAppTitle(OPENROUTER_APP_TITLES.AI_MENTOR, async () => {
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
  });
};
