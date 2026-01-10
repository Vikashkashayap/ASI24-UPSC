import { generateStudentStudyPlan } from "../agents/studentProfilerAgent.js";

/**
 * Student Profiler Chain
 * Wrapper for consistency with other agent chains
 */
export const runStudentProfilerChain = async (input) => {
  const result = await generateStudentStudyPlan(input);
  return result;
};

export default {
  runStudentProfilerChain,
};

