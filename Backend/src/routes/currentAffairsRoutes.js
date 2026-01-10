import express from 'express';
import CurrentAffairsResearchAgent from '../agents/currentAffairsResearchAgent.js';
import ResearchRun from '../models/ResearchRun.js';
import TrendingTopic from '../models/TrendingTopic.js';
import NewsSource from '../models/NewsSource.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
const researchAgent = new CurrentAffairsResearchAgent();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * POST /api/current-affairs/research
 * Execute a new research run
 */
router.post('/research', async (req, res) => {
  try {
    const config = req.body;

    // Add user ID from auth
    config.userId = req.user.id;
    config.type = config.type || 'manual';

    const result = await researchAgent.executeResearch(config);

    res.json({
      success: true,
      message: 'Research completed successfully',
      data: result
    });

  } catch (error) {
    console.error('Research execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Research execution failed',
      message: error.message
    });
  }
});

/**
 * GET /api/current-affairs/topics
 * Get trending topics with optional filters
 */
router.get('/topics', async (req, res) => {
  try {
    const filters = {
      limit: parseInt(req.query.limit) || 20,
      category: req.query.category,
      minRelevanceScore: parseInt(req.query.minRelevanceScore) || 0,
      isActive: req.query.isActive !== 'false',
      sortBy: req.query.sortBy || 'relevanceScore',
      sortOrder: req.query.sortOrder === 'asc' ? 1 : -1
    };

    const topics = await researchAgent.getTrendingTopics(filters);

    res.json({
      success: true,
      data: topics,
      count: topics.length
    });

  } catch (error) {
    console.error('Error fetching trending topics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending topics',
      message: error.message
    });
  }
});

/**
 * GET /api/current-affairs/topics/:id
 * Get detailed analysis for a specific topic
 */
router.get('/topics/:id', async (req, res) => {
  try {
    const topicId = req.params.id;
    const analysis = await researchAgent.getTopicAnalysis(topicId);

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Error fetching topic analysis:', error);
    res.status(404).json({
      success: false,
      error: 'Topic not found',
      message: error.message
    });
  }
});

/**
 * GET /api/current-affairs/history
 * Get research run history
 */
router.get('/history', async (req, res) => {
  try {
    const filters = {
      limit: parseInt(req.query.limit) || 10,
      status: req.query.status,
      type: req.query.type,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder === 'asc' ? 1 : -1
    };

    const history = await researchAgent.getResearchHistory(filters);

    res.json({
      success: true,
      data: history,
      count: history.length
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
 * GET /api/current-affairs/runs/:runId
 * Get detailed information about a specific research run
 */
router.get('/runs/:runId', async (req, res) => {
  try {
    const runId = req.params.runId;
    const run = await ResearchRun.findOne({ runId }).lean();

    if (!run) {
      return res.status(404).json({
        success: false,
        error: 'Research run not found'
      });
    }

    res.json({
      success: true,
      data: run
    });

  } catch (error) {
    console.error('Error fetching research run:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch research run',
      message: error.message
    });
  }
});

/**
 * POST /api/current-affairs/runs/:runId/retry
 * Retry a failed research run
 */
router.post('/runs/:runId/retry', async (req, res) => {
  try {
    const runId = req.params.runId;
    const result = await researchAgent.retryResearch(runId);

    res.json({
      success: true,
      message: 'Research retry initiated successfully',
      data: result
    });

  } catch (error) {
    console.error('Error retrying research:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry research',
      message: error.message
    });
  }
});

/**
 * GET /api/current-affairs/sources
 * Get available news sources
 */
router.get('/sources', async (req, res) => {
  try {
    const sources = await NewsSource.find({ isActive: true })
      .select('name type category reliabilityScore lastFetched errorCount successCount')
      .sort({ reliabilityScore: -1 })
      .lean();

    res.json({
      success: true,
      data: sources,
      count: sources.length
    });

  } catch (error) {
    console.error('Error fetching news sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news sources',
      message: error.message
    });
  }
});

/**
 * POST /api/current-affairs/sources
 * Add or update a news source (admin only)
 */
router.post('/sources', async (req, res) => {
  try {
    const sourceData = req.body;

    // Validate required fields
    const requiredFields = ['name', 'url', 'type', 'apiEndpoint'];
    const missingFields = requiredFields.filter(field => !sourceData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        fields: missingFields
      });
    }

    // Check if source already exists
    let source = await NewsSource.findOne({ name: sourceData.name });

    if (source) {
      // Update existing source
      Object.assign(source, sourceData);
      await source.save();
    } else {
      // Create new source
      source = await NewsSource.create(sourceData);
    }

    res.json({
      success: true,
      message: source ? 'Source updated successfully' : 'Source created successfully',
      data: source
    });

  } catch (error) {
    console.error('Error saving news source:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save news source',
      message: error.message
    });
  }
});

