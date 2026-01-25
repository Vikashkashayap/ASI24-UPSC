import { User } from "../models/User.js";
import CopyEvaluation from "../models/CopyEvaluation.js";
import Test from "../models/Test.js";

export const getAllStudents = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    // Build query based on search parameter
    let query = { role: 'student' };
    if (search && search.trim().length >= 2) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query = {
        role: 'student',
        $or: [
          { name: searchRegex },
          { email: searchRegex }
        ]
      };
    }

    // Get total count for pagination
    const totalStudents = await User.countDocuments(query);

    // Get students with pagination
    const students = await User.find(query)
      .select('name email createdAt')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    // Get evaluation counts for each student
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const evaluationCount = await CopyEvaluation.countDocuments({
          userId: student._id,
          status: 'completed'
        });

        const latestEvaluation = await CopyEvaluation.findOne({
          userId: student._id,
          status: 'completed'
        })
        .sort({ createdAt: -1 })
        .select('finalSummary.overallScore createdAt subject paper');

        return {
          _id: student._id,
          name: student.name,
          email: student.email,
          createdAt: student.createdAt,
          totalEvaluations: evaluationCount,
          latestScore: latestEvaluation?.finalSummary?.overallScore?.percentage || null,
          lastEvaluationDate: latestEvaluation?.createdAt || null,
          lastSubject: latestEvaluation?.subject || null,
          lastPaper: latestEvaluation?.paper || null
        };
      })
    );

    const totalPages = Math.ceil(totalStudents / parseInt(limit));
    const currentPage = parseInt(page);

    res.json({
      success: true,
      data: {
        students: studentsWithStats,
        pagination: {
          currentPage,
          totalPages,
          total: totalStudents,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
          pages: totalPages
        }
      }
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch students"
    });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await User.findById(id).select('name email role createdAt updatedAt');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Determine activity status based on recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const hasRecentActivity = await CopyEvaluation.exists({
      userId: id,
      createdAt: { $gte: thirtyDaysAgo }
    }) || await Test.exists({
      userId: id,
      createdAt: { $gte: thirtyDaysAgo }
    });

    const lastActivity = await Promise.all([
      CopyEvaluation.findOne({ userId: id }).sort({ createdAt: -1 }).select('createdAt'),
      Test.findOne({ userId: id }).sort({ createdAt: -1 }).select('createdAt')
    ]);

    const lastActivityDate = lastActivity
      .filter(item => item)
      .map(item => item.createdAt)
      .sort((a, b) => b - a)[0] || student.createdAt;

    // Get overall performance stats
    const [mainsStats, prelimsStats] = await Promise.all([
      getMainsStats(id),
      getPrelimsStats(id)
    ]);

    const totalEvaluations = mainsStats.totalEvaluations + prelimsStats.totalTests;
    const overallAverageScore = totalEvaluations > 0
      ? Math.round(((mainsStats.averageScore * mainsStats.totalEvaluations) +
                   (prelimsStats.averageScore * prelimsStats.totalTests)) / totalEvaluations)
      : 0;

    // Calculate improvement percentage (compare recent vs older attempts)
    const improvementPercentage = await calculateImprovementPercentage(id, mainsStats, prelimsStats);

    res.json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          role: student.role,
          joinedAt: student.createdAt,
          lastActive: lastActivityDate,
          status: hasRecentActivity ? 'active' : 'inactive'
        },
        performanceSummary: {
          totalEvaluations,
          averageScore: overallAverageScore,
          highestScore: Math.max(mainsStats.highestScore || 0, prelimsStats.highestScore || 0),
          lowestScore: Math.min(
            mainsStats.lowestScore !== undefined ? mainsStats.lowestScore : 100,
            prelimsStats.lowestScore !== undefined ? prelimsStats.lowestScore : 100
          ),
          improvementPercentage
        },
        mainsStats,
        prelimsStats
      }
    });
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student"
    });
  }
};

export const getStudentPrelims = async (req, res) => {
  try {
    const { id } = req.params;
    const { period } = req.query;

    let dateFilter = {};
    if (period) {
      const now = new Date();
      switch (period) {
        case 'today':
          dateFilter = {
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
            }
          };
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          dateFilter = { createdAt: { $gte: weekStart } };
          break;
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          dateFilter = { createdAt: { $gte: monthStart } };
          break;
      }
    }

    const tests = await Test.find({
      userId: id,
      isSubmitted: true,
      ...dateFilter
    })
    .sort({ createdAt: -1 })
    .limit(50);

    const prelimsData = {
      tests: tests.map(test => ({
        id: test._id,
        subject: test.subject,
        topic: test.topic,
        difficulty: test.difficulty,
        score: test.score,
        accuracy: test.accuracy,
        totalQuestions: test.totalQuestions,
        correctAnswers: test.correctAnswers,
        wrongAnswers: test.wrongAnswers,
        attemptedAt: test.createdAt
      })),
      statistics: await getPrelimsStats(id, dateFilter)
    };

    res.json({
      success: true,
      data: prelimsData
    });
  } catch (error) {
    console.error("Error fetching student prelims:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student prelims data"
    });
  }
};

