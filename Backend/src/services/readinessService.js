export function calculateReadinessFromPlan(plan, mockAvg) {
  const tasks = plan.tasks || [];
  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length || 1;
  const completion = Math.round((completed / total) * 100);
  const revisionTasks = tasks.filter((t) => t.taskType === "revision");
  const revisionDone = revisionTasks.filter((t) => t.completed).length;
  const revision = revisionTasks.length ? Math.round((revisionDone / revisionTasks.length) * 100) : 50;
  const streak = plan.currentStreak || 0;
  const consistency = Math.min(100, streak * 12);
  const studyHours = Math.min(100, (plan.dailyHours || 6) * 10);
  const mockScores = mockAvg ?? plan.mockTestAverageScore ?? 0;
  const score =
    mockScores * 0.3 +
    completion * 0.25 +
    revision * 0.15 +
    consistency * 0.15 +
    studyHours * 0.15;
  return {
    readinessScore: Math.round(Math.min(100, Math.max(0, score))),
    readinessBreakdown: {
      mockScores: Math.round(mockScores),
      completion,
      revision,
      consistency,
      studyHours: Math.round(studyHours),
    },
  };
}
