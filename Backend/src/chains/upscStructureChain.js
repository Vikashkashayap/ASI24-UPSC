import { callOpenRouterAPI } from '../services/openRouterService.js';

/**
 * UPSC Structure Chain
 * Generates structured output for UPSC current affairs topics
 */

const UPSC_STRUCTURE_SYSTEM_PROMPT = `You are an expert UPSC CSE mentor creating structured current affairs content.

For each topic, provide comprehensive analysis in this EXACT JSON structure:

{
  "whyInNews": "Brief explanation of why this topic is in news (2-3 sentences)",
  "background": "Historical context and background information (3-4 sentences)",
  "gsPaperMapping": {
    "primary": "GS-II",
    "secondary": ["GS-III"],
    "reasoning": "Why this topic maps to these papers"
  },
  "prelimsFacts": [
    "Fact 1: Key date, number, or event",
    "Fact 2: Important statistic or figure",
    "Fact 3: Constitutional article or amendment",
    "Fact 4: Important person or organization"
  ],
  "mainsPoints": {
    "introduction": "Topic introduction for mains answer (2-3 sentences)",
    "body": {
      "pros": [
        "Advantage 1 with explanation",
        "Advantage 2 with explanation",
        "Advantage 3 with explanation"
      ],
      "cons": [
        "Disadvantage 1 with explanation",
        "Disadvantage 2 with explanation",
        "Disadvantage 3 with explanation"
      ],
      "challenges": [
        "Challenge 1 with explanation",
        "Challenge 2 with explanation"
      ],
      "wayForward": [
        "Solution 1 with explanation",
        "Solution 2 with explanation",
        "Solution 3 with explanation"
      ]
    },
    "conclusion": "Balanced conclusion (2-3 sentences)"
  },
  "probableQuestions": {
    "prelims": [
      "Multiple choice question 1",
      "Multiple choice question 2",
      "Multiple choice question 3"
    ],
    "mains": [
      "GS-II: Essay question 1 (150 words)",
      "GS-III: Analytical question 1 (250 words)",
      "GS-II: Case study question 1 (300 words)"
    ]
  },
  "keyTerms": [
    "Important term 1: Brief definition",
    "Important term 2: Brief definition",
    "Important term 3: Brief definition"
  ],
  "connectedTopics": [
    "Related topic 1: Brief connection",
    "Related topic 2: Brief connection",
    "Related topic 3: Brief connection"
  ],
  "sourceAnalysis": {
    "reliability": "High/Medium/Low",
    "bias": "Neutral/Left-leaning/Right-leaning",
    "completeness": "Comprehensive/Partial/Limited",
    "recommendation": "Recommended reading sources"
  }
}

CRITICAL REQUIREMENTS:
1. Keep content concise but comprehensive
2. Use UPSC-appropriate language and terminology
3. Ensure factual accuracy
4. Structure must be perfect JSON
5. Include specific examples, dates, and references where possible
6. Make questions realistic for UPSC standard

Return ONLY valid JSON, no markdown or extra text.`;

/**
 * Generate UPSC-structured analysis for a trending topic
 * @param {Object} topicData - Topic data with sources and metadata
 * @returns {Promise<Object>} - Structured UPSC analysis
 */