export const getStudentMains = async (req, res) => {
  try {
    const { id } = req.params;
    const { period } = req.query;

    let dateFilter = {};
    if (period) {
      const now = new Date();
      switch (period) {
        case 'today':
          dateFilter = {
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
            }
          };
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          dateFilter = { createdAt: { $gte: weekStart } };
          break;
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          dateFilter = { createdAt: { $gte: monthStart } };
          break;
      }
    }

    const evaluations = await CopyEvaluation.find({
      userId: id,
      status: 'completed',
      ...dateFilter
    })
    .sort({ createdAt: -1 })
    .select('subject paper year finalSummary evaluations createdAt pdfFileName')
    .limit(50);

    const mainsData = {
      evaluations: evaluations.map(evaluation => ({
        id: evaluation._id,
        subject: evaluation.subject,
        paper: evaluation.paper,
        year: evaluation.year,
        pdfFileName: evaluation.pdfFileName,
        overallScore: evaluation.finalSummary?.overallScore || null,
        totalQuestions: evaluation.evaluations?.length || 0,
        wordCount: evaluation.evaluations?.reduce((sum, q) => sum + (q.wordCount || 0), 0) || 0,
        evaluatedAt: evaluation.createdAt
      })),
      statistics: await getMainsStats(id, dateFilter)
    };

    res.json({
      success: true,
      data: mainsData
    });
  } catch (error) {
    console.error("Error fetching student mains:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student mains data"
    });
  }
};

// Helper function to get mains statistics
const getMainsStats = async (userId, dateFilter = {}) => {
  const evaluations = await CopyEvaluation.find({
    userId,
    status: 'completed',
    ...dateFilter
  }).sort({ createdAt: -1 });

  if (evaluations.length === 0) {
    return {
      totalEvaluations: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      subjectWise: {}
    };
  }

  const scores = evaluations.map(e => e.finalSummary?.overallScore?.percentage || 0);

  // Subject-wise statistics
  const subjectWise = {};
  evaluations.forEach(evaluation => {
    const subject = evaluation.subject || 'General Studies';
    if (!subjectWise[subject]) {
      subjectWise[subject] = { count: 0, totalScore: 0, averageScore: 0 };
    }
    subjectWise[subject].count++;
    subjectWise[subject].totalScore += evaluation.finalSummary?.overallScore?.percentage || 0;
  });

  // Calculate averages
  Object.keys(subjectWise).forEach(subject => {
    const data = subjectWise[subject];
    data.averageScore = Math.round(data.totalScore / data.count);
  });

  return {
    totalEvaluations: evaluations.length,
    averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / evaluations.length),
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    subjectWise
  };
};

// Helper function to get prelims statistics
const getPrelimsStats = async (userId, dateFilter = {}) => {
  const tests = await Test.find({
    userId,
    isSubmitted: true,
    ...dateFilter
  }).sort({ createdAt: -1 });

  if (tests.length === 0) {
    return {
      totalTests: 0,
      averageScore: 0,
      averageAccuracy: 0,
      highestScore: 0,
      subjectWise: {},
      difficultyWise: {}
    };
  }

  const scores = tests.map(t => t.score || 0);
  const accuracies = tests.map(t => t.accuracy || 0);

  // Subject-wise statistics
  const subjectWise = {};
  tests.forEach(test => {
    const subject = test.subject;
    if (!subjectWise[subject]) {
      subjectWise[subject] = { count: 0, totalScore: 0, averageScore: 0, totalAccuracy: 0, averageAccuracy: 0 };
    }
    subjectWise[subject].count++;
    subjectWise[subject].totalScore += test.score || 0;
    subjectWise[subject].totalAccuracy += test.accuracy || 0;
  });

  // Difficulty-wise statistics
  const difficultyWise = {};
  tests.forEach(test => {
    const difficulty = test.difficulty;
    if (!difficultyWise[difficulty]) {
      difficultyWise[difficulty] = { count: 0, totalScore: 0, averageScore: 0, totalAccuracy: 0, averageAccuracy: 0 };
    }
    difficultyWise[difficulty].count++;
    difficultyWise[difficulty].totalScore += test.score || 0;
    difficultyWise[difficulty].totalAccuracy += test.accuracy || 0;
  });

  // Calculate averages
  Object.keys(subjectWise).forEach(subject => {
    const data = subjectWise[subject];
    data.averageScore = Math.round(data.totalScore / data.count);
    data.averageAccuracy = Math.round(data.totalAccuracy / data.count);
  });

  Object.keys(difficultyWise).forEach(difficulty => {
    const data = difficultyWise[difficulty];
    data.averageScore = Math.round(data.totalScore / data.count);
    data.averageAccuracy = Math.round(data.totalAccuracy / data.count);
  });

  return {
    totalTests: tests.length,
    averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / tests.length),
    averageAccuracy: Math.round(accuracies.reduce((sum, acc) => sum + acc, 0) / tests.length),
    highestScore: Math.max(...scores),
    subjectWise,
    difficultyWise
  };
};

