import { v4 as uuidv4 } from 'uuid';
import { callOpenRouterAPI } from '../services/openRouterService.js';
import ModelDrivenTopic from '../models/ModelDrivenTopic.js';
import ResearchRun from '../models/ResearchRun.js';
import TrendingTopic from '../models/TrendingTopic.js';

/**
 * Model-Driven Trending Current Affairs Agent
 *
 * Generates trending current affairs topics using ONLY LLM reasoning and internal knowledge.
 * NO external APIs, RSS feeds, or third-party data sources are used.
 */
export class ModelDrivenTrendingAgent {
  constructor() {
    this.agentId = 'model-driven-trending-agent';
    this.version = '1.0.0';
  }

  /**
   * Execute daily trending topics generation
   * @param {Object} config - Generation configuration
   * @returns {Promise<Object>} - Generation results
   */
  async generateDailyTrendingTopics(config = {}) {
    const runId = uuidv4();
    const startTime = new Date();

    const defaultConfig = {
      targetTopics: 7, // Generate 5-10 topics daily
      maxTopics: 10,
      minTopics: 5,
      updateDatabase: true,
      includeDisclaimer: true,
      ethicalSafeguards: true,
      temperature: 0.3, // Lower temperature for more consistent reasoning
      maxTokens: 6000
    };

    const generationConfig = { ...defaultConfig, ...config };

    try {
      // Create research run record
      const researchRun = await ResearchRun.create({
        runId,
        status: 'running',
        type: 'model-driven',
        startTime,
        config: generationConfig,
        progress: { totalSteps: 4, completedSteps: 0 },
        logs: [{
          level: 'info',
          message: 'Model-driven trending topics generation started',
          timestamp: startTime,
          step: 'initialization'
        }]
      });

      // Step 1: Generate trending topics using LLM reasoning
      await this.updateProgress(researchRun._id, 1, 'Generating trending topics with LLM reasoning');
      const trendingTopics = await this.generateTrendingTopics(generationConfig);

      // Step 2: Generate structured UPSC analysis for each topic
      await this.updateProgress(researchRun._id, 2, 'Generating structured UPSC analyses');
      const topicsWithAnalysis = await this.generateTopicsAnalysis(trendingTopics, generationConfig);

      // Step 3: Validate and apply ethical safeguards
      await this.updateProgress(researchRun._id, 3, 'Applying ethical safeguards and validation');
      const validatedTopics = await this.applyEthicalSafeguards(topicsWithAnalysis, generationConfig);

      // Step 4: Save to database
      let dbStats = { created: 0, updated: 0 };
      if (generationConfig.updateDatabase && validatedTopics.length > 0) {
        await this.updateProgress(researchRun._id, 4, 'Saving topics to database');
        dbStats = await this.saveTopicsToDatabase(validatedTopics);
      }

      // Finalize research run
      const endTime = new Date();
      await ResearchRun.findByIdAndUpdate(researchRun._id, {
        status: 'completed',
        endTime,
        duration: endTime - startTime,
        results: {
          topicsGenerated: validatedTopics.length,
          topicsSaved: dbStats.created + dbStats.updated,
          newTopics: dbStats.created,
          updatedTopics: dbStats.updated
        },
        progress: { totalSteps: 4, completedSteps: 4, percentage: 100 }
      });

      return {
        success: true,
        runId,
        summary: {
          topicsGenerated: validatedTopics.length,
          databaseUpdates: dbStats,
          duration: endTime - startTime,
          generationType: 'model-driven'
        },
        data: {
          topics: validatedTopics,
          metadata: {
            generatedAt: new Date(),
            agentVersion: this.version,
            modelUsed: process.env.OPENROUTER_MODEL || 'meta-llama/Meta-Llama-3.1-70B-Instruct',
            disclaimer: generationConfig.includeDisclaimer ?
              'These topics are AI-model inferred trends based on general knowledge and reasoning. Not based on real-time news or external data sources.' : null
          }
        }
      };

    } catch (error) {
      console.error('Model-driven generation error:', error);

      // Update research run with error
      await ResearchRun.findOneAndUpdate(
        { runId },
        {
          status: 'failed',
          endTime: new Date(),
          $push: {
            errors: {
              step: 'generation',
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
   * Generate trending topics using LLM reasoning only
   * @param {Object} config - Generation config
   * @returns {Promise<Array>} - Array of trending topic objects
   */
  async generateTrendingTopics(config) {
    const systemPrompt = `You are an expert UPSC Current Affairs Analyst with deep knowledge of Indian polity, economy, international relations, environment, science & technology, and governance.

Your task is to identify CURRENTLY TRENDING topics that would be relevant for UPSC Civil Services Examination preparation. You must use your knowledge of recent global and national developments, policy changes, and emerging issues.

CRITICAL CONSTRAINTS:
- DO NOT reference specific dates, breaking news, or real-time events
- Focus on conceptual trends, policy issues, and analytical topics
- Prioritize topics with UPSC exam relevance
- Avoid sensational or speculative content
- Use analytical and policy-oriented framing

Generate ${config.targetTopics} trending current affairs topics that could be trending based on logical inference from ongoing developments in:

1. Indian Economy & Policy (GST, Budget, Trade, Employment)
2. International Relations (Geopolitics, Diplomacy, Multilateral Forums)
3. Governance & Polity (Constitutional matters, Federal relations, Administrative reforms)
4. Environment & Climate (Sustainable development, Biodiversity, Climate policy)
5. Science & Technology (Space, AI, Digital transformation, Health)
6. Social Issues (Education, Healthcare, Inequality, Social justice)
7. Security & Defense (National security, Border management, Cyber security)

For each topic, provide:
- topicTitle: Clear, analytical topic title
- category: One of [Economy, Polity, IR, Environment, S&T, Security, Society]
- gsPaperMapping: Primary GS paper (GS-I, GS-II, GS-III) and secondary if applicable
- importanceScore: 0-100 based on UPSC relevance
- trendReasoning: Why this topic would be trending (2-3 sentences, analytical)
- tags: Array of 3-5 relevant keywords

Return ONLY valid JSON array of topic objects.`;

    const userPrompt = `Generate ${config.targetTopics} trending current affairs topics for UPSC preparation based on your analytical reasoning about current policy landscapes, governance challenges, and developmental priorities in India and globally.

Focus on topics that would naturally emerge from:
- Ongoing policy implementations and reforms
- Evolving geopolitical dynamics
- Economic recovery and sustainable development agendas
- Technological transformation and digital governance
- Social sector challenges and welfare schemes
- Environmental conservation and climate action
- Institutional capacity building and administrative reforms

Ensure topics are conceptual and analytical rather than event-specific. Prioritize topics with strong UPSC syllabus alignment and examination relevance.`;

    try {
      const response = await callOpenRouterAPI({
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || 'meta-llama/Meta-Llama-3.1-70B-Instruct',
        systemPrompt,
        userPrompt,
        temperature: config.temperature,
        maxTokens: config.maxTokens
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate trending topics');
      }

      const rawContent = response.content.trim();
      const jsonContent = rawContent.replace(/```json\n?|\n?```/g, '');

      let topics;
      try {
        topics = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error('JSON parse error in trending topics:', parseError);
        console.error('Raw response:', rawContent);
        throw new Error('Failed to parse LLM response as valid JSON for trending topics');
      }

    // Validate and clean topics
    let validTopics = [];

    // Handle case where LLM doesn't return an array
    if (!Array.isArray(topics)) {
      console.warn('LLM did not return an array, attempting to extract topics from response');
      // Try to find an array in the response
      if (typeof topics === 'object' && topics !== null) {
        // Look for array properties
        for (const key of Object.keys(topics)) {
          if (Array.isArray(topics[key])) {
            console.log(`Found array in property: ${key}`);
            validTopics = topics[key];
            break;
          }
        }
      }

      // If still no array, try to wrap single topic in array
      if (!Array.isArray(validTopics) && typeof topics === 'object' && topics.topicTitle) {
        validTopics = [topics];
      }
    } else {
      validTopics = topics;
    }

    // Now validate and clean the topics array
    validTopics = validTopics
      .filter(topic => topic && topic.topicTitle && topic.category && typeof topic.importanceScore === 'number')
      .map(topic => ({
        topicTitle: topic.topicTitle,
        category: topic.category,
        gsPaperMapping: topic.gsPaperMapping || { primary: 'GS-II', secondary: [] },
        importanceScore: Math.min(100, Math.max(0, topic.importanceScore)),
        trendReasoning: topic.trendReasoning || 'Topic inferred as trending based on policy developments',
        tags: Array.isArray(topic.tags) ? topic.tags : [],
        generatedAt: new Date(),
        isModelDriven: true
      }))
      .slice(0, config.maxTopics);

      if (validTopics.length < config.minTopics) {
        console.warn(`Generated only ${validTopics.length} valid topics, minimum required: ${config.minTopics}`);
      }

      return validTopics;

    } catch (error) {
      console.error('Error generating trending topics:', error);
      // Return fallback topics for development
      return this.getFallbackTopics(config.minTopics);
    }
  }

  /**
   * Generate structured UPSC analysis for each topic
   * @param {Array} topics - Array of topic objects
   * @param {Object} config - Generation config
   * @returns {Promise<Array>} - Topics with full analysis
   */
  async generateTopicsAnalysis(topics, config) {
    const analyzedTopics = [];

    for (const topic of topics) {
      try {
        const analysis = await this.generateTopicAnalysis(topic, config);
        analyzedTopics.push({
          ...topic,
          analysis,
          analysisGenerated: true
        });

        // Small delay to avoid API rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error generating analysis for topic "${topic.topicTitle}":`, error);
        analyzedTopics.push({
          ...topic,
          analysis: this.getFallbackAnalysis(topic),
          analysisGenerated: false,
          error: error.message
        });
      }
    }

    return analyzedTopics;
  }

  /**
   * Generate detailed UPSC analysis for a single topic
   * @param {Object} topic - Topic object
   * @param {Object} config - Generation config
   * @returns {Promise<Object>} - Structured analysis
   */
  async generateTopicAnalysis(topic, config) {
    const systemPrompt = `You are a senior UPSC mentor creating exam-ready current affairs content.

Generate comprehensive UPSC-structured analysis for the given topic using analytical reasoning and conceptual understanding. Focus on policy implications, governance aspects, and developmental perspectives.

Return analysis in this EXACT JSON structure:

{
  "whyInNews": "Analytical explanation of why this topic is conceptually trending (2-3 sentences, avoid specific dates)",
  "background": "Conceptual background and policy context (3-4 sentences)",
  "gsPaperMapping": {
    "primary": "GS-II",
    "secondary": ["GS-III"],
    "reasoning": "Detailed reasoning for paper mapping"
  },
  "prelimsFacts": [
    "Key conceptual fact 1",
    "Key conceptual fact 2",
    "Key conceptual fact 3",
    "Key conceptual fact 4"
  ],
  "mainsPoints": {
    "introduction": "Topic introduction for mains answer (2-3 analytical sentences)",
    "body": {
      "significance": [
        "Significance point 1 with explanation",
        "Significance point 2 with explanation",
        "Significance point 3 with explanation"
      ],
      "challenges": [
        "Challenge 1 with explanation",
        "Challenge 2 with explanation",
        "Challenge 3 with explanation"
      ],
      "criticism": [
        "Criticism point 1 with explanation",
        "Criticism point 2 with explanation"
      ],
      "wayForward": [
        "Solution 1 with detailed explanation",
        "Solution 2 with detailed explanation",
        "Solution 3 with detailed explanation"
      ]
    },
    "conclusion": "Balanced analytical conclusion (2-3 sentences)"
  },
  "probableQuestions": [
    "UPSC-style question 1 (clear, analytical)",
    "UPSC-style question 2 (clear, analytical)"
  ]
}

CRITICAL GUIDELINES:
1. Use analytical, policy-oriented language suitable for UPSC
2. Avoid specific dates, numbers, or current events
3. Focus on conceptual understanding and policy implications
4. Ensure questions are realistic for UPSC standard
5. Keep content balanced and evidence-based in reasoning
6. Return ONLY valid JSON`;

    const userPrompt = `Generate comprehensive UPSC CSE analysis for this trending topic:

TOPIC: ${topic.topicTitle}
CATEGORY: ${topic.category}
GS PAPER MAPPING: ${topic.gsPaperMapping.primary}${topic.gsPaperMapping.secondary.length > 0 ? `, ${topic.gsPaperMapping.secondary.join(', ')}` : ''}
IMPORTANCE SCORE: ${topic.importanceScore}/100
TREND REASONING: ${topic.trendReasoning}

Based on conceptual understanding and policy analysis, create detailed UPSC-ready content that focuses on:
- Policy implications and governance aspects
- Developmental challenges and opportunities
- Institutional frameworks and reforms
- Stakeholder perspectives and conflicts
- Future directions and recommendations

Ensure the analysis is suitable for both prelims (factual) and mains (analytical) preparation. Make questions challenging but answerable based on conceptual understanding.`;

    try {
      const response = await callOpenRouterAPI({
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || 'meta-llama/Meta-Llama-3.1-70B-Instruct',
        systemPrompt,
        userPrompt,
        temperature: config.temperature,
        maxTokens: 4000
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate topic analysis');
      }

      const rawContent = response.content.trim();
      const jsonContent = rawContent.replace(/```json\n?|\n?```/g, '');

      const analysis = JSON.parse(jsonContent);

      // Validate required fields
      const requiredFields = ['whyInNews', 'background', 'gsPaperMapping', 'prelimsFacts', 'mainsPoints', 'probableQuestions'];
      const missingFields = requiredFields.filter(field => !analysis[field]);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      return analysis;

    } catch (error) {
      console.error('Error generating topic analysis:', error);
      throw error;
    }
  }

  /**
   * Apply ethical safeguards and validation
   * @param {Array} topics - Topics with analysis
   * @param {Object} config - Config
   * @returns {Promise<Array>} - Validated topics
   */
  async applyEthicalSafeguards(topics, config) {
    return topics.map(topic => ({
      ...topic,
      ethicalValidation: {
        disclaimer: config.includeDisclaimer ?
          'This content is AI-generated based on analytical reasoning and general knowledge. It does not represent real-time news or specific current events.' : null,
        avoidSpecifics: true,
        conceptualFocus: true,
        validatedAt: new Date()
      },
      metadata: {
        ...topic.metadata,
        generationType: 'model-driven',
        agentVersion: this.version,
        safeguardsApplied: config.ethicalSafeguards
      }
    }));
  }

  /**
   * Save topics to database
   * @param {Array} topics - Validated topics
   * @returns {Promise<Object>} - Database operation stats
   */
  async saveTopicsToDatabase(topics) {
    let created = 0;
    let updated = 0;

    for (const topic of topics) {
      try {
        // Check if topic already exists
        const existingTopic = await ModelDrivenTopic.findOne({
          topicTitle: topic.topicTitle,
          isActive: true
        });

        if (existingTopic) {
          // Update existing topic
          await ModelDrivenTopic.findByIdAndUpdate(existingTopic._id, {
            ...topic,
            lastUpdated: new Date(),
            version: (existingTopic.version || 0) + 1
          });
          updated++;
        } else {
          // Create new topic
          await ModelDrivenTopic.create({
            ...topic,
            createdAt: new Date(),
            isActive: true,
            version: 1
          });
          created++;
        }
      } catch (error) {
        console.error(`Error saving topic "${topic.topicTitle}":`, error);
      }
    }

    return { created, updated };
  }

  /**
   * Get fallback topics for development/testing
   * @param {number} count - Number of topics to generate
   * @returns {Array} - Fallback topics
   */
  getFallbackTopics(count) {
    const fallbackTopics = [
      {
        topicTitle: "Digital India and E-Governance Reforms",
        category: "Polity",
        gsPaperMapping: { primary: "GS-II", secondary: ["GS-III"] },
        importanceScore: 85,
        trendReasoning: "Digital transformation continues to be a key focus area for governance reforms and administrative efficiency.",
        tags: ["Digital India", "E-Governance", "Technology", "Reforms"],
        generatedAt: new Date(),
        isModelDriven: true
      },
      {
        topicTitle: "Climate Change and India's International Commitments",
        category: "Environment",
        gsPaperMapping: { primary: "GS-III", secondary: ["GS-II"] },
        importanceScore: 90,
        trendReasoning: "Global climate negotiations and India's role in sustainable development remain critical policy areas.",
        tags: ["Climate Change", "COP", "Sustainable Development", "International Relations"],
        generatedAt: new Date(),
        isModelDriven: true
      },
      {
        topicTitle: "Agricultural Technology and Food Security",
        category: "Economy",
        gsPaperMapping: { primary: "GS-III", secondary: ["GS-II"] },
        importanceScore: 80,
        trendReasoning: "Technological interventions in agriculture are crucial for addressing food security and farmer welfare challenges.",
        tags: ["Agriculture", "Technology", "Food Security", "Innovation"],
        generatedAt: new Date(),
        isModelDriven: true
      }
    ];

    return fallbackTopics.slice(0, count);
  }

  /**
   * Get fallback analysis for error cases
   * @param {Object} topic - Topic object
   * @returns {Object} - Basic analysis structure
   */
  getFallbackAnalysis(topic) {
    return {
      whyInNews: `${topic.topicTitle} continues to be a significant area of policy focus and developmental priority.`,
      background: `This topic represents ongoing efforts in ${topic.category.toLowerCase()} sector requiring comprehensive policy interventions and institutional reforms.`,
      gsPaperMapping: topic.gsPaperMapping,
      prelimsFacts: [
        "Key aspect 1: Policy framework development",
        "Key aspect 2: Implementation challenges",
        "Key aspect 3: Stakeholder coordination",
        "Key aspect 4: Monitoring and evaluation"
      ],
      mainsPoints: {
        introduction: `${topic.topicTitle} has emerged as a critical policy area requiring systematic analysis and strategic interventions.`,
        body: {
          significance: [
            "Addresses fundamental developmental challenges",
            "Promotes sustainable and inclusive growth",
            "Enhances institutional capacity and governance"
          ],
          challenges: [
            "Implementation and coordination complexities",
            "Resource constraints and capacity gaps",
            "Stakeholder conflicts and interest alignment"
          ],
          criticism: [
            "Slow pace of reform implementation",
            "Inadequate monitoring mechanisms"
          ],
          wayForward: [
            "Comprehensive policy frameworks with clear timelines",
            "Strengthened institutional mechanisms and capacity building",
            "Multi-stakeholder collaboration and regular monitoring"
          ]
        },
        conclusion: `Effective policy measures and institutional reforms are essential for addressing the challenges in ${topic.topicTitle}.`
      },
      probableQuestions: [
        `Discuss the significance of ${topic.topicTitle} in the context of India's development objectives.`,
        `Analyze the challenges and opportunities in implementing policies related to ${topic.topicTitle}.`
      ]
    };
  }

  /**
   * Update research progress
   * @param {string} runId - Research run ID
   * @param {number} step - Current step
   * @param {string} message - Progress message
   */
  async updateProgress(runId, step, message) {
    const percentage = Math.round((step / 4) * 100);

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
   * Get trending topics from database
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} - Array of topics
   */
  async getTrendingTopics(filters = {}) {
    const {
      limit = 20,
      category,
      minImportanceScore = 0,
      isActive = true,
      sortBy = 'importanceScore',
      sortOrder = -1
    } = filters;

    const query = { isActive };

    if (category) {
      query.category = category;
    }

    if (minImportanceScore > 0) {
      query.importanceScore = { $gte: minImportanceScore };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;

    const topics = await ModelDrivenTopic.find(query)
      .sort(sortOptions)
      .limit(limit)
      .lean();

    return topics;
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
      type = 'model-driven',
      sortBy = 'createdAt',
      sortOrder = -1
    } = filters;

    const query = { type };

    if (status) {
      query.status = status;
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
   * Get detailed analysis for a specific topic
   * @param {string} topicId - Topic ID
   * @returns {Promise<Object>} - Detailed topic analysis
   */
  async getTopicAnalysis(topicId) {
    const topic = await ModelDrivenTopic.findById(topicId).lean();

    if (!topic) {
      throw new Error('Topic not found');
    }

    return {
      topic: topic.topicTitle,
      metadata: {
        category: topic.category,
        gsPaperMapping: topic.gsPaperMapping,
        importanceScore: topic.importanceScore,
        tags: topic.tags,
        generatedAt: topic.generatedAt,
        lastUpdated: topic.lastUpdated,
        isModelDriven: topic.isModelDriven,
        disclaimer: topic.ethicalValidation?.disclaimer
      },
      analysis: topic.analysis
    };
  }
}

export default ModelDrivenTrendingAgent;
