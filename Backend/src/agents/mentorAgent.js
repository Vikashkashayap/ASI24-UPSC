import { RunnableLambda } from "@langchain/core/runnables";
import { getChatModel } from "../config/openRouterModels.js";
import { openRouterChatCompletion } from "../services/openRouterClient.js";
import crypto from "crypto";

const MENTOR_SYSTEM =
  "Expert UPSC mentor. Under 220 words. TOPIC mode: syllabus fit, 4-8 bullets, 2-4 mains angles, tips. STRATEGY mode: summary, 3-5 next steps, mistakes. Use student context when given. Plain text.";

export const mentorAgent = new RunnableLambda({
  func: async (input) => {
    const { message, latestEvaluation, performanceSummary } = input || {};

    const baseAdvice =
      "Stay consistent with daily answer writing, keep your notes tight, and periodically simulate exam conditions.";

    const scoreNote = latestEvaluation
      ? `Your recent score of ${latestEvaluation.score} shows that you are on the right path, but there is clear scope for structured refinement.`
      : "We will track your scores as you start submitting answers.";

    const weakNote = performanceSummary?.weakSubjects?.length
      ? `Focus extra time this week on ${performanceSummary.weakSubjects.join(", ")}.`
      : "Maintain balanced coverage across all GS papers while gently pushing your weaker areas.";

    const contextSummary = `${baseAdvice} ${scoreNote} ${weakNote}`;
    const userQuestion =
      message || "Give me a concise UPSC mains preparation strategy for this week.";

    let llmReply = "";

    try {
      const model = getChatModel();
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY env var");

      const cacheKey = crypto
        .createHash("sha256")
        .update(`${contextSummary}\n${userQuestion}`)
        .digest("hex")
        .slice(0, 24);

      const result = await openRouterChatCompletion({
        apiKey,
        model,
        messages: [
          { role: "system", content: MENTOR_SYSTEM },
          {
            role: "user",
            content: `Context:\n${contextSummary}\n\nQuestion:\n${userQuestion}`,
          },
        ],
        temperature: 0.5,
        maxTokens: 450,
        xTitle: "UPSC Mentor - AI Mentor",
        cacheTtlSec: 3600,
        cacheKey: `mentor-agent:${cacheKey}`,
        label: "mentor-agent",
      });

      llmReply = result.content?.trim() || "";
    } catch (error) {
      console.error("Mentor LLM error", error);
    }

    if (!llmReply) {
      const messageNote = message
        ? `You asked: "${message}". The next best step is to convert that doubt into 1–2 written answers and then reflect using the feedback.`
        : "Whenever in doubt, convert it into a short written answer and then analyze it against model structure.";

      return { mentorMessage: `${contextSummary} ${messageNote}` };
    }

    return { mentorMessage: llmReply };
  },
});
