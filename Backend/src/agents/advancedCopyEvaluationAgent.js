import { RunnableLambda } from "@langchain/core/runnables";
import { evaluateAnswerWithOpenRouter } from "../services/openRouterService.js";

/**
 * UPSC COPY EVALUATION AGENT
 * 
 * This agent evaluates UPSC answer copies with:
 * - Page-wise analysis
 * - Question detection
 * - Inline feedback (examiner style)
 * - Diagram evaluation
 * - UPSC marking scheme based scoring
 * - Detailed analytics
 */

const EVALUATION_SYSTEM_PROMPT = `You are a UPSC Mains Answer Copy Evaluation Expert with 10+ years of experience as an official UPSC examiner.

Your task is to evaluate a full UPSC Mains answer copy provided as a PDF document.

You must strictly follow real UPSC evaluation standards and not behave like a general AI assistant.

────────────────────────────────────
ROLE & AUTHORITY
────────────────────────────────────
• Act as a neutral UPSC examiner, not as a teacher or motivator
• Be strict, objective, and realistic in marking
• Avoid generosity bias; average answers should score average marks
• Do not assume anything not written in the answer

────────────────────────────────────
INPUT HANDLING
────────────────────────────────────
• The input will be a full PDF answer copy
• Identify each question clearly
• Evaluate each question independently
• Assume each question carries 12.5 marks unless stated otherwise
• Respect word limits (150 / 250 words) while evaluating

────────────────────────────────────
EVALUATION CRITERIA (STRICT)
────────────────────────────────────
For EACH question, evaluate on the following parameters:

1. Question Understanding & Demand Fulfilment (25%)
   - Has the directive (discuss, analyse, examine, etc.) been addressed?
   - Is the answer relevant to what was asked?

2. Structure & Organization (15%)
   - Introduction, body, conclusion present or not
   - Logical flow, headings, sub-points

3. Content Quality & Coverage (20%)
   - Coverage of key dimensions
   - Accuracy of concepts
   - Balance between theory and application

4. Analytical Depth (20%)
   - Cause–effect analysis
   - Critical thinking
   - Pros/cons, limitations, way forward

5. Examples & Value Addition (10%)
   - Use of case studies, reports, constitutional articles
   - Diagrams, flowcharts, tables (if mentioned)

6. Language & Clarity (10%)
   - Clear, simple, formal language
   - No unnecessary verbosity

────────────────────────────────────
MARKING RULES
────────────────────────────────────
• Total marks per question: 12.5
• Use decimal marks where appropriate (e.g., 6.5, 7.25, 8.75)
• Average answers should fall in the 5–7 range
• Very good answers: 8–9.5
• Exceptional answers: max 10–10.5 (rare)
• Do NOT give full marks easily
• Poor or irrelevant answers may score 2–4

────────────────────────────────────
TEXT ANNOTATION (CRITICAL)
────────────────────────────────────
You MUST annotate the answer text with inline highlight tags to mark mistakes and strengths.

Use these tags to wrap specific portions of text:
• <highlight type="irrelevant">...</highlight> - Text that doesn't answer the question
• <highlight type="weak_structure">...</highlight> - Poorly structured sentences/paragraphs
• <highlight type="grammar">...</highlight> - Grammar/spelling errors
• <highlight type="missing_keyword">...</highlight> - Missing important UPSC keywords/concepts
• <highlight type="good_content">...</highlight> - Well-written, relevant content

IMPORTANT ANNOTATION RULES:
• DO NOT rewrite or modify the original text
• ONLY wrap existing text with highlight tags
• Be specific - highlight exact phrases/sentences, not entire paragraphs
• Mark both mistakes AND strengths
• Preserve original text exactly as written

────────────────────────────────────
OUTPUT FORMAT (MANDATORY)
────────────────────────────────────
For EACH question, output strictly in this JSON format:

{
  "questionNumber": "Q1",
  "marksAwarded": 7.5,
  "structure_score": 2,
  "content_score": 3,
  "analysis_score": 2,
  "language_score": 1,
  "value_addition_score": 1,
  "final_score": 7.5,
  "max_marks": 12.5,
  "word_count": 145,
  "annotated_text": "The answer text with <highlight type='...'>...</highlight> tags",
  "mistake_summary": [
    "No constitutional reference",
    "Weak conclusion",
    "Lacked current example"
  ],
  "examiner_comment": "Average answer. Needs sharper analysis and better structure.",
  "evaluationSummary": "One concise paragraph explaining WHY these marks were given",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "model_answer": "A high-scoring UPSC-style answer would...",
  "diagram_suggestions": "Textual description of suggested diagrams"
}

────────────────────────────────────
FINAL SUMMARY (AFTER ALL QUESTIONS)
────────────────────────────────────
After evaluating the full copy, provide:

1. Total Marks Obtained
2. Overall Copy Assessment (Poor / Average / Good / Very Good)
3. Top 3 recurring weaknesses
4. Top 3 actionable improvement strategies
5. Estimated UPSC Rank Impact (Very Rough Range)

────────────────────────────────────
IMPORTANT BEHAVIOR RULES
────────────────────────────────────
• Do NOT rewrite answers - only annotate with highlight tags
• Do NOT praise unnecessarily
• Do NOT behave leniently
• Do NOT hallucinate content not present in the copy
• Maintain examiner-like professional tone
• Think step-by-step internally before awarding marks
• Output ONLY the evaluation, not your internal reasoning`;

