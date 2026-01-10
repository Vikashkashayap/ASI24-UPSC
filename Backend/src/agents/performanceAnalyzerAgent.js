import { RunnableLambda } from "@langchain/core/runnables";

export const performanceAnalyzerAgent = new RunnableLambda({
  func: async (evaluations) => {
    if (!evaluations || evaluations.length === 0) {
      return {
        averageScore: 0,
        weakSubjects: [],
        trend: [],
        consistency: 0,
        performanceInsights: {
          strengths: [],
          weaknesses: [],
          improvementAreas: [],
          recommendations: []
        }
      };
    }

    const bySubject = {};
    const trend = [];

    evaluations.forEach((ev) => {
      const subject = ev.subject || "General";
      if (!bySubject[subject]) {
        bySubject[subject] = { total: 0, count: 0, scores: [] };
      }
      bySubject[subject].total += ev.score;
      bySubject[subject].count += 1;
      bySubject[subject].scores.push(ev.score);
      trend.push({ date: ev.createdAt, score: ev.score, subject, type: ev.testType || 'evaluation' });
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

    // Generate performance insights
    const performanceInsights = {
      strengths: Object.entries(bySubject)
        .filter(([_, v]) => (v.total / v.count) >= 70)
        .map(([subject, _]) => subject),
      weaknesses: weakSubjects,
      improvementAreas: weakSubjects.length > 0 ? weakSubjects : ['General Practice'],
      recommendations: generateRecommendations(bySubject, averageScore, consistency, trend)
    };

    return {
      averageScore: Math.round(averageScore),
      weakSubjects,
      trend,
      consistency: Math.round(consistency),
      performanceInsights
    };
  },
});

// Helper function to generate AI-powered recommendations
function generateRecommendations(bySubject, averageScore, consistency, trend) {
  const recommendations = [];

  // Score-based recommendations
  if (averageScore < 50) {
    recommendations.push("Focus on building foundational knowledge through consistent practice");
  } else if (averageScore < 70) {
    recommendations.push("Work on accuracy and time management to improve scores");
  } else {
    recommendations.push("Maintain high performance and focus on weak areas");
  }

  // Consistency recommendations
  if (consistency < 50) {
    recommendations.push("Improve consistency by regular practice and revision");
  }

  // Subject-specific recommendations
  Object.entries(bySubject).forEach(([subject, data]) => {
    const avg = data.total / data.count;
    if (avg < 40) {
      recommendations.push(`Prioritize ${subject} - needs significant improvement`);
    } else if (avg < 60) {
      recommendations.push(`Strengthen ${subject} knowledge through targeted practice`);
    }
  });

  // Trend-based recommendations
  if (trend.length >= 3) {
    const recent = trend.slice(0, 3).reduce((sum, t) => sum + t.score, 0) / 3;
    const older = trend.slice(-3).reduce((sum, t) => sum + t.score, 0) / 3;
    if (recent > older + 10) {
      recommendations.push("Great improvement! Keep up the momentum");
    } else if (older > recent + 10) {
      recommendations.push("Recent scores are declining - review study approach");
    }
  }

  return recommendations.slice(0, 5); // Limit to top 5 recommendations
}
