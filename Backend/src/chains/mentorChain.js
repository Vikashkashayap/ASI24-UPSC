import { mentorAgent } from "../agents/mentorAgent.js";

export const runMentorChain = async (input) => {
  const result = await mentorAgent.invoke(input);
  return result;
};
