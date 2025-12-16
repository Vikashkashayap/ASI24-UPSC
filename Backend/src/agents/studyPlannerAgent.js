import { RunnableLambda } from "@langchain/core/runnables";

export const studyPlannerAgent = new RunnableLambda(async (input) => {
  const { weakSubjects = [], averageScore = 0 } = input || {};

  const focusSubjects = weakSubjects.length ? weakSubjects : ["GS1", "GS2", "GS3", "GS4"];

  const dailyPlan = focusSubjects.map((subject, idx) => ({
    day: idx + 1,
    subject,
    tasks: [
      "Revise core static syllabus notes",
      "Solve 2 previous year questions",
      "Write one 10-marker answer under timed conditions",
    ],
  }));

  const weeklyGoals = [
    "Complete one full-length sectional test in a weak subject",
    "Revise value-add notes (facts, reports, examples)",
    "Analyze mistakes from previous tests and update notes",
  ];

  const intensity = averageScore < 50 ? "high" : averageScore < 65 ? "medium" : "refinement";

  return {
    intensity,
    dailyPlan,
    weeklyGoals,
  };
});
