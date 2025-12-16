import { studyPlannerAgent } from "../agents/studyPlannerAgent.js";

export const runPlannerChain = async (input) => {
  const result = await studyPlannerAgent.invoke(input);
  return result;
};