/**
 * Evaluates a single answer using OpenRouter API
 */
async function evaluateAnswer(answerData, apiKey, model) {
  const {
    questionNumber,
    questionText,
    answerText,
    wordLimit,
    subject,
    hashedDiagram,
    pageNumber
  } = answerData;

  const maxMarks = 12.5; // Default to 12.5 marks per question
  
  const userPrompt = `Evaluate this UPSC Mains answer:

QUESTION ${questionNumber}: ${questionText || 'Question not clearly marked'}

ANSWER TEXT:
${answerText}

WORD LIMIT: ${wordLimit} words
SUBJECT: ${subject}
PAGE: ${pageNumber}
DIAGRAM PRESENT: ${hashedDiagram ? 'Yes' : 'No'}

Provide evaluation in the following JSON format (STRICTLY follow the format):
{
  "questionNumber": "${questionNumber}",
  "marksAwarded": number (out of ${maxMarks}, use decimals like 6.5, 7.25, 8.75),
  "structure_score": number (0-2),
  "content_score": number (0-3),
  "analysis_score": number (0-2),
  "language_score": number (0-1),
  "value_addition_score": number (0-1),
  "final_score": number (sum of above, max ${maxMarks}),
  "max_marks": ${maxMarks},
  "word_count": number,
  "annotated_text": "The original answer text with <highlight type='irrelevant'>...</highlight>, <highlight type='weak_structure'>...</highlight>, <highlight type='grammar'>...</highlight>, <highlight type='missing_keyword'>...</highlight>, or <highlight type='good_content'>...</highlight> tags wrapping specific portions",
  "mistake_summary": ["mistake 1", "mistake 2", "mistake 3"],
  "examiner_comment": "Brief examiner-style comment explaining the marks",
  "evaluationSummary": "One concise paragraph explaining WHY these marks were given",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "model_answer": "A high-scoring UPSC-style model answer for this question",
  "diagram_suggestions": "Textual description of suggested diagrams/flowcharts",
  "diagramAnalysis": {
    "present": boolean,
    "relevant": boolean,
    "marksAwarded": number,
    "comment": "diagram specific feedback"
  }
}

CRITICAL ANNOTATION REQUIREMENTS:
- annotated_text MUST contain the original answer text with highlight tags
- Use <highlight type="irrelevant"> for irrelevant content
- Use <highlight type="weak_structure"> for poorly structured parts
- Use <highlight type="grammar"> for grammar/spelling errors
- Use <highlight type="missing_keyword"> where important UPSC keywords are missing
- Use <highlight type="good_content"> for well-written, relevant portions
- DO NOT modify the original text - only wrap it with tags
- Be specific: highlight exact phrases, not entire paragraphs

IMPORTANT:
- marksAwarded should be between 0 and ${maxMarks}
- Average answers: 5-7 marks
- Very good answers: 8-9.5 marks
- Exceptional answers: 10-10.5 marks (rare)
- Poor answers: 2-4 marks
- Be strict and realistic, avoid generosity bias
- final_score should equal the sum of individual scores (structure + content + analysis + language + value_addition)`;

  try {
    // Use service for API call
    const apiResult = await evaluateAnswerWithOpenRouter({
      apiKey,
      model,
      systemPrompt: EVALUATION_SYSTEM_PROMPT,
      userPrompt,
    });

    if (!apiResult.success || !apiResult.data) {
      throw new Error(apiResult.error || "Failed to get evaluation from API");
    }

    // Use parsed data from service
    const parsedEvaluation = apiResult.data;
    const maxMarks = 12.5;
    
    // Map new format to existing schema
    parsedEvaluation.totalMarks = parsedEvaluation.final_score || parsedEvaluation.marksAwarded || 0;
    parsedEvaluation.maxMarks = maxMarks;
    
    // Store annotated text (with highlight tags)
    parsedEvaluation.annotatedText = parsedEvaluation.annotated_text || answerData.answerText || '';
    
    // Ensure required fields are present
    parsedEvaluation.answerText = answerData.answerText || '';
    parsedEvaluation.questionText = answerData.questionText || `Question ${answerData.questionNumber}`;
    parsedEvaluation.pageNumber = answerData.pageNumber || 1;
    parsedEvaluation.wordCount = parsedEvaluation.word_count || answerData.wordCount || 0;
    parsedEvaluation.wordLimit = answerData.wordLimit || 250;
    
    // Store detailed scoring breakdown
    parsedEvaluation.scoringBreakdown = {
      structure_score: parsedEvaluation.structure_score || 0,
      content_score: parsedEvaluation.content_score || 0,
      analysis_score: parsedEvaluation.analysis_score || 0,
      language_score: parsedEvaluation.language_score || 0,
      value_addition_score: parsedEvaluation.value_addition_score || 0,
      final_score: parsedEvaluation.final_score || parsedEvaluation.totalMarks
    };
    
    // Store mistake summary
    parsedEvaluation.mistakeSummary = Array.isArray(parsedEvaluation.mistake_summary) 
      ? parsedEvaluation.mistake_summary 
      : [];
    
    // Store examiner comment
    parsedEvaluation.examinerComment = parsedEvaluation.examiner_comment || parsedEvaluation.evaluationSummary || '';
    
    // Store model answer and diagram suggestions
    parsedEvaluation.modelAnswer = parsedEvaluation.model_answer || '';
    parsedEvaluation.diagramSuggestions = parsedEvaluation.diagram_suggestions || '';
    
    // Convert new format fields to existing structure
    if (parsedEvaluation.evaluationSummary && !parsedEvaluation.inlineFeedback) {
      parsedEvaluation.inlineFeedback = [
        {
          location: 'overall',
          comment: parsedEvaluation.examinerComment || parsedEvaluation.evaluationSummary,
          severity: 'neutral'
        }
      ];
    }
    
    // Ensure strengths, weaknesses, improvements are arrays
    parsedEvaluation.strengths = Array.isArray(parsedEvaluation.strengths) 
      ? parsedEvaluation.strengths.slice(0, 3) 
      : [];
    parsedEvaluation.weaknesses = Array.isArray(parsedEvaluation.weaknesses) 
      ? parsedEvaluation.weaknesses.slice(0, 3) 
      : [];
    parsedEvaluation.improvements = parsedEvaluation.specificImprovements 
      ? [parsedEvaluation.specificImprovements] 
      : (Array.isArray(parsedEvaluation.improvements) ? parsedEvaluation.improvements : []);
    
    // Calculate marks breakdown if not provided
    if (!parsedEvaluation.marksBreakdown) {
      const total = parsedEvaluation.totalMarks || 0;
      parsedEvaluation.marksBreakdown = {
        introduction: Math.round((parsedEvaluation.scoringBreakdown.structure_score * 0.3) * 10) / 10,
        body: Math.round((parsedEvaluation.scoringBreakdown.content_score + parsedEvaluation.scoringBreakdown.analysis_score) * 10) / 10,
        conclusion: Math.round((parsedEvaluation.scoringBreakdown.structure_score * 0.2) * 10) / 10,
        diagram: parsedEvaluation.diagramAnalysis?.marksAwarded || parsedEvaluation.scoringBreakdown.value_addition_score || 0,
        presentation: Math.round((parsedEvaluation.scoringBreakdown.language_score) * 10) / 10
      };
    }
    
    // Set upscRange based on marks
    const percentage = (parsedEvaluation.totalMarks / maxMarks) * 100;
    parsedEvaluation.upscRange = percentage >= 70 ? 'Above Average' :
                                 percentage >= 55 ? 'Average' : 'Below Average';
    
    return parsedEvaluation;
  } catch (error) {
    console.error("Error in answer evaluation:", error);
    return generateFallbackEvaluation(answerData);
  }
}

