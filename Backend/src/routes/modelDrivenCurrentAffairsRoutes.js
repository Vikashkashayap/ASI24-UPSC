import express from 'express';
import ModelDrivenTrendingAgent from '../agents/modelDrivenTrendingAgent.js';
import schedulerService from '../services/schedulerService.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
const modelDrivenAgent = new ModelDrivenTrendingAgent();

/**
 * @route GET /api/model-driven/trending-topics
 * @desc Get model-driven trending current affairs topics
 * @access Private
 */
router.get('/trending-topics', authMiddleware, async (req, res) => {
  try {
    const {
      limit = 20,
      category,
      minImportanceScore = 0,
      sortBy = 'importanceScore',
      sortOrder = 'desc'
    } = req.query;

    const topics = await modelDrivenAgent.getTrendingTopics({
      limit: parseInt(limit),
      category,
      minImportanceScore: parseInt(minImportanceScore),
      sortBy,
      sortOrder: sortOrder === 'desc' ? -1 : 1
    });

    res.json({
      success: true,
      data: topics,
      metadata: {
        total: topics.length,
        filters: {
          limit: parseInt(limit),
          category,
          minImportanceScore: parseInt(minImportanceScore),
          sortBy,
          sortOrder
        },
        generationType: 'model-driven',
        disclaimer: 'These topics are AI-generated based on analytical reasoning and general knowledge. Not based on real-time news or external data sources.'
      }
    });

  } catch (error) {
    console.error('Error fetching model-driven topics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending topics',
      message: error.message
    });
  }
});

/**
 * @route GET /api/model-driven/topic/:id
 * @desc Get detailed analysis for a specific model-driven topic
 * @access Private
 */
router.get('/topic/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const topicAnalysis = await modelDrivenAgent.getTopicAnalysis(id);

    res.json({
      success: true,
      data: topicAnalysis,
      metadata: {
        generationType: 'model-driven',
        disclaimer: 'This analysis is AI-generated based on analytical reasoning and general knowledge. Not based on real-time news or external data sources.'
      }
    });

  } catch (error) {
    console.error('Error fetching topic analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch topic analysis',
      message: error.message
    });
  }
});

/**
 * @route POST /api/model-driven/generate
 * @desc Manually trigger model-driven topic generation
 * @access Private (Admin only)
 */
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const config = req.body || {};

    // Basic authorization check (in production, implement proper role-based access)
    if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin or instructor access required'
      });
    }

    // Trigger manual generation
    const result = await schedulerService.triggerManualModelDrivenResearch(config);

    res.json({
      success: true,
      data: result,
      message: 'Model-driven topic generation completed successfully'
    });

  } catch (error) {
    console.error('Error triggering model-driven generation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate topics',
      message: error.message
    });
  }
});

/**
 * @route GET /api/model-driven/research-history
 * @desc Get history of model-driven research runs
 * @access Private
 */
router.get('/research-history', authMiddleware, async (req, res) => {
  try {
    const {
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const history = await modelDrivenAgent.getResearchHistory({
      limit: parseInt(limit),
      status,
      type: 'model-driven',
      sortBy,
      sortOrder: sortOrder === 'desc' ? -1 : 1
    });

    res.json({
      success: true,
      data: history,
      metadata: {
        total: history.length,
        filters: {
          limit: parseInt(limit),
          status,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Error fetching research history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch research history',
      message: error.message
    });
  }
});

/**
 * @route GET /api/model-driven/stats
 * @desc Get statistics about model-driven topics
 * @access Private
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Get topics from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const topics = await modelDrivenAgent.getTrendingTopics({
      limit: 1000,
      isActive: true
    });

    // Filter for last 30 days
    const recentTopics = topics.filter(topic =>
      new Date(topic.generatedAt) >= thirtyDaysAgo
    );

    // Calculate statistics
    const stats = {
      totalTopics: topics.length,
      recentTopics: recentTopics.length,
      averageImportanceScore: recentTopics.reduce((sum, topic) => sum + topic.importanceScore, 0) / recentTopics.length || 0,
      categoryDistribution: {},
      topTopics: recentTopics
        .sort((a, b) => b.importanceScore - a.importanceScore)
        .slice(0, 5)
        .map(topic => ({
          title: topic.topicTitle,
          importanceScore: topic.importanceScore,
          category: topic.category
        }))
    };

    // Category distribution
    recentTopics.forEach(topic => {
      stats.categoryDistribution[topic.category] = (stats.categoryDistribution[topic.category] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats,
      metadata: {
        period: 'last 30 days',
        generationType: 'model-driven'
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * @route GET /api/model-driven/categories
 * @desc Get available categories for model-driven topics
 * @access Private
 */
router.get('/categories', authMiddleware, (req, res) => {
  const categories = [
    { value: 'Economy', label: 'Indian Economy & Policy' },
    { value: 'Polity', label: 'Governance & Polity' },
    { value: 'IR', label: 'International Relations' },
    { value: 'Environment', label: 'Environment & Climate' },
    { value: 'S&T', label: 'Science & Technology' },
    { value: 'Security', label: 'National Security & Defense' },
    { value: 'Society', label: 'Social Issues & Justice' }
  ];

  res.json({
    success: true,
    data: categories,
    metadata: {
      generationType: 'model-driven'
    }
  });
});

/**
 * @route POST /api/model-driven/refresh-topic/:id
 * @desc Refresh/regenerate analysis for a specific topic
 * @access Private (Admin only)
 */
router.post('/refresh-topic/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Basic authorization check
    if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin or instructor access required'
      });
    }

    // This would require additional implementation in the agent
    // For now, return not implemented
    res.status(501).json({
      success: false,
      error: 'Topic refresh not yet implemented',
      message: 'This feature is planned for future implementation'
    });

  } catch (error) {
    console.error('Error refreshing topic:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh topic',
      message: error.message
    });
  }
});

export default router;
