import { RunnableLambda } from "@langchain/core/runnables";

export const performanceAnalyzerAgent = new RunnableLambda({
  func: async (evaluations) => {
    if (!evaluations || evaluations.length === 0) {
      return {
        averageScore: 0,
        weakSubjects: [],
        trend: [],
        consistency: 0,
      };
    }

    const bySubject = {};
    const trend = [];

    evaluations.forEach((ev) => {
      const subject = ev.subject || "General";
      if (!bySubject[subject]) {
        bySubject[subject] = { total: 0, count: 0 };
      }
      bySubject[subject].total += ev.score;
      bySubject[subject].count += 1;
      trend.push({ date: ev.createdAt, score: ev.score, subject });
    });

    const totalScore = evaluations.reduce((sum, e) => sum + e.score, 0);
    const averageScore = totalScore / evaluations.length;

    const weakSubjects = Object.entries(bySubject)
      .map(([subject, v]) => ({ subject, avg: v.total / v.count }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 3)
      .map((x) => x.subject);

    let consistency = 0;
    if (trend.length > 1) {
      let deltas = 0;
      for (let i = 1; i < trend.length; i++) {
        deltas += Math.abs(trend[i].score - trend[i - 1].score);
      }
      const avgDelta = deltas / (trend.length - 1);
      consistency = Math.max(0, 100 - avgDelta);
    }

    return {
      averageScore: Math.round(averageScore),
      weakSubjects,
      trend,
      consistency: Math.round(consistency),
    };
  },
});
