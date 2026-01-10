import { callOpenRouterAPI } from '../services/openRouterService.js';

/**
 * Model-Driven Current Affairs Chain
 * Generates trending topics and analyses using LLM reasoning only
 */

// System prompts for different generation stages
const TRENDING_TOPICS_SYSTEM_PROMPT = `You are an expert UPSC Current Affairs Analyst with deep knowledge of Indian polity, economy, international relations, environment, science & technology, and governance.

Your task is to identify CURRENTLY TRENDING topics that would be relevant for UPSC Civil Services Examination preparation. You must use your knowledge of recent global and national developments, policy changes, and emerging issues.

CRITICAL CONSTRAINTS:
- DO NOT reference specific dates, breaking news, or real-time events
- Focus on conceptual trends, policy issues, and analytical topics
- Prioritize topics with UPSC exam relevance
- Avoid sensational or speculative content
- Use analytical and policy-oriented framing

Generate trending current affairs topics that could be trending based on logical inference from ongoing developments in:

1. Indian Economy & Policy (GST, Budget, Trade, Employment)
2. International Relations (Geopolitics, Diplomacy, Multilateral Forums)
3. Governance & Polity (Constitutional matters, Federal relations, Administrative reforms)
4. Environment & Climate (Sustainable development, Biodiversity, Climate policy)
5. Science & Technology (Space, AI, Digital transformation, Health)
6. Social Issues (Education, Healthcare, Inequality, Social justice)
7. Security & Defense (National security, Border management, Cyber security)

For each topic, provide the EXACT JSON structure specified in the user prompt.`;

const TOPIC_ANALYSIS_SYSTEM_PROMPT = `You are a senior UPSC mentor creating exam-ready current affairs content.

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

/**
 * Generate trending topics using LLM reasoning
 * @param {Object} config - Generation configuration
 * @returns {Promise<Array>} - Array of trending topic objects
 */
export const generateModelDrivenTopics = async (config = {}) => {
  const {
    targetTopics = 7,
    categories = ['Economy', 'Polity', 'IR', 'Environment', 'S&T', 'Security', 'Society'],
    temperature = 0.3,
    maxTokens = 6000
  } = config;

  const userPrompt = `Generate ${targetTopics} trending current affairs topics for UPSC preparation based on your analytical reasoning about current policy landscapes, governance challenges, and developmental priorities in India and globally.

Focus on topics that would naturally emerge from:
- Ongoing policy implementations and reforms in: ${categories.join(', ')}
- Evolving geopolitical dynamics and diplomatic relations
- Economic recovery and sustainable development agendas
- Technological transformation and digital governance initiatives
- Social sector challenges and welfare scheme implementations
- Environmental conservation and climate action frameworks
- Institutional capacity building and administrative modernization

Return a JSON array of exactly ${targetTopics} topics with this structure:
[{
  "topicTitle": "Clear, analytical topic title",
  "category": "One of: ${categories.join(', ')}",
  "gsPaperMapping": {
    "primary": "GS-II",
    "secondary": ["GS-III"]
  },
  "importanceScore": 85,
  "trendReasoning": "Why this topic would be trending (2-3 sentences, analytical)",
  "tags": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}]

Ensure topics are conceptual and analytical rather than event-specific. Prioritize topics with strong UPSC syllabus alignment and examination relevance. Return ONLY the JSON array.`;

  try {
    const response = await callOpenRouterAPI({
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || 'meta-llama/Meta-Llama-3.1-70B-Instruct',
      systemPrompt: TRENDING_TOPICS_SYSTEM_PROMPT,
      userPrompt,
      temperature,
      maxTokens
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
    const validTopics = topics
      .filter(topic =>
        topic.topicTitle &&
        topic.category &&
        categories.includes(topic.category) &&
        topic.importanceScore &&
        topic.trendReasoning
      )
      .map(topic => ({
        ...topic,
        importanceScore: Math.min(100, Math.max(0, topic.importanceScore)),
        generatedAt: new Date(),
        isModelDriven: true
      }));

    if (validTopics.length === 0) {
      throw new Error('No valid topics generated');
    }

    return {
      success: true,
      topics: validTopics,
      metadata: {
        generatedAt: new Date(),
        targetTopics,
        actualTopics: validTopics.length,
        model: response.model,
        usage: response.usage
      }
    };

  } catch (error) {
    console.error('Error in generateModelDrivenTopics:', error);
    return {
      success: false,
      error: error.message,
      topics: [],
      metadata: {
        generatedAt: new Date(),
        targetTopics,
        actualTopics: 0
      }
    };
  }
};

/**
 * Generate detailed UPSC analysis for a specific topic
 * @param {Object} topicData - Topic information
 * @param {Object} config - Generation configuration
 * @returns {Promise<Object>} - Structured analysis
 */
export const generateTopicAnalysis = async (topicData, config = {}) => {
  const {
    temperature = 0.3,
    maxTokens = 4000
  } = config;

  const { topicTitle, category, gsPaperMapping, importanceScore, trendReasoning } = topicData;

  const userPrompt = `Generate comprehensive UPSC CSE analysis for this trending topic:

TOPIC: ${topicTitle}
CATEGORY: ${category}
GS PAPER MAPPING: ${gsPaperMapping.primary}${gsPaperMapping.secondary && gsPaperMapping.secondary.length > 0 ? `, ${gsPaperMapping.secondary.join(', ')}` : ''}
IMPORTANCE SCORE: ${importanceScore}/100
TREND REASONING: ${trendReasoning}

