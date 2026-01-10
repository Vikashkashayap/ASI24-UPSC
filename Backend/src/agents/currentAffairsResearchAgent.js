import { v4 as uuidv4 } from 'uuid';
import NewsSource from '../models/NewsSource.js';
import TrendingTopic from '../models/TrendingTopic.js';
import ResearchRun from '../models/ResearchRun.js';
import { NewsAPIFetcher, TheHinduFetcher, PIBFetcher, IndianExpressFetcher } from '../tools/newsFetchers.js';
import { TrendingDetector } from '../tools/trendingDetector.js';
import { generateUPSCAnalysis, batchGenerateUPSCAnalyses } from '../chains/upscStructureChain.js';

/**
 * Current Affairs Research Agent
 * Orchestrates the entire research process for trending UPSC current affairs
 */
export class CurrentAffairsResearchAgent {
  constructor() {
    this.trendingDetector = new TrendingDetector();
    this.fetchers = {
      'newsapi': NewsAPIFetcher,
      'thehindu': TheHinduFetcher,
      'pib': PIBFetcher,
      'indianexpress': IndianExpressFetcher
    };
  }

  /**
   * Execute a complete research run
   * @param {Object} config - Research configuration
   * @returns {Promise<Object>} - Research results
   */
  async executeResearch(config = {}) {
    const runId = uuidv4();
    const startTime = new Date();

    const defaultConfig = {
      dateRange: {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        to: new Date()
      },
      sources: [], // Empty means all active sources
      categories: [],
      minRelevanceScore: 30,
      maxTopics: 10,
      minTopics: 4,
      keywords: [],
      generateAnalysis: true,
      updateDatabase: true
    };

    const researchConfig = { ...defaultConfig, ...config };

    try {
      // Create research run record
      const researchRun = await ResearchRun.create({
        runId,
        status: 'running',
        type: config.type || 'manual',
        startTime,
        config: researchConfig,
        progress: { totalSteps: 6, completedSteps: 0 },
        logs: [{
          level: 'info',
          message: 'Research run started',
          timestamp: startTime,
          step: 'initialization'
        }]
      });

      // Step 1: Fetch articles from sources
      await this.updateProgress(researchRun._id, 1, 'Fetching articles from news sources');
      const articles = await this.fetchArticlesFromSources(researchConfig);

      if (articles.length === 0) {
        throw new Error('No articles fetched from any source');
      }

      // Step 2: Detect trending topics
      await this.updateProgress(researchRun._id, 2, 'Analyzing articles for trending topics');
      let trendingTopics = await this.trendingDetector.detectTrendingTopics(articles, {
        dateRange: researchConfig.dateRange,
        minRelevanceScore: researchConfig.minRelevanceScore,
        maxTopics: researchConfig.maxTopics
      });

      // Ensure minimum topics requirement
      if (trendingTopics.length < researchConfig.minTopics) {
        console.log(`Only ${trendingTopics.length} topics found, minimum required: ${researchConfig.minTopics}. Reducing thresholds...`);

        // Try with lower relevance score threshold
        const lowerRelevanceScore = Math.max(10, researchConfig.minRelevanceScore - 10);
        trendingTopics = await this.trendingDetector.detectTrendingTopics(articles, {
          dateRange: researchConfig.dateRange,
          minRelevanceScore: lowerRelevanceScore,
          maxTopics: researchConfig.maxTopics
        });

        // If still not enough, try with lower frequency threshold
        if (trendingTopics.length < researchConfig.minTopics) {
          console.log(`Still only ${trendingTopics.length} topics. Reducing frequency threshold...`);
          trendingTopics = await this.trendingDetector.detectTrendingTopics(articles, {
            dateRange: researchConfig.dateRange,
            minRelevanceScore: lowerRelevanceScore,
            maxTopics: researchConfig.maxTopics,
            minFrequency: 2 // Reduce from default 3 to 2
          });
        }

        // If still not enough, try with even lower relevance score
        if (trendingTopics.length < researchConfig.minTopics) {
          console.log(`Still only ${trendingTopics.length} topics. Further reducing relevance threshold...`);
          trendingTopics = await this.trendingDetector.detectTrendingTopics(articles, {
            dateRange: researchConfig.dateRange,
            minRelevanceScore: 10,
            maxTopics: researchConfig.maxTopics,
            minFrequency: 1 // Even lower frequency
          });
        }
      }

      // Step 3: Update trending topics in database
      let dbUpdateStats = { updated: 0, created: 0 };
      if (researchConfig.updateDatabase && trendingTopics.length > 0) {
        await this.updateProgress(researchRun._id, 3, 'Updating trending topics database');
        dbUpdateStats = await this.trendingDetector.updateTrendingTopics(trendingTopics);
      }

      // Step 4: Generate UPSC analyses
      let analyses = [];
      if (researchConfig.generateAnalysis && trendingTopics.length > 0) {
        await this.updateProgress(researchRun._id, 4, 'Generating UPSC structured analyses');
        analyses = await batchGenerateUPSCAnalyses(trendingTopics, {
          concurrency: 2,
          delay: 2000
        });

        // Update database with analyses
        if (researchConfig.updateDatabase) {
          await this.updateProgress(researchRun._id, 5, 'Saving analyses to database');
          await this.saveAnalysesToDatabase(analyses);
        }
      }

      // Step 5: Finalize research run
      await this.updateProgress(researchRun._id, 6, 'Research completed successfully');
      const endTime = new Date();

      await ResearchRun.findByIdAndUpdate(researchRun._id, {
        status: 'completed',
        endTime,
        duration: endTime - startTime,
        results: {
          topicsFound: trendingTopics.length,
          topicsProcessed: analyses.length,
          topicsUpdated: dbUpdateStats.updated,
          newTopics: dbUpdateStats.created
        },
        progress: { totalSteps: 6, completedSteps: 6, percentage: 100 }
      });

      return {
        success: true,
        runId,
        summary: {
          articlesFetched: articles.length,
          trendingTopicsDetected: trendingTopics.length,
          analysesGenerated: analyses.length,
          databaseUpdates: dbUpdateStats,
          duration: endTime - startTime
        },
        data: {
          trendingTopics,
          analyses: analyses.map(a => a.analysis),
          metadata: analyses.map(a => a.metadata)
        }
      };

    } catch (error) {
      console.error('Research execution error:', error);

      // Update research run with error
      await ResearchRun.findByIdAndUpdate(
        { runId },
        {
          status: 'failed',
          endTime: new Date(),
          $push: {
            errors: {
              step: 'execution',
              error: error.message,
              timestamp: new Date()
            }
          }
        }
      );

      throw error;
    }
  }