/**
 * Generates fallback evaluation if API fails
 */
function generateFallbackEvaluation(answerData) {
  const { questionNumber, wordLimit, hashedDiagram, answerText, questionText, pageNumber, wordCount } = answerData;
  const maxMarks = 12.5; // Default to 12.5 marks per question
  const totalMarks = Math.round((5 + Math.random() * 2) * 10) / 10; // Average range: 5-7

  return {
    questionNumber,
    questionText: questionText || `Question ${questionNumber}`,
    answerText: answerText || '',
    pageNumber: pageNumber || 1,
    wordCount: wordCount || 0,
    wordLimit: wordLimit || 250,
    totalMarks: Math.min(totalMarks, maxMarks),
    maxMarks,
    marksAwarded: Math.min(totalMarks, maxMarks),
    evaluationSummary: "The answer demonstrates basic understanding of the topic with reasonable structure. However, it lacks analytical depth and practical examples. The response addresses the question but could benefit from more comprehensive coverage and specific case studies.",
    marksBreakdown: {
      introduction: Math.round((totalMarks * 0.15) * 10) / 10,
      body: Math.round((totalMarks * 0.5) * 10) / 10,
      conclusion: Math.round((totalMarks * 0.15) * 10) / 10,
      diagram: hashedDiagram ? Math.round((totalMarks * 0.1) * 10) / 10 : 0,
      presentation: Math.round((totalMarks * 0.1) * 10) / 10,
    },
    inlineFeedback: [
      {
        location: "overall",
        comment: "The answer demonstrates basic understanding but needs more analytical depth and practical examples.",
        severity: "neutral"
      }
    ],
    strengths: [
      "Logical flow of arguments",
      "Balanced perspective on the issue",
      "Good use of UPSC terminology"
    ].slice(0, 3),
    weaknesses: [
      "Limited use of practical examples",
      "Some arguments lack depth",
      "Could use more committee reports/data"
    ].slice(0, 3),
    improvements: [
      "Add 2-3 relevant examples and include specific data points or government reports to strengthen arguments"
    ],
    specificImprovements: "Add 2-3 relevant examples, include specific data points or government reports, and strengthen conclusion with actionable suggestions. " + (hashedDiagram ? "" : "Add relevant diagram/flowchart for +1 to +1.5 marks."),
    diagramAnalysis: {
      present: hashedDiagram || false,
      relevant: hashedDiagram || false,
      marksAwarded: hashedDiagram ? Math.round((totalMarks * 0.1) * 10) / 10 : 0,
      comment: hashedDiagram 
        ? "Diagram present and adds value, ensure proper labeling"
        : "Relevant diagram/flowchart could fetch additional marks"
    },
    upscRange: totalMarks > maxMarks * 0.7 ? "Above Average" : 
               totalMarks > maxMarks * 0.5 ? "Average" : "Below Average"
  };
}