// Helper function to calculate improvement percentage
const calculateImprovementPercentage = async (userId, mainsStats, prelimsStats) => {
  const mainsEvaluations = mainsStats.totalEvaluations;
  const prelimsTests = prelimsStats.totalTests;

  if (mainsEvaluations < 2 && prelimsTests < 2) return 0;

  // For mains: compare recent 3 vs older 3
  if (mainsEvaluations >= 6) {
    // Get all mains scores in chronological order (oldest first)
    const mainsScores = await CopyEvaluation.find({
      userId,
      status: 'completed'
    }).sort({ createdAt: 1 }).select('finalSummary.overallScore');

    const scores = mainsScores.map(e => e.finalSummary?.overallScore?.percentage || 0);
    const recentAvg = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const oldAvg = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;

    return Math.round(((recentAvg - oldAvg) / oldAvg) * 100);
  }

  // For prelims: compare recent 3 vs older 3
  if (prelimsTests >= 6) {
    const prelimsScores = await Test.find({
      userId,
      isSubmitted: true
    }).sort({ createdAt: 1 }).select('score');

    const scores = prelimsScores.map(t => t.score || 0);
    const recentAvg = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const oldAvg = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;

    return Math.round(((recentAvg - oldAvg) / oldAvg) * 100);
  }

  return 0;
};