  /**
   * Fetch articles from configured news sources
   * @param {Object} config - Research configuration
   * @returns {Promise<Array>} - Array of articles
   */
  async fetchArticlesFromSources(config) {
    const { dateRange, sources: sourceIds, keywords } = config;

    // Get active sources
    let query = { isActive: true };
    if (sourceIds && sourceIds.length > 0) {
      query._id = { $in: sourceIds };
    }

    const sourceDocs = await NewsSource.find(query);

    // If no sources are configured, return some sample articles for development
    if (sourceDocs.length === 0) {
      console.warn('No news sources configured. Using sample articles for development/testing.');
      return this.getSampleArticles(dateRange);
    }

    const articles = [];

    for (const sourceDoc of sourceDocs) {
      try {
        const FetcherClass = this.fetchers[sourceDoc.type];
        if (!FetcherClass) {
          console.warn(`No fetcher available for source type: ${sourceDoc.type}`);
          continue;
        }

        const fetcher = new FetcherClass(sourceDoc._id);
        const sourceArticles = await fetcher.fetchCurrentAffairs(
          dateRange.from,
          dateRange.to,
          keywords
        );

        articles.push(...sourceArticles);

        // Add small delay to avoid overwhelming APIs
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error fetching from ${sourceDoc.name}:`, error);
        // Continue with other sources even if one fails
      }
    }

    return articles;
  }

  /**
   * Get sample articles for development when no news sources are configured
   * @param {Object} dateRange - Date range for articles
   * @returns {Promise<Array>} - Array of sample articles
   */
  async getSampleArticles(dateRange) {
    const sampleArticles = [
      {
        title: "Union Budget 2024: Infrastructure Push and Inclusive Growth Focus",
        description: "Finance Minister Nirmala Sitharaman's Budget 2024 emphasizes infrastructure development with record allocations for roads, railways, and digital connectivity. The budget also introduces measures for employment generation and social welfare.",
        content: "The Union Budget 2024 presented by Finance Minister Nirmala Sitharaman focuses on infrastructure development, digital transformation, and inclusive growth. Key announcements include increased allocation for rural development, green energy initiatives, and digital public infrastructure. The budget allocates ₹11.11 lakh crore for capital expenditure, the highest ever, with significant focus on roads, railways, and urban infrastructure. New employment-linked incentive schemes aim to create 4.1 crore jobs over three years.",
        url: "https://pib.gov.in/PressReleasePage.aspx?PRID=1999999",
        source: "Press Information Bureau",
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        category: "Economy",
        relevanceScore: 95
      },
      {
        title: "Supreme Court Strikes Down Electoral Bonds Scheme as Unconstitutional",
        description: "A five-judge Constitution Bench of the Supreme Court has unanimously declared the electoral bonds scheme unconstitutional, ruling that it violated the right to information of citizens regarding political funding.",
        content: "In a landmark judgment, the Supreme Court has declared the electoral bond scheme unconstitutional, citing concerns over transparency in political funding. The court directed the government to disclose all electoral bond details within three months. The scheme, introduced in 2018, allowed anonymous political donations through bonds purchased from authorized banks. The court held that this violated the citizens' right to know under Article 19(1)(a) of the Constitution.",
        url: "https://indianexpress.com/article/india/electoral-bonds-supreme-court-verdict-9999999/",
        source: "The Indian Express",
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        category: "Politics",
        relevanceScore: 98
      },
      {
        title: "ISRO's Chandrayaan-3 Extends Mission Life with New Discoveries",
        description: "Chandrayaan-3 mission has been extended beyond its planned duration, with the Pragyan rover discovering evidence of ancient volcanic activity and water molecules on the lunar surface.",
        content: "ISRO's Chandrayaan-3 mission continues to provide valuable data about the lunar surface. The mission has successfully completed its primary objectives and is now in extended operations phase. The Pragyan rover has traversed over 100 meters and discovered evidence of ancient volcanic activity. Spectroscopic analysis indicates the presence of hydroxyl and water molecules, supporting theories of water presence in lunar polar regions. This extends India's capabilities in lunar exploration and contributes to global space research.",
        url: "https://www.thehindu.com/sci-tech/science/chandrayaan-3-extends-mission-life/article9999999999999.ece",
        source: "The Hindu",
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        category: "Science & Technology",
        relevanceScore: 88
      },
      {
        title: "India's Updated Nationally Determined Contributions for COP28",
        description: "India has submitted its updated Nationally Determined Contributions (NDCs) to UNFCCC, committing to reduce emission intensity by 45% from 2005 levels by 2030 and achieve net-zero emissions by 2070.",
        content: "India has pledged to achieve net-zero emissions by 2070 during the recent climate negotiations. The government outlined plans for renewable energy expansion, with 500 GW target by 2030, and sustainable development initiatives. The updated NDCs include enhanced commitments for renewable energy deployment, electric vehicle adoption, and forest conservation. India also emphasized the principles of equity and common but differentiated responsibilities in global climate action.",
        url: "https://newsapi.org/article/india-climate-commitments-9999999",
        source: "NewsAPI",
        publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        category: "Environment",
        relevanceScore: 92
      },
      {
        title: "Government Announces Comprehensive Agriculture Technology Mission",
        description: "Union Ministry of Agriculture launches Rs. 2,500 crore mission for agricultural technology adoption, focusing on precision farming, drone technology, and AI-driven crop management.",
        content: "The government has announced new measures to strengthen agricultural technology adoption through a comprehensive mission. The Rs. 2,500 crore initiative focuses on precision farming techniques, drone technology for crop monitoring, and AI-driven decision support systems. Key components include soil health card expansion, crop residue management, and promotion of natural farming practices. The mission aims to improve farmer incomes through technology-driven productivity enhancement and sustainable agricultural practices.",
        url: "https://pib.gov.in/PressReleasePage.aspx?PRID=2000000",
        source: "Press Information Bureau",
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        category: "Agriculture",
        relevanceScore: 82
      }
    ];

    // Filter by date range
    return sampleArticles.filter(article =>
      article.publishedAt >= dateRange.from && article.publishedAt <= dateRange.to
    );
  }

  /**
   * Update research progress
   * @param {string} runId - Research run ID
   * @param {number} step - Current step number
   * @param {string} message - Progress message
   */
  async updateProgress(runId, step, message) {
    const percentage = Math.round((step / 6) * 100);

    await ResearchRun.findByIdAndUpdate(runId, {
      $set: {
        'progress.completedSteps': step,
        'progress.currentStep': message,
        'progress.percentage': percentage
      },
      $push: {
        logs: {
          level: 'info',
          message,
          timestamp: new Date(),
          step: message.toLowerCase().replace(/\s+/g, '_')
        }
      }
    });
  }

  /**
   * Save generated analyses to database
   * @param {Array} analyses - Array of analysis results
   */
  async saveAnalysesToDatabase(analyses) {
    for (const analysisResult of analyses) {
      if (!analysisResult.success) continue;

      const { analysis, metadata } = analysisResult;

      // Update the trending topic with the generated analysis
      await TrendingTopic.findOneAndUpdate(
        { topic: metadata.topic },
        {
          $set: {
            researchData: {
              whyInNews: analysis.whyInNews,
              background: analysis.background,
              prelimsFacts: analysis.prelimsFacts,
              mainsPoints: analysis.mainsPoints,
              probableQuestions: analysis.probableQuestions
            },
            generatedAt: metadata.generatedAt,
            confidenceScore: metadata.relevanceScore
          }
        }
      );
    }
  }

  /**
   * Get trending topics with optional filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Array of trending topics
   */
  async getTrendingTopics(filters = {}) {
    const {
      limit = 20,
      category,
      minRelevanceScore = 0,
      isActive = true,
      sortBy = 'relevanceScore',
      sortOrder = -1
    } = filters;

    const query = { isActive };

    if (category) {
      query.category = category;
    }

    if (minRelevanceScore > 0) {
      query.relevanceScore = { $gte: minRelevanceScore };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;

    const topics = await TrendingTopic.find(query)
      .sort(sortOptions)
      .limit(limit)
      .populate('sources')
      .lean();

    return topics;
  }

  /**
   * Get detailed analysis for a specific topic
   * @param {string} topicId - Topic ID
   * @returns {Promise<Object>} - Detailed topic analysis
   */
  async getTopicAnalysis(topicId) {
    const topic = await TrendingTopic.findById(topicId).lean();

    if (!topic) {
      throw new Error('Topic not found');
    }

    return {
      topic: topic.topic,
      metadata: {
        category: topic.category,
        gsPapers: topic.gsPapers,
        relevanceScore: topic.relevanceScore,
        frequency: topic.frequency,
        sourceCount: topic.sourceCount,
        firstDetected: topic.firstDetected,
        lastUpdated: topic.lastUpdated,
        generatedAt: topic.generatedAt
      },
      sources: topic.sources,
      analysis: topic.researchData
    };
  }

  /**
   * Get research run history
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Array of research runs
   */
  async getResearchHistory(filters = {}) {
    const {
      limit = 10,
      status,
      type,
      sortBy = 'createdAt',
      sortOrder = -1
    } = filters;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;

    const runs = await ResearchRun.find(query)
      .sort(sortOptions)
      .limit(limit)
      .lean();

    return runs;
  }

  /**
   * Retry a failed research run
   * @param {string} runId - Research run ID to retry
   * @returns {Promise<Object>} - Retry results
   */
  async retryResearch(runId) {
    const originalRun = await ResearchRun.findOne({ runId });

    if (!originalRun) {
      throw new Error('Research run not found');
    }

    if (originalRun.status === 'running') {
      throw new Error('Research run is already running');
    }

    if (originalRun.retryCount >= originalRun.maxRetries) {
      throw new Error('Maximum retry attempts exceeded');
    }

    // Create new research run with updated config
    const newConfig = {
      ...originalRun.config,
      type: 'retry'
    };

    return this.executeResearch(newConfig);
  }
}

export default CurrentAffairsResearchAgent;
