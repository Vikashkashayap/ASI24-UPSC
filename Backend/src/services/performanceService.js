import { Evaluation } from "../models/Evaluation.js";
import { Answer } from "../models/Answer.js";
import { runPerformanceChain } from "../chains/performanceChain.js";

export const getPerformanceSummary = async (userId) => {
  const evaluations = await Evaluation.find({ userId }).sort({ createdAt: 1 }).lean();
  const answers = await Answer.find({ userId }).sort({ createdAt: 1 }).lean();

  const merged = evaluations.map((ev) => {
    const ans = answers.find((a) => String(a._id) === String(ev.answerId));
    return {
      ...ev,
      subject: ans?.subject,
      question: ans?.question,
    };
  });

  const performanceSummary = await runPerformanceChain(merged);

  const subjectScores = {};
  merged.forEach((m) => {
    const subject = m.subject || "General";
    if (!subjectScores[subject]) {
      subjectScores[subject] = { total: 0, count: 0 };
    }
    subjectScores[subject].total += m.score;
    subjectScores[subject].count += 1;
  });

  const subjectBreakdown = Object.entries(subjectScores).map(([subject, v]) => ({
    subject,
    average: Math.round(v.total / v.count),
  }));

  return {
    ...performanceSummary,
    subjectBreakdown,
    history: merged.map((m) => ({
      id: m._id,
      score: m.score,
      subject: m.subject,
      question: m.question,
      createdAt: m.createdAt,
    })),
  };
};
