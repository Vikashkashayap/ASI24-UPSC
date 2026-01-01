import { RunnableLambda } from "@langchain/core/runnables";
import fetch from "node-fetch";

// Mentor agent powered by OpenRouter LLM, with safe fallback
export const mentorAgent = new RunnableLambda({
  func: async (input) => {
    const { message, latestEvaluation, performanceSummary } = input || {};

    // High‑level static advice that is always safe to show
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
      message ||
      "Give me a concise UPSC mains preparation strategy for this week.";

    // System prompt tightly defines tone, length and structure
    const systemPrompt =
      "You are an expert UPSC CSE mains mentor who speaks in simple, student‑friendly English and can mix light Hinglish if the student does so."
      + " Your job is to give very practical, exam‑oriented guidance."
      + " ALWAYS follow this structure in your reply:\n\n"
      + "1) Brief summary (1–2 lines)\n"
      + "2) Exact next 3–5 steps for the student (bullet points)\n"
      + "3) Common mistakes to avoid (2–3 bullets)\n\n"
      + "Hard rules:\n"
      + "- Keep the total answer under 180 words.\n"
      + "- Ground your advice in the student's recent performance and weak areas when such context is provided.\n"
      + "- Be supportive but very direct about what to do today, this week, and how to improve answer writing.\n"
      + "- If the question is vague, first quickly re‑frame it into a clearer goal and then answer.";

    let llmReply = "";

    try {
      const model =
        process.env.OPENROUTER_MODEL ||
        "openai/gpt-4o-mini";
      const apiKey = process.env.OPENROUTER_API_KEY;

      if (!apiKey) {
        throw new Error("Missing OPENROUTER_API_KEY env var");
      }

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            // Optional but recommended for OpenRouter analytics
            "HTTP-Referer": process.env.CLIENT_ORIGIN || "http://localhost:5173",
            "X-Title": "UPSC Mentor - AI Mentor",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Student context:\n${contextSummary}\n\nStudent's question:\n${userQuestion}`,
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`OpenRouter error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      llmReply = data?.choices?.[0]?.message?.content?.trim() || "";
    } catch (error) {
      // If LLM call fails, fall back to deterministic template message
      console.error("Mentor LLM error", error);
    }

    if (!llmReply) {
      const messageNote = message
        ? `You asked: "${message}". The next best step is to convert that doubt into 1–2 written answers and then reflect using the feedback.`
        : "Whenever in doubt, convert it into a short written answer and then analyze it against model structure.";

      return {
        mentorMessage: `${contextSummary} ${messageNote}`,
      };
    }

    return {
      mentorMessage: llmReply,
    };
  },
});