/**
 * GET /api/current-affairs/stats
 * Get current affairs research statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // Get topic statistics
    const topicStats = await TrendingTopic.aggregate([
      {
        $group: {
          _id: null,
          totalTopics: { $sum: 1 },
          activeTopics: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          avgRelevanceScore: { $avg: '$relevanceScore' },
          avgFrequency: { $avg: '$frequency' },
          categories: { $addToSet: '$category' }
        }
      }
    ]);

    // Get research run statistics
    const runStats = await ResearchRun.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentRuns = await ResearchRun.find({
      createdAt: { $gte: thirtyDaysAgo }
    }).countDocuments();

    const recentTopics = await TrendingTopic.find({
      firstDetected: { $gte: thirtyDaysAgo }
    }).countDocuments();

    const stats = {
      topics: topicStats[0] || {
        totalTopics: 0,
        activeTopics: 0,
        avgRelevanceScore: 0,
        avgFrequency: 0,
        categories: []
      },
      researchRuns: runStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      recentActivity: {
        runsLast30Days: recentRuns,
        topicsLast30Days: recentTopics
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * DELETE /api/current-affairs/topics/:id
 * Deactivate a trending topic (soft delete)
 */
router.delete('/topics/:id', async (req, res) => {
  try {
    const topicId = req.params.id;

    const topic = await TrendingTopic.findByIdAndUpdate(
      topicId,
      { isActive: false },
      { new: true }
    );

    if (!topic) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found'
      });
    }

    res.json({
      success: true,
      message: 'Topic deactivated successfully',
      data: topic
    });

  } catch (error) {
    console.error('Error deactivating topic:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate topic',
      message: error.message
    });
  }
});

/**
 * POST /api/current-affairs/seed-sources
 * Seed default news sources (development only)
 */
router.post('/seed-sources', async (req, res) => {
  try {
    // Clear existing sources
    await NewsSource.deleteMany({});

    // Seed default sources
    const sources = [
      {
        name: 'NewsAPI.org',
        url: 'https://newsapi.org',
        type: 'newsapi',
        category: 'national',
        reliabilityScore: 85,
        apiEndpoint: 'https://newsapi.org/v2/everything',
        apiKey: process.env.NEWSAPI_KEY || 'demo-key',
        isActive: true,
        rateLimit: { requests: 100, period: 60 },
        fetchConfig: { timeout: 30000, retries: 3, retryDelay: 1000 }
      },
      {
        name: 'The Hindu',
        url: 'https://www.thehindu.com',
        type: 'thehindu',
        category: 'national',
        reliabilityScore: 90,
        apiEndpoint: 'https://www.thehindu.com',
        isActive: true,
        rateLimit: { requests: 10, period: 60 },
        fetchConfig: { timeout: 30000, retries: 3, retryDelay: 1000 }
      },
      {
        name: 'Press Information Bureau',
        url: 'https://pib.gov.in',
        type: 'pib',
        category: 'government',
        reliabilityScore: 95,
        apiEndpoint: 'https://pib.gov.in',
        isActive: true,
        rateLimit: { requests: 30, period: 60 },
        fetchConfig: { timeout: 30000, retries: 3, retryDelay: 1000 }
      }
    ];

    const createdSources = await NewsSource.insertMany(sources);

    res.json({
      success: true,
      message: `Seeded ${createdSources.length} news sources`,
      data: createdSources
    });

  } catch (error) {
    console.error('Error seeding sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed news sources',
      message: error.message
    });
  }
});

export default router;