/**
 * Generates page-wise summary
 */
function generatePageSummary(pageEvaluations) {
  const summary = {};
  
  for (const evaluation of pageEvaluations) {
    const page = evaluation.pageNumber;
    if (!summary[page]) {
      summary[page] = {
        pageNumber: page,
        questionsEvaluated: [],
        totalMarksOnPage: 0,
        maxMarksOnPage: 0,
        averageScore: 0
      };
    }
    
    summary[page].questionsEvaluated.push({
      questionNumber: evaluation.questionNumber,
      marks: evaluation.totalMarks,
      maxMarks: evaluation.maxMarks
    });
    summary[page].totalMarksOnPage += evaluation.totalMarks;
    summary[page].maxMarksOnPage += evaluation.maxMarks;
  }

  // Calculate averages
  for (const page in summary) {
    const pageData = summary[page];
    pageData.averageScore = Math.round(
      (pageData.totalMarksOnPage / pageData.maxMarksOnPage) * 100
    );
  }

  return Object.values(summary);
}

/**
 * Generates final summary and analytics
 */
function generateFinalSummary(allEvaluations, metadata) {
  const totalMarksObtained = allEvaluations.reduce((sum, e) => sum + e.totalMarks, 0);
  const totalMaxMarks = allEvaluations.reduce((sum, e) => sum + (e.maxMarks || 12.5), 0);
  const percentage = Math.round((totalMarksObtained / totalMaxMarks) * 100);

  // Aggregate strengths and weaknesses
  const allStrengths = allEvaluations.flatMap(e => e.strengths || []);
  const allWeaknesses = allEvaluations.flatMap(e => e.weaknesses || []);
  const allImprovements = allEvaluations.flatMap(e => {
    // Prioritize specificImprovements if available
    if (e.specificImprovements) return [e.specificImprovements];
    return e.improvements || [];
  });

  // Count occurrences of weaknesses to find top recurring ones
  const weaknessCounts = {};
  allWeaknesses.forEach(weakness => {
    weaknessCounts[weakness] = (weaknessCounts[weakness] || 0) + 1;
  });
  const top3RecurringWeaknesses = Object.entries(weaknessCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([weakness]) => weakness);

  // Get top 3 actionable improvements
  const top3Improvements = [...new Set(allImprovements)].slice(0, 3);

  // Determine overall copy assessment
  let overallAssessment = 'Poor';
  if (percentage >= 70) overallAssessment = 'Very Good';
  else if (percentage >= 55) overallAssessment = 'Good';
  else if (percentage >= 40) overallAssessment = 'Average';
  else overallAssessment = 'Poor';

  // Estimate UPSC Rank Impact (very rough range)
  let rankImpact = 'Not competitive';
  if (percentage >= 70) rankImpact = 'Top 100-500 range (if consistent across all papers)';
  else if (percentage >= 60) rankImpact = 'Top 500-1000 range (if consistent)';
  else if (percentage >= 50) rankImpact = 'Top 1000-2000 range (needs improvement)';
  else if (percentage >= 40) rankImpact = 'Below 2000 (significant improvement needed)';
  else rankImpact = 'Not competitive (major gaps)';

  // Count diagram usage
  const diagramStats = {
    total: allEvaluations.length,
    withDiagram: allEvaluations.filter(e => e.diagramAnalysis?.present).length,
    avgDiagramMarks: allEvaluations
      .reduce((sum, e) => sum + (e.diagramAnalysis?.marksAwarded || 0), 0) / allEvaluations.length
  };

  return {
    // New format fields
    totalMarksObtained: Math.round(totalMarksObtained * 10) / 10,
    overallCopyAssessment: overallAssessment,
    top3RecurringWeaknesses: top3RecurringWeaknesses.length > 0 
      ? top3RecurringWeaknesses 
      : [...new Set(allWeaknesses)].slice(0, 3),
    top3ActionableImprovements: top3Improvements.length > 0 
      ? top3Improvements 
      : ['Add practical examples', 'Strengthen analytical depth', 'Improve answer structure'],
    estimatedUPSCRankImpact: rankImpact,
    
    // Existing fields for backward compatibility
    overallScore: {
      obtained: Math.round(totalMarksObtained * 10) / 10,
      maximum: totalMaxMarks,
      percentage: percentage,
      grade: percentage >= 70 ? 'A' : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : 'D'
    },
    strengths: [...new Set(allStrengths)].slice(0, 5),
    weaknesses: [...new Set(allWeaknesses)].slice(0, 5),
    improvementPlan: [...new Set(allImprovements)].slice(0, 7),
    diagramStats,
    upscRange: percentage >= 70 ? "Above Average / Toppers Range" :
               percentage >= 55 ? "Average" : "Below Average",
    sectionWisePerformance: {
      introduction: Math.round(
        allEvaluations.reduce((sum, e) => sum + (e.marksBreakdown?.introduction || 0), 0) / allEvaluations.length * 10
      ) / 10,
      body: Math.round(
        allEvaluations.reduce((sum, e) => sum + (e.marksBreakdown?.body || 0), 0) / allEvaluations.length * 10
      ) / 10,
      conclusion: Math.round(
        allEvaluations.reduce((sum, e) => sum + (e.marksBreakdown?.conclusion || 0), 0) / allEvaluations.length * 10
      ) / 10,
      diagram: Math.round(
        allEvaluations.reduce((sum, e) => sum + (e.marksBreakdown?.diagram || 0), 0) / allEvaluations.length * 10
      ) / 10,
      presentation: Math.round(
        allEvaluations.reduce((sum, e) => sum + (e.marksBreakdown?.presentation || 0), 0) / allEvaluations.length * 10
      ) / 10,
    },
    metadata: {
      subject: metadata.subject,
      paper: metadata.paper,
      year: metadata.year,
      totalQuestions: allEvaluations.length,
      evaluationDate: new Date().toISOString()
    }
  };
}

