import { performanceAnalyzerAgent } from "../agents/performanceAnalyzerAgent.js";

export const runPerformanceChain = async (evaluations) => {
  const result = await performanceAnalyzerAgent.invoke(evaluations);
  return result;
};
