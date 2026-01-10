import { callOpenRouterAPI } from '../services/openRouterService.js';
import TrendingTopic from '../models/TrendingTopic.js';

/**
 * Trending Topics Detection Tool
 * Analyzes news articles to identify trending topics based on frequency and relevance
 */
export class TrendingDetector {
  constructor() {
    this.minFrequency = 3; // Minimum mentions to be considered trending
    this.minRelevanceScore = 30; // Minimum relevance score
  }

  /**
   * Analyze articles and detect trending topics
   * @param {Array} articles - Array of news articles
   * @param {Object} options - Analysis options
   * @returns {Array} - Array of detected trending topics
   */
  async detectTrendingTopics(articles, options = {}) {
    const {
      dateRange = { from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), to: new Date() },
      minFrequency = this.minFrequency,
      minRelevanceScore = this.minRelevanceScore,
      maxTopics = 10
    } = options;

    try {
      // Step 1: Extract and count topics
      const topicFrequency = this.extractTopicsFromArticles(articles);

      // Step 2: Filter by frequency
      const frequentTopics = Object.entries(topicFrequency)
        .filter(([topic, data]) => data.frequency >= minFrequency)
        .map(([topic, data]) => ({ topic, ...data }));

      if (frequentTopics.length === 0) {
        return [];
      }

      // Step 3: Calculate relevance scores using AI
      const topicsWithRelevance = await this.calculateRelevanceScores(frequentTopics, articles);

      // Step 4: Filter and sort by relevance
      const trendingTopics = topicsWithRelevance
        .filter(topic => topic.relevanceScore >= minRelevanceScore)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxTopics);

      // Step 5: Categorize topics
      const categorizedTopics = await this.categorizeTopics(trendingTopics);