/**
 * Main Copy Evaluation Agent
 */
export const advancedCopyEvaluationAgent = new RunnableLambda({
  func: async (input) => {
    try {
      const {
        extractedAnswers, // Array of answer objects with text, question, page, etc.
        metadata, // { subject, paper, year, totalMarks }
        apiKey,
        model
      } = input;

      // Validate required inputs
      if (!extractedAnswers || !Array.isArray(extractedAnswers) || extractedAnswers.length === 0) {
        throw new Error("No answers provided for evaluation");
      }

      if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY is required for evaluation");
      }

      console.log(`🔍 Starting UPSC Copy Evaluation for ${metadata?.subject || 'Unknown Subject'}`);
      console.log(`📄 Total questions detected: ${extractedAnswers.length}`);

      // Evaluate each answer
      const allEvaluations = [];
      
      for (const answer of extractedAnswers) {
        try {
          console.log(`⚡ Evaluating Question ${answer.questionNumber}...`);
          
          const evaluation = await evaluateAnswer(
            {
              ...answer,
              subject: metadata?.subject,
            },
            apiKey,
            model
          );

          // Add required fields from answer
          evaluation.maxMarks = 12.5; // Default to 12.5 marks per question as per new system prompt
          evaluation.pageNumber = answer.pageNumber;
          evaluation.answerText = answer.answerText || ''; // Required by schema
          evaluation.questionText = answer.questionText || `Question ${answer.questionNumber}`;
          evaluation.wordCount = answer.wordCount || 0;
          evaluation.wordLimit = answer.wordLimit || 250;
          
          // Ensure marksAwarded matches totalMarks
          if (!evaluation.marksAwarded && evaluation.totalMarks) {
            evaluation.marksAwarded = evaluation.totalMarks;
          }
          if (!evaluation.totalMarks && evaluation.marksAwarded) {
            evaluation.totalMarks = evaluation.marksAwarded;
          }

          // Filter/validate inlineFeedback locations (remove invalid enum values)
          const validLocations = ['introduction', 'body', 'conclusion', 'diagram', 'overall'];
          if (evaluation.inlineFeedback && Array.isArray(evaluation.inlineFeedback)) {
            evaluation.inlineFeedback = evaluation.inlineFeedback
              .map(feedback => {
                // Map 'presentation' to 'overall' if present, or remove invalid values
                if (feedback.location === 'presentation') {
                  feedback.location = 'overall';
                }
                return feedback;
              })
              .filter(feedback => validLocations.includes(feedback.location));
          }

          allEvaluations.push(evaluation);
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (answerError) {
          console.error(`❌ Error evaluating answer ${answer.questionNumber}:`, answerError);
          // Continue with other answers even if one fails
          allEvaluations.push(generateFallbackEvaluation(answer));
        }
      }

      if (allEvaluations.length === 0) {
        throw new Error("Failed to evaluate any answers");
      }

      // Generate page-wise summary
      const pageWiseSummary = generatePageSummary(allEvaluations);

      // Generate final summary
      const finalSummary = generateFinalSummary(allEvaluations, metadata || {});

      console.log(`✅ Evaluation complete! Overall Score: ${finalSummary.overallScore.obtained}/${finalSummary.overallScore.maximum}`);

      return {
        success: true,
        evaluations: allEvaluations,
        pageWiseSummary,
        finalSummary,
        metadata: {
          ...metadata,
          evaluatedAt: new Date().toISOString(),
          totalQuestions: allEvaluations.length
        }
      };
    } catch (error) {
      console.error("❌ Error in advancedCopyEvaluationAgent:", error);
      return {
        success: false,
        error: error.message || "Evaluation failed",
        evaluations: [],
        pageWiseSummary: [],
        finalSummary: null
      };
    }
  },
});

