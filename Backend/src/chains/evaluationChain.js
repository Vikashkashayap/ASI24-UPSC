import { copyEvaluationAgent } from "../agents/copyEvaluationAgent.js";

export const runEvaluationChain = async (payload) => {
  const result = await copyEvaluationAgent.invoke(payload);
  return result;
};
