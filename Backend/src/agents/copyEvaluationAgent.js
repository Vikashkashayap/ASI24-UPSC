import { RunnableLambda } from "@langchain/core/runnables";

// Direct mock evaluator without prompt template (for now)
export const copyEvaluationAgent = new RunnableLambda({
  func: async (input) => {
    // input should have: question, subject, answerText, wordLimit
    const baseScore = 40 + Math.floor(Math.random() * 40);
    const clampedScore = Math.max(0, Math.min(100, baseScore));

    return {
      score: clampedScore,
      feedback: {
        introduction: "Clear context with a relevant opening, but could be sharper.",
        content: "Addresses core dimensions of the question with reasonable depth.",
        structure: "Logical flow with identifiable sub-points and transitions.",
        conclusion: "Summarizes the core stance and suggests a forward-looking way ahead.",
      },
      strengths: [
        "Good articulation of key themes",
        "Balanced coverage of multiple perspectives",
      ],
      weaknesses: [
        "Some arguments lack supporting data or examples",
        "Analysis could be more linked to UPSC-style directives",
      ],
      
      improvements: [
        "Use more current affairs-based examples",
        "Add 1-2 data points or reports to support arguments",
        "Tighten introduction and conclusion to be more exam-oriented",
      ],
      modelAnswer:
        "A high-scoring UPSC-style answer would begin with a sharp definition or context, organize the body into clear sub-headings aligned with the directive, use examples, data and committee reports where relevant, and close with a balanced, forward-looking conclusion that ties back to the core demand of the question.",
    };
  },
});