export const generateUPSCAnalysis = async (topicData) => {
  const { topic, category, sources, gsPapers, relevanceScore } = topicData;

  // Prepare context from sources
  const contextArticles = sources.slice(0, 5).map(source =>
    `Source: ${source.name}\nTitle: ${source.snippet}\nURL: ${source.url}\nDate: ${source.publishDate?.toISOString().split('T')[0] || 'Recent'}`
  ).join('\n\n');

  const userPrompt = `Generate comprehensive UPSC CSE analysis for this current affairs topic:

TOPIC: ${topic}
CATEGORY: ${category}
GS PAPERS: ${gsPapers?.join(', ') || 'To be determined'}
RELEVANCE SCORE: ${relevanceScore}/100

SOURCE ARTICLES:
${contextArticles}

Based on the above information and your knowledge of UPSC syllabus, create a complete structured analysis following the exact JSON format specified in the system prompt.

Focus areas:
- Recent developments and why it's trending
- Historical background and evolution
- Key facts for prelims preparation
- Balanced analysis for mains answers
- Realistic probable questions
- Related concepts and connections

Ensure the analysis is comprehensive yet concise, suitable for UPSC aspirants.`;

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "meta-llama/Meta-Llama-3.1-70B-Instruct";

  if (!apiKey) {
    console.log('OPENROUTER_API_KEY not configured, using fallback analysis');
    return {
      success: false,
      error: 'AI analysis not available (API key not configured)',
      analysis: {
        whyInNews: `Recent developments related to ${topic} have gained significant attention in current affairs.`,
        background: `This topic has been evolving in the context of India's development and global changes.`,
        gsPaperMapping: {
          primary: gsPapers?.[0] || "GS-II",
          secondary: gsPapers?.slice(1) || [],
          reasoning: "Based on the nature of the topic"
        },
        prelimsFacts: [
          "Key fact 1: To be analyzed",
          "Key fact 2: To be analyzed",
          "Key fact 3: To be analyzed",
          "Key fact 4: To be analyzed"
        ],
        mainsPoints: {
          introduction: `${topic} has emerged as an important topic in current affairs with significant implications.`,
          body: {
            pros: [
              "Positive aspect 1: Contributes to development",
              "Positive aspect 2: Addresses key challenges",
              "Positive aspect 3: Promotes sustainable growth"
            ],
            cons: [
              "Challenge 1: Implementation issues",
              "Challenge 2: Resource constraints",
              "Challenge 3: Coordination problems"
            ],
            challenges: [
              "Challenge 1: Policy implementation",
              "Challenge 2: Stakeholder coordination"
            ],
            wayForward: [
              "Solution 1: Comprehensive planning",
              "Solution 2: Stakeholder engagement",
              "Solution 3: Regular monitoring"
            ]
          },
          conclusion: `The topic of ${topic} requires balanced consideration of various factors for optimal outcomes.`
        },
        probableQuestions: {
          prelims: [
            `Consider the following statements about ${topic}:`,
            "Which of the following is/are correct?"
          ],
          mains: [
            `Discuss the significance of ${topic} in the context of India's development.`,
            `Analyze the challenges and opportunities presented by ${topic}.`
          ]
        }
      },
      metadata: {
        topic,
        category,
        gsPapers: gsPapers || [],
        relevanceScore,
        generatedAt: new Date(),
        sourceCount: sources.length
      }
    };
  }

  try {
    const response = await callOpenRouterAPI({
      apiKey,
      model,
      systemPrompt: UPSC_STRUCTURE_SYSTEM_PROMPT,
      userPrompt,
      temperature: 0.4,
      maxTokens: 4000
    });

    if (!response.success) {
      throw new Error(response.error || "Failed to generate UPSC analysis");
    }

    // Parse and validate JSON response
    const rawContent = response.content.trim();
    const jsonContent = rawContent.replace(/```json\n?|\n?```/g, '');

    let analysis;
    try {
      analysis = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', rawContent);
      throw new Error("Failed to parse AI response as valid JSON");
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
        topic,
        category,
        gsPapers,
        relevanceScore,
        generatedAt: new Date(),
        model: response.model,
        usage: response.usage,
        sourceCount: sources.length
      }
    };

  } catch (error) {
    console.error('Error generating UPSC analysis:', error);

    // Return a basic fallback structure
    return {
      success: false,
      error: error.message,
      analysis: {
        whyInNews: `Recent developments related to ${topic} have gained significant attention in current affairs.`,
        background: `This topic has been evolving in the context of India's development and global changes.`,
        gsPaperMapping: {
          primary: gsPapers?.[0] || "GS-II",
          secondary: gsPapers?.slice(1) || [],
          reasoning: "Based on the nature of the topic"
        },
        prelimsFacts: [
          "Key fact 1: To be analyzed",
          "Key fact 2: To be analyzed",
          "Key fact 3: To be analyzed"
        ],
        mainsPoints: {
          introduction: `The topic of ${topic} has emerged as significant in contemporary discourse.`,
          body: {
            pros: ["Advantage 1: To be analyzed"],
            cons: ["Disadvantage 1: To be analyzed"],
            challenges: ["Challenge 1: To be analyzed"],
            wayForward: ["Solution 1: To be analyzed"]
          },
          conclusion: "This topic requires careful consideration of multiple perspectives."
        },
        probableQuestions: {
          prelims: [
            `With reference to ${topic}, consider the following statements:`,
            "Multiple choice question 2",
            "Multiple choice question 3"
          ],
          mains: [
            `GS-II: Discuss the significance of ${topic} in the Indian context (150 words)`,
            `GS-III: Analyze the challenges and opportunities presented by ${topic} (250 words)`
          ]
        },
        keyTerms: [`${topic}: Topic requiring detailed analysis`],
        connectedTopics: ["Related topic 1: To be analyzed"],
        sourceAnalysis: {
          reliability: "Medium",
          bias: "Neutral",
          completeness: "Partial",
          recommendation: "Consult multiple sources for comprehensive understanding"
        }
      },
      metadata: {
        topic,
        category,
        gsPapers,
        relevanceScore,
        generatedAt: new Date(),
        error: error.message
      }
    };
  }
};

/**
 * Batch generate UPSC analyses for multiple topics
 * @param {Array} topics - Array of topic data
 * @param {Object} options - Batch options
 * @returns {Promise<Array>} - Array of analyses
 */
export const batchGenerateUPSCAnalyses = async (topics, options = {}) => {
  const { concurrency = 3, delay = 1000 } = options;
  const results = [];

  // Process topics in batches to avoid API rate limits
  for (let i = 0; i < topics.length; i += concurrency) {
    const batch = topics.slice(i, i + concurrency);
    const batchPromises = batch.map(topic => generateUPSCAnalysis(topic));

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

export default {
  generateUPSCAnalysis,
  batchGenerateUPSCAnalyses
};