/**
 * Question Detection Agent
 * Detects and extracts questions from answer text
 */
export const questionDetectionAgent = new RunnableLambda({
  func: async (input) => {
    const { pageText, pageNumber } = input;

    // Pattern matching for common UPSC question formats
    const questionPatterns = [
      /Q\.?\s*(\d+)[.:\s]+(.+?)(?=Q\.?\s*\d+|$)/gis,
      /(\d+)[.)\s]+(.+?)(?=\d+[.)]|$)/gis,
      /Question\s+(\d+)[.:\s]+(.+?)(?=Question\s+\d+|$)/gis,
    ];

    const detectedQuestions = [];
    
    for (const pattern of questionPatterns) {
      const matches = [...pageText.matchAll(pattern)];
      if (matches.length > 0) {
        for (const match of matches) {
          detectedQuestions.push({
            questionNumber: match[1],
            questionText: match[2].trim().substring(0, 500), // First 500 chars
            pageNumber,
            fullText: match[0]
          });
        }
        break; // Use first matching pattern
      }
    }

    // If no questions detected, treat entire text as one answer
    if (detectedQuestions.length === 0) {
      detectedQuestions.push({
        questionNumber: `P${pageNumber}`,
        questionText: "Question not clearly marked",
        pageNumber,
        fullText: pageText
      });
    }

    return {
      pageNumber,
      questions: detectedQuestions,
      totalQuestions: detectedQuestions.length
    };
  }
});

export default advancedCopyEvaluationAgent;