export const getDashboardStats = async (req, res) => {
  try {
    // Get current date for calculations
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get total counts
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalEvaluations = await CopyEvaluation.countDocuments({ status: 'completed' });
    const pendingEvaluations = await CopyEvaluation.countDocuments({ status: { $in: ['pending', 'processing'] } });

    // Recent registrations (last 7 days)
    const recentRegistrations = await User.countDocuments({
      role: 'student',
      createdAt: { $gte: sevenDaysAgo }
    });

    // Active students (who have evaluations in last 30 days)
    const activeStudents = await CopyEvaluation.distinct('userId', {
      status: 'completed',
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Recent evaluations (last 7 days)
    const recentEvaluations = await CopyEvaluation.countDocuments({
      status: 'completed',
      createdAt: { $gte: sevenDaysAgo }
    });

    // Get average scores from all completed evaluations
    const completedEvaluations = await CopyEvaluation.find({ status: 'completed' })
      .select('finalSummary.overallScore userId');

    const averageScore = completedEvaluations.length > 0
      ? Math.round(completedEvaluations.reduce((sum, e) =>
          sum + (e.finalSummary?.overallScore?.percentage || 0), 0) / completedEvaluations.length)
      : 0;

    // Get high performers (above 80%)
    const highPerformers = completedEvaluations.filter(e =>
      (e.finalSummary?.overallScore?.percentage || 0) >= 80
    ).length;

    // Get subject-wise performance
    const subjectPerformance = await CopyEvaluation.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: { $ifNull: ['$subject', 'General Studies'] },
          count: { $sum: 1 },
          avgScore: { $avg: '$finalSummary.overallScore.percentage' },
          maxScore: { $max: '$finalSummary.overallScore.percentage' },
          minScore: { $min: '$finalSummary.overallScore.percentage' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get monthly evaluation trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await CopyEvaluation.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get recent activity (last 10 activities)
    const recentActivity = await CopyEvaluation.find({ status: 'completed' })
      .populate('userId', 'name email')
      .select('userId subject paper year finalSummary.overallScore createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalEvaluations,
          pendingEvaluations,
          recentEvaluations,
          averageScore,
          recentRegistrations,
          activeStudents: activeStudents.length,
          highPerformers
        },
        subjectPerformance: subjectPerformance.map(stat => ({
          subject: stat._id,
          count: stat.count,
          avgScore: Math.round(stat.avgScore || 0),
          maxScore: Math.round(stat.maxScore || 0),
          minScore: Math.round(stat.minScore || 0)
        })),
        monthlyTrend: monthlyStats.map(stat => ({
          month: `${stat._id.year}-${stat._id.month.toString().padStart(2, '0')}`,
          evaluations: stat.count
        })),
        recentActivity: recentActivity.map(activity => ({
          id: activity._id,
          userId: activity.userId?._id,
          userName: activity.userId?.name || 'Unknown',
          userEmail: activity.userId?.email || 'Unknown',
          subject: activity.subject,
          paper: activity.paper,
          year: activity.year,
          score: activity.finalSummary?.overallScore?.percentage || 0,
          evaluatedAt: activity.createdAt
        }))
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics"
    });
  }
};

export const getStudentActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { period } = req.query;

    let dateFilter = {};
    if (period) {
      const now = new Date();
      switch (period) {
        case 'today':
          dateFilter = {
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
            }
          };
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          dateFilter = { createdAt: { $gte: weekStart } };
          break;
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          dateFilter = { createdAt: { $gte: monthStart } };
          break;
      }
    }

    // Get recent activities from different sources
    const [mainsEvaluations, prelimsTests] = await Promise.all([
      CopyEvaluation.find({
        userId: id,
        status: 'completed',
        ...dateFilter
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('subject paper year finalSummary.overallScore createdAt pdfFileName'),

      Test.find({
        userId: id,
        isSubmitted: true,
        ...dateFilter
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('subject topic score accuracy createdAt')
    ]);

    // Combine and sort all activities by date
    const activities = [
      ...mainsEvaluations.map(evaluation => ({
        id: evaluation._id,
        type: 'mains_evaluation',
        title: `Mains Evaluation - ${evaluation.subject}`,
        description: `${evaluation.paper} ${evaluation.year} - Score: ${evaluation.finalSummary?.overallScore?.percentage || 0}%`,
        date: evaluation.createdAt,
        metadata: {
          subject: evaluation.subject,
          paper: evaluation.paper,
          year: evaluation.year,
          score: evaluation.finalSummary?.overallScore?.percentage || 0,
          pdfFileName: evaluation.pdfFileName
        }
      })),
      ...prelimsTests.map(test => ({
        id: test._id,
        type: 'prelims_test',
        title: `Prelims Test - ${test.subject}`,
        description: `${test.topic} - Score: ${test.score}, Accuracy: ${test.accuracy}%`,
        date: test.createdAt,
        metadata: {
          subject: test.subject,
          topic: test.topic,
          score: test.score,
          accuracy: test.accuracy
        }
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30);

    res.json({
      success: true,
      data: {
        activities,
        totalActivities: activities.length
      }
    });
  } catch (error) {
    console.error("Error fetching student activity:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student activity"
    });
  }
};

export const updateStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'suspended'

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'active' or 'suspended'"
      });
    }

    const student = await User.findByIdAndUpdate(
      id,
      {
        status,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.json({
      success: true,
      message: `Student status updated to ${status}`,
      data: {
        id: student._id,
        status: student.status
      }
    });
  } catch (error) {
    console.error("Error updating student status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update student status"
    });
  }
};

export const resetStudentPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await User.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    await User.findByIdAndUpdate(id, {
      password: hashedPassword,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: "Student password reset successfully",
      data: {
        tempPassword, // In production, send this via email instead
        id: student._id
      }
    });
  } catch (error) {
    console.error("Error resetting student password:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset student password"
    });
  }
};

// Search users by name or email
export const searchUsers = async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters"
      });
    }

    const searchRegex = new RegExp(query.trim(), 'i');
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Search users
    const users = await User.find({
      role: 'student',
      $or: [
        { name: searchRegex },
        { email: searchRegex }
      ]
    })
    .select('name email createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Get total count for pagination
    const totalUsers = await User.countDocuments({
      role: 'student',
      $or: [
        { name: searchRegex },
        { email: searchRegex }
      ]
    });

    // Get evaluation stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const evaluationCount = await CopyEvaluation.countDocuments({
          userId: user._id,
          status: 'completed'
        });

        const latestEvaluation = await CopyEvaluation.findOne({
          userId: user._id,
          status: 'completed'
        })
        .sort({ createdAt: -1 })
        .select('finalSummary.overallScore createdAt subject paper');

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          joinedAt: user.createdAt,
          totalEvaluations: evaluationCount,
          latestScore: latestEvaluation?.finalSummary?.overallScore?.percentage || null,
          lastEvaluationDate: latestEvaluation?.createdAt || null,
          lastSubject: latestEvaluation?.subject || null,
          lastPaper: latestEvaluation?.paper || null
        };
      })
    );

    res.json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / parseInt(limit)),
          totalUsers,
          hasNext: parseInt(page) * parseInt(limit) < totalUsers,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search users"
    });
  }
};