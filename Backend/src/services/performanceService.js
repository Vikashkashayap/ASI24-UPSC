import { runPerformanceChain } from "../chains/performanceChain.js";
import CopyEvaluation from "../models/CopyEvaluation.js";
import { User } from "../models/User.js";

export const getPerformanceSummary = async (userId) => {
  try {
    // Fetch all completed evaluations for the user
    const evaluations = await CopyEvaluation.find({ 
      userId, 
      status: 'completed' 
    })
    .sort({ createdAt: -1 })
    .lean();

    if (!evaluations || evaluations.length === 0) {
      return {
        averageScore: 0,
        weakSubjects: [],
        trend: [],
        consistency: 0,
        subjectBreakdown: [],
        history: [],
        totalEvaluations: 0,
        highestScore: 0,
        improvementTrend: 0,
        recentPerformance: []
      };
    }

    // Process evaluation data
    const processedData = evaluations.map(evaluation => ({
      id: evaluation._id.toString(),
      createdAt: evaluation.createdAt,
      subject: evaluation.subject || 'General Studies',
      score: evaluation.finalSummary?.overallScore?.percentage || 0,
      totalMarks: evaluation.finalSummary?.overallScore?.obtained || 0,
      maxMarks: evaluation.finalSummary?.overallScore?.maximum || 0,
      grade: evaluation.finalSummary?.overallScore?.grade || 'C',
      paper: evaluation.paper || 'Unknown',
      year: evaluation.year || new Date().getFullYear()
    }));

    // Calculate subject breakdown
    const subjectMap = {};
    processedData.forEach(item => {
      const subject = item.subject;
      if (!subjectMap[subject]) {
        subjectMap[subject] = { total: 0, count: 0, scores: [] };
      }
      subjectMap[subject].total += item.score;
      subjectMap[subject].count += 1;
      subjectMap[subject].scores.push(item.score);
    });

    const subjectBreakdown = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      average: Math.round(data.total / data.count),
      count: data.count,
      highest: Math.max(...data.scores),
      lowest: Math.min(...data.scores)
    })).sort((a, b) => a.average - b.average);

    // Calculate overall statistics
    const scores = processedData.map(item => item.score);
    const averageScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    // Calculate improvement trend (last 3 vs first 3)
    let improvementTrend = 0;
    if (scores.length >= 3) {
      const recentScores = scores.slice(0, 3);
      const oldScores = scores.slice(-3);
      const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      const oldAvg = oldScores.reduce((a, b) => a + b, 0) / oldScores.length;
      improvementTrend = Math.round(recentAvg - oldAvg);
    }

    // Calculate consistency
    let consistency = 100;
    if (scores.length > 1) {
      let deltas = 0;
      for (let i = 1; i < scores.length; i++) {
        deltas += Math.abs(scores[i] - scores[i - 1]);
      }
      const avgDelta = deltas / (scores.length - 1);
      consistency = Math.max(0, Math.round(100 - avgDelta));
    }

    // Identify weak subjects (bottom 3)
    const weakSubjects = subjectBreakdown.slice(0, 3).map(s => s.subject);

    // Create trend data for charts
    const trend = processedData.map(item => ({
      date: item.createdAt,
      score: item.score,
      subject: item.subject,
      createdAt: item.createdAt
    }));

    // Run AI performance chain for insights
    const performanceSummary = await runPerformanceChain(processedData);

    return {
      ...performanceSummary,
      averageScore,
      highestScore,
      lowestScore,
      weakSubjects,
      trend,
      consistency,
      subjectBreakdown,
      history: processedData,
      totalEvaluations: evaluations.length,
      improvementTrend,
      recentPerformance: processedData.slice(0, 5)
    };
  } catch (error) {
    console.error('Error fetching performance summary:', error);
    return {
      averageScore: 0,
      weakSubjects: [],
      trend: [],
      consistency: 0,
      subjectBreakdown: [],
      history: [],
      totalEvaluations: 0,
      highestScore: 0,
      improvementTrend: 0,
      recentPerformance: []
    };
  }
};

// Get performance data for all students (for agents/admins)
export const getAllStudentsPerformance = async () => {
  try {
    const students = await User.find({ role: { $ne: 'admin' } }).select('_id name email');
    const allPerformance = [];

    for (const student of students) {
      const performance = await getPerformanceSummary(student._id);
      allPerformance.push({
        studentId: student._id.toString(),
        studentName: student.name,
        studentEmail: student.email,
        ...performance
      });
    }

    // Calculate aggregate statistics
    const totalStudents = allPerformance.length;
    const studentsWithData = allPerformance.filter(p => p.totalEvaluations > 0);
    const avgScoreAcrossAll = studentsWithData.length > 0
      ? Math.round(studentsWithData.reduce((sum, p) => sum + p.averageScore, 0) / studentsWithData.length)
      : 0;

    return {
      students: allPerformance,
      aggregateStats: {
        totalStudents,
        activeStudents: studentsWithData.length,
        averageScoreAcrossAll: avgScoreAcrossAll
      }
    };
  } catch (error) {
    console.error('Error fetching all students performance:', error);
    return {
      students: [],
      aggregateStats: {
        totalStudents: 0,
        activeStudents: 0,
        averageScoreAcrossAll: 0
      }
    };
  }
};