      return categorizedTopics;
    } catch (error) {
      console.error('Error detecting trending topics:', error);
      throw error;
    }
  }

  /**
   * Extract topics from articles using NLP techniques
   * @param {Array} articles - Array of articles
   * @returns {Object} - Topic frequency data
   */
  extractTopicsFromArticles(articles) {
    const topicFrequency = {};

    articles.forEach(article => {
      const text = `${article.title} ${article.description || ''} ${article.content || ''}`.toLowerCase();

      // Extract potential topics using simple heuristics
      const topics = this.extractTopicsFromText(text);

      topics.forEach(topic => {
        if (!topicFrequency[topic]) {
          topicFrequency[topic] = {
            frequency: 0,
            sources: [],
            mentions: []
          };
        }

        topicFrequency[topic].frequency += 1;
        topicFrequency[topic].sources.push({
          name: article.source,
          url: article.url,
          publishDate: article.publishedAt,
          snippet: article.description || article.title
        });

        topicFrequency[topic].mentions.push({
          title: article.title,
          date: article.publishedAt
        });
      });
    });

    // Remove duplicates from sources
    Object.keys(topicFrequency).forEach(topic => {
      const uniqueSources = topicFrequency[topic].sources.filter((source, index, self) =>
        index === self.findIndex(s => s.url === source.url)
      );
      topicFrequency[topic].sources = uniqueSources;
      topicFrequency[topic].sourceCount = uniqueSources.length;
    });

    return topicFrequency;
  }

  /**
   * Extract topics from text using simple NLP heuristics
   * @param {string} text - Input text
   * @returns {Array} - Array of extracted topics
   */
  extractTopicsFromText(text) {
    const topics = [];

    // UPSC-relevant keywords and phrases
    const upscKeywords = [
      // Politics & Governance
      'parliament', 'election', 'government', 'minister', 'policy', 'bill', 'amendment',
      'constitution', 'supreme court', 'high court', 'judiciary', 'president', 'prime minister',
      'governor', 'chief minister', 'lok sabha', 'rajya sabha', 'niti aayog',

      // Economy
      'economy', 'gdp', 'inflation', 'budget', 'tax', 'gst', 'finance minister',
      'reserve bank', 'monetary policy', 'fiscal policy', 'economic survey',
      'foreign investment', 'trade', 'export', 'import',

      // International Relations
      'china', 'pakistan', 'united states', 'america', 'russia', 'european union',
      'nato', 'brics', 'saarc', 'asean', 'foreign policy', 'diplomacy',
      'international relations', 'bilateral', 'multilateral',

      // Science & Technology
      'artificial intelligence', 'machine learning', 'space', 'isro', 'satellite',
      'nuclear', 'renewable energy', 'solar', 'wind', 'electric vehicle',
      '5g', 'internet', 'cyber security', 'biotechnology',

      // Environment
      'climate change', 'global warming', 'pollution', 'environment', 'forest',
      'wildlife', 'conservation', 'sustainable development', 'paris agreement',
      'cop', 'biodiversity', 'carbon emission',

      // Society
      'education', 'healthcare', 'poverty', 'inequality', 'women empowerment',
      'social justice', 'reservation', 'caste', 'religion', 'minority rights',
      'rural development', 'urban development'
    ];

    // Check for keyword matches
    upscKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        // Extract phrases around keywords (2-3 words)
        const words = text.split(' ');
        const keywordIndex = words.findIndex(word => word.includes(keyword));

        if (keywordIndex !== -1) {
          const start = Math.max(0, keywordIndex - 1);
          const end = Math.min(words.length, keywordIndex + 2);
          const phrase = words.slice(start, end).join(' ');

          if (phrase.length > 3) {
            topics.push(phrase);
          }
        }
      }
    });

    // Remove duplicates and return
    return [...new Set(topics)];
  }

  /**
   * Calculate relevance scores using AI
   * @param {Array} topics - Array of topics with frequency data
   * @param {Array} articles - All articles for context
   * @returns {Array} - Topics with relevance scores
   */
  async calculateRelevanceScores(topics, articles) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "meta-llama/Meta-Llama-3.1-70B-Instruct";

    if (!apiKey) {
      console.log('OPENROUTER_API_KEY not configured, using fallback scoring');
      return topics.map(topic => ({
        ...topic,
        relevanceScore: Math.min(topic.frequency * 10, 80),
        reasoning: 'Fallback scoring based on frequency (API key not configured)'
      }));
    }

    const systemPrompt = `You are an expert UPSC CSE mentor analyzing current affairs topics for relevance to the UPSC syllabus.

For each topic, provide a relevance score (0-100) based on:
- Importance for UPSC prelims/mains
- Current significance and impact
- Likelihood of appearing in questions
- Connection to syllabus topics

Return ONLY a JSON array with this structure:
[{"topic": "topic name", "relevanceScore": 85, "reasoning": "brief explanation"}]`;

    const topicsText = topics.map(t => `- ${t.topic} (frequency: ${t.frequency})`).join('\n');
    const articlesContext = articles.slice(0, 5).map(a =>
      `${a.title}: ${a.description || ''}`.substring(0, 200)
    ).join('\n\n');

    const userPrompt = `Analyze these topics for UPSC relevance:

TOPICS:
${topicsText}

RECENT ARTICLES CONTEXT:
${articlesContext}

Rate each topic's relevance to UPSC CSE syllabus and current affairs preparation.`;

    try {
      const response = await callOpenRouterAPI({
        apiKey,
        model,
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        maxTokens: 2000
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to get relevance scores");
      }

      // Parse JSON response
      const scores = JSON.parse(response.content.replace(/```json\n?|\n?```/g, ''));

      // Merge scores with topic data
      return topics.map(topic => {
        const scoreData = scores.find(s => s.topic === topic.topic) || { relevanceScore: 50 };
        return {
          ...topic,
          relevanceScore: scoreData.relevanceScore || 50,
          reasoning: scoreData.reasoning || 'AI analysis not available'
        };
      });

    } catch (error) {
      console.error('Error calculating relevance scores:', error);
      // Fallback: assign default scores
      return topics.map(topic => ({
        ...topic,
        relevanceScore: Math.min(topic.frequency * 10, 80),
        reasoning: 'Fallback scoring based on frequency'
      }));
    }
  }

  /**
   * Categorize topics into UPSC GS papers
   * @param {Array} topics - Topics to categorize
   * @returns {Array} - Categorized topics
   */
  async categorizeTopics(topics) {
    const categorizedTopics = [];

    for (const topic of topics) {
      const category = await this.categorizeTopic(topic.topic);
      const gsPapers = this.mapToGSPapers(topic.topic, category);

      categorizedTopics.push({
        ...topic,
        category,
        gsPapers
      });
    }

    return categorizedTopics;
  }

  /**
   * Categorize a single topic
   * @param {string} topic - Topic to categorize
   * @returns {string} - Category
   */
  async categorizeTopic(topic) {
    const topicLower = topic.toLowerCase();

    // Rule-based categorization
    if (topicLower.includes('parliament') || topicLower.includes('election') ||
        topicLower.includes('government') || topicLower.includes('policy') ||
        topicLower.includes('constitution') || topicLower.includes('judiciary')) {
      return 'Politics';
    }

    if (topicLower.includes('economy') || topicLower.includes('gdp') ||
        topicLower.includes('budget') || topicLower.includes('tax') ||
        topicLower.includes('trade') || topicLower.includes('finance')) {
      return 'Economy';
    }

    if (topicLower.includes('china') || topicLower.includes('pakistan') ||
        topicLower.includes('foreign policy') || topicLower.includes('diplomacy') ||
        topicLower.includes('international')) {
      return 'International Relations';
    }

    if (topicLower.includes('artificial intelligence') || topicLower.includes('space') ||
        topicLower.includes('nuclear') || topicLower.includes('technology') ||
        topicLower.includes('satellite')) {
      return 'Science & Technology';
    }

    if (topicLower.includes('climate') || topicLower.includes('environment') ||
        topicLower.includes('pollution') || topicLower.includes('forest') ||
        topicLower.includes('biodiversity')) {
      return 'Environment';
    }

    if (topicLower.includes('education') || topicLower.includes('healthcare') ||
        topicLower.includes('poverty') || topicLower.includes('women') ||
        topicLower.includes('social')) {
      return 'Society';
    }

    if (topicLower.includes('governance') || topicLower.includes('administration') ||
        topicLower.includes('public policy')) {
      return 'Governance';
    }

    if (topicLower.includes('defense') || topicLower.includes('military') ||
        topicLower.includes('security')) {
      return 'Defense';
    }

    return 'Other';
  }

  /**
   * Map topic to GS papers
   * @param {string} topic - Topic name
   * @param {string} category - Topic category
   * @returns {Array} - GS papers
   */
  mapToGSPapers(topic, category) {
    const gsMapping = {
      'Politics': ['GS-II'],
      'Economy': ['GS-III'],
      'International Relations': ['GS-II'],
      'Science & Technology': ['GS-III'],
      'Environment': ['GS-III'],
      'Society': ['GS-I', 'GS-II'],
      'Governance': ['GS-II'],
      'Defense': ['GS-II', 'GS-III'],
      'Other': ['GS-II']
    };

    return gsMapping[category] || ['GS-II'];
  }

  /**
   * Update existing trending topics in database
   * @param {Array} detectedTopics - Newly detected topics
   * @returns {Object} - Update statistics
   */
  async updateTrendingTopics(detectedTopics) {
    let updated = 0;
    let created = 0;

    for (const topic of detectedTopics) {
      const existingTopic = await TrendingTopic.findOne({ topic: topic.topic });

      if (existingTopic) {
        // Update existing topic
        await TrendingTopic.findByIdAndUpdate(existingTopic._id, {
          $inc: { frequency: topic.frequency },
          $set: {
            relevanceScore: Math.max(existingTopic.relevanceScore, topic.relevanceScore),
            lastUpdated: new Date(),
            category: topic.category,
            gsPapers: topic.gsPapers
          },
          $addToSet: {
            sources: { $each: topic.sources }
          },
          $setOnInsert: {
            firstDetected: new Date()
          }
        });
        updated++;
      } else {
        // Create new topic
        await TrendingTopic.create({
          ...topic,
          firstDetected: new Date(),
          lastUpdated: new Date()
        });
        created++;
      }
    }

    return { updated, created };
  }
}