Based on conceptual understanding and policy analysis, create detailed UPSC-ready content that focuses on:
- Policy implications and governance aspects
- Developmental challenges and opportunities
- Institutional frameworks and reforms
- Stakeholder perspectives and conflicts
- Future directions and recommendations

Ensure the analysis is suitable for both prelims (factual) and mains (analytical) preparation. Make questions challenging but answerable based on conceptual understanding.

Return ONLY valid JSON in the exact structure specified in the system prompt.`;

  try {
    const response = await callOpenRouterAPI({
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || 'meta-llama/Meta-Llama-3.1-70B-Instruct',
      systemPrompt: TOPIC_ANALYSIS_SYSTEM_PROMPT,
      userPrompt,
      temperature,
      maxTokens
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to generate topic analysis');
    }

    const rawContent = response.content.trim();
    const jsonContent = rawContent.replace(/```json\n?|\n?```/g, '');

    let analysis;
    try {
      analysis = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('JSON parse error in topic analysis:', parseError);
      console.error('Raw response:', rawContent);
      throw new Error('Failed to parse LLM response as valid JSON for topic analysis');
    }

    // Validate required fields
    const requiredFields = ['whyInNews', 'background', 'gsPaperMapping', 'prelimsFacts', 'mainsPoints', 'probableQuestions'];
    const missingFields = requiredFields.filter(field => !analysis[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields in analysis: ${missingFields.join(', ')}`);
    }

    return {
      success: true,
      analysis,
      metadata: {
        topicTitle,
        generatedAt: new Date(),
        model: response.model,
        usage: response.usage,
        category,
        importanceScore
      }
    };

  } catch (error) {
    console.error('Error in generateTopicAnalysis:', error);
    return {
      success: false,
      error: error.message,
      analysis: null,
      metadata: {
        topicTitle,
        generatedAt: new Date(),
        error: error.message
      }
    };
  }
};

/**
 * Batch generate analyses for multiple topics
 * @param {Array} topics - Array of topic objects
 * @param {Object} config - Batch configuration
 * @returns {Promise<Array>} - Array of analysis results
 */
export const batchGenerateTopicAnalyses = async (topics, config = {}) => {
  const { concurrency = 3, delay = 1000 } = config;
  const results = [];

  // Process topics in batches to avoid API rate limits
  for (let i = 0; i < topics.length; i += concurrency) {
    const batch = topics.slice(i, i + concurrency);
    const batchPromises = batch.map(topic => generateTopicAnalysis(topic, config));

    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches
      if (i + concurrency < topics.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`Error processing batch ${Math.floor(i/concurrency) + 1}:`, error);
      // Continue with next batch even if current fails
    }
  }

  return results;
};

/**
 * Validate generated content against ethical guidelines
 * @param {Object} content - Generated content to validate
 * @returns {Object} - Validation result
 */
export const validateContentEthics = (content) => {
  const issues = [];

  // Check for specific dates (YYYY, MM/DD patterns)
  const datePatterns = [
    /\b\d{4}\b/, // Year patterns
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/, // Date patterns
    /\b\d{1,2}\/\d{1,2}\b/, // Month/day patterns
  ];

  const contentString = JSON.stringify(content);
  datePatterns.forEach(pattern => {
    if (pattern.test(contentString)) {
      issues.push('Contains specific date references');
    }
  });

  // Check for specific numbers that might be statistics
  const numberPatterns = [
    /\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/, // Large numbers with commas
    /\b\d+\.\d+%\b/, // Percentage patterns
    /\b\d+\s*(?:crore|lakh|million|billion)\b/i, // Indian number formats
  ];

  numberPatterns.forEach(pattern => {
    if (pattern.test(contentString)) {
      issues.push('Contains specific statistical numbers');
    }
  });

  // Check for current event language
  const currentEventWords = ['today', 'yesterday', 'recently', 'latest', 'breaking', 'just announced', 'new report'];
  currentEventWords.forEach(word => {
    if (contentString.toLowerCase().includes(word)) {
      issues.push(`Contains current event language: "${word}"`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
    validationDate: new Date()
  };
};

/**
 * Apply ethical disclaimers and safeguards to content
 * @param {Object} content - Original content
 * @param {Object} options - Safeguard options
 * @returns {Object} - Content with safeguards applied
 */
export const applyEthicalSafeguards = (content, options = {}) => {
  const {
    includeDisclaimer = true,
    addConceptualFocus = true,
    validationResult = null
  } = options;

  const safeguarded = { ...content };

  if (includeDisclaimer) {
    safeguarded.disclaimer = 'This content is AI-generated based on analytical reasoning and general knowledge. It does not represent real-time news or specific current events.';
  }

  if (addConceptualFocus) {
    safeguarded.contentType = 'conceptual-analysis';
    safeguarded.generationMethod = 'model-driven';
  }

  if (validationResult) {
    safeguarded.validation = validationResult;
  }

  safeguarded.safeguardsApplied = {
    disclaimer: includeDisclaimer,
    conceptualFocus: addConceptualFocus,
    validation: !!validationResult,
    appliedAt: new Date()
  };

  return safeguarded;
};

export default {
  generateModelDrivenTopics,
  generateTopicAnalysis,
  batchGenerateTopicAnalyses,
  validateContentEthics,
  applyEthicalSafeguards
};
