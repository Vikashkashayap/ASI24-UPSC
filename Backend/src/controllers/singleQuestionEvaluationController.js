import CopyEvaluation from "../models/CopyEvaluation.js";
import { processPDFForEvaluation } from "../services/pdfProcessingService.js";
import { evaluateAnswerWithOpenRouter } from "../services/openRouterService.js";

/**
 * Single Question Evaluation System Prompt
 */
const SINGLE_QUESTION_EVALUATION_PROMPT = `You are a UPSC Mains Answer Evaluation Expert with 10+ years of experience as an official UPSC examiner.

Your task is to evaluate a single UPSC Mains answer based on the question provided.

You must strictly follow real UPSC evaluation standards and provide detailed, section-wise feedback.

────────────────────────────────────
ROLE & AUTHORITY
────────────────────────────────────
• Act as a neutral UPSC examiner, not as a teacher or motivator
• Be strict, objective, and realistic in marking
• Avoid generosity bias; average answers should score average marks
• Do not assume anything not written in the answer

────────────────────────────────────
EVALUATION CRITERIA (STRICT)
────────────────────────────────────
For the answer, evaluate on the following parameters:

1. Demand of the Question (Critical)
   - Identify what the question is asking for
   - Check if the answer addresses all aspects
   - Verify if directive words (discuss, analyse, examine, etc.) are followed

2. Introduction (15-20% of marks)
   - Context setting
   - Definition or background
   - Thesis statement
   - Connection to the question

3. Body (50-60% of marks)
   - Content quality and coverage
   - Analytical depth
   - Examples and case studies
   - Current affairs integration
   - Constitutional/legal references
   - Data and statistics

4. Conclusion (10-15% of marks)
   - Summary of key points
   - Forward-looking perspective
   - Balanced view

5. Language & Presentation (10% of marks)
   - Clarity and coherence
   - Formal language
   - Proper structure

────────────────────────────────────
MARKING RULES
────────────────────────────────────
• Use decimal marks where appropriate (e.g., 6.5, 7.25, 8.75)
• Average answers should fall in the 5–7 range (out of 10) or 7.5-10.5 (out of 15)
• Very good answers: 8–9 (out of 10) or 12–13.5 (out of 15)
• Exceptional answers: 9.5–10 (out of 10) or 14–15 (out of 15) (rare)
• Do NOT give full marks easily
• Poor or irrelevant answers may score 2–4 (out of 10) or 3–6 (out of 15)

────────────────────────────────────
OUTPUT FORMAT (MANDATORY)
────────────────────────────────────
Provide evaluation in this JSON format:

{
  "demandOfQuestion": [
    "Key aspect 1 that the question demands",
    "Key aspect 2",
    "Key aspect 3"
  ],
  "introduction": {
    "whatYouWrote": "The introduction text from the answer",
    "analysis": "Detailed analysis of the introduction - what works, what doesn't",
    "suggestions": [
      "Suggestion 1 to improve introduction",
      "Suggestion 2",
      "Suggestion 3"
    ]
  },
  "body": {
    "whatYouWrote": "The body text from the answer",
    "strengths": [
      "Strength 1",
      "Strength 2",
      "Strength 3"
    ],
    "weaknesses": [
      "Weakness 1 - be specific",
      "Weakness 2 - be specific",
      "Weakness 3 - be specific"
    ],
    "suggestions": [
      "Specific suggestion 1 with examples",
      "Specific suggestion 2 with examples",
      "Specific suggestion 3 with examples"
    ]
  },
  "conclusion": {
    "whatYouWrote": "The conclusion text from the answer",
    "analysis": "Analysis of the conclusion",
    "suggestions": [
      "Suggestion 1",
      "Suggestion 2"
    ]
  },
  "overallFeedback": "Comprehensive overall feedback explaining the marks awarded and overall performance",
  "marksScored": 7.5,
  "maxMarks": 10,
  "wordCount": 145,
  "wordLimit": 150,
  "wordCountStatus": "GOOD" | "BAD" | "EXCEEDED",
  "modelAnswer": "A high-scoring UPSC-style model answer for this question (150-200 words)",
  "rating": {
    "content": 6.5,
    "structure": 7,
    "analysis": 6,
    "examples": 5.5,
    "language": 7.5
  }
}

IMPORTANT:
- Be specific in feedback
- Provide actionable suggestions
- Reference constitutional articles, cases, or reports where relevant
- Word count status: GOOD if within ±10% of limit, BAD if significantly under, EXCEEDED if over limit`;

/**
 * Evaluate single question answer
 * POST /api/single-question-evaluation/evaluate
 */
export const evaluateSingleQuestion = async (req, res) => {
  try {
    const {
      question,
      answerText,
      paper = "GS",
      marks = 10,
      language = "English",
      wordLimit = 150
    } = req.body;

    // Check if file was uploaded (optional - can use text or PDF)
    let extractedAnswerText = answerText;
    
    if (req.file) {
      // Process PDF if uploaded
      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({
          success: false,
          message: "Only PDF files are allowed"
        });
      }

      const pdfBuffer = req.file.buffer;
      const processResult = await processPDFForEvaluation(pdfBuffer, {
        subject: "General Studies",
        paper,
        year: new Date().getFullYear()
      });

      if (!processResult.success || !processResult.extractedAnswers || processResult.extractedAnswers.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Failed to extract text from PDF"
        });
      }

      // Use first extracted answer
      extractedAnswerText = processResult.extractedAnswers[0].answerText || answerText;
    }

    if (!question || !extractedAnswerText) {
      return res.status(400).json({
        success: false,
        message: "Question and answer text are required"
      });
    }

    const userId = req.user._id;
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "OPENROUTER_API_KEY is not configured"
      });
    }

    // Count words
    const wordCount = extractedAnswerText.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    // Determine word count status
    let wordCountStatus = "GOOD";
    if (wordCount < wordLimit * 0.7) {
      wordCountStatus = "BAD";
    } else if (wordCount > wordLimit * 1.1) {
      wordCountStatus = "EXCEEDED";
    }

    // Prepare evaluation prompt
    const userPrompt = `Evaluate this UPSC Mains answer:

QUESTION: ${question}

ANSWER TEXT:
${extractedAnswerText}

PAPER TYPE: ${paper}
MARKS: ${marks}
WORD LIMIT: ${wordLimit} words
ACTUAL WORD COUNT: ${wordCount}
LANGUAGE: ${language}

Provide evaluation in the JSON format specified in the system prompt.`;

    // Call OpenRouter API
    const apiResult = await evaluateAnswerWithOpenRouter({
      apiKey,
      model,
      systemPrompt: SINGLE_QUESTION_EVALUATION_PROMPT,
      userPrompt,
    });

    if (!apiResult.success || !apiResult.data) {
      console.error("API Error:", apiResult.error);
      console.error("Raw Content:", apiResult.rawContent);
      throw new Error(apiResult.error || "Failed to get evaluation from API");
    }

    let evaluation = apiResult.data;
    
    // Ensure all required fields exist with defaults
    if (!evaluation.demandOfQuestion) {
      evaluation.demandOfQuestion = [
        "Address the core theme of the question",
        "Provide relevant examples and case studies",
        "Maintain analytical depth throughout"
      ];
    }
    
    if (!evaluation.introduction) {
      evaluation.introduction = {
        whatYouWrote: extractedAnswerText.substring(0, 100) + "...",
        analysis: "Introduction needs improvement",
        suggestions: ["Add context", "Define key terms", "Set up the argument"]
      };
    }
    
    if (!evaluation.body) {
      evaluation.body = {
        whatYouWrote: extractedAnswerText,
        strengths: ["Good attempt"],
        weaknesses: ["Needs more depth"],
        suggestions: ["Add examples", "Improve analysis"]
      };
    }
    
    if (!evaluation.conclusion) {
      evaluation.conclusion = {
        whatYouWrote: extractedAnswerText.substring(extractedAnswerText.length - 100) || "No conclusion found",
        analysis: "Conclusion needs improvement",
        suggestions: ["Summarize key points", "Provide forward-looking perspective"]
      };
    }
    
    if (!evaluation.overallFeedback) {
      evaluation.overallFeedback = "The answer demonstrates basic understanding but needs improvement in structure and depth.";
    }
    
    if (typeof evaluation.marksScored !== 'number') {
      evaluation.marksScored = marks * 0.6; // Default to 60%
    }

    // Ensure all required fields are present
    evaluation.marksScored = evaluation.marksScored || 0;
    evaluation.maxMarks = marks;
    evaluation.wordCount = wordCount;
    evaluation.wordLimit = wordLimit;
    evaluation.wordCountStatus = wordCountStatus;
    evaluation.paper = paper;
    evaluation.language = language;
    evaluation.question = question;
    evaluation.answerText = extractedAnswerText;

    // Save evaluation to database (optional - for history)
    const evaluationRecord = new CopyEvaluation({
      userId,
      pdfFileName: req.file ? req.file.originalname : "text_answer.txt",
      pdfFileSize: req.file ? req.file.size : extractedAnswerText.length,
      subject: "General Studies",
      paper,
      year: new Date().getFullYear(),
      status: 'completed',
      evaluations: [{
        questionNumber: "Q1",
        questionText: question,
        answerText: extractedAnswerText,
        pageNumber: 1,
        wordCount: wordCount,
        wordLimit: wordLimit,
        totalMarks: evaluation.marksScored,
        maxMarks: marks,
        marksBreakdown: {
          introduction: evaluation.rating?.structure || 0,
          body: evaluation.rating?.content || 0,
          conclusion: 0,
          diagram: 0,
          presentation: evaluation.rating?.language || 0
        },
        strengths: evaluation.body?.strengths || [],
        weaknesses: evaluation.body?.weaknesses || [],
        improvements: evaluation.body?.suggestions || [],
        modelAnswer: evaluation.modelAnswer || "",
        examinerComment: evaluation.overallFeedback || "",
        inlineFeedback: []
      }],
      finalSummary: {
        overallScore: {
          obtained: evaluation.marksScored,
          maximum: marks,
          percentage: Math.round((evaluation.marksScored / marks) * 100),
          grade: evaluation.marksScored >= marks * 0.7 ? 'A' : 
                 evaluation.marksScored >= marks * 0.6 ? 'B' : 
                 evaluation.marksScored >= marks * 0.5 ? 'C' : 'D'
        },
        strengths: evaluation.body?.strengths || [],
        weaknesses: evaluation.body?.weaknesses || [],
        improvementPlan: evaluation.body?.suggestions || [],
        upscRange: evaluation.marksScored >= marks * 0.7 ? "Above Average" : 
                   evaluation.marksScored >= marks * 0.5 ? "Average" : "Below Average"
      }
    });

    await evaluationRecord.save();

    res.status(200).json({
      success: true,
      message: "Answer evaluated successfully",
      data: {
        evaluation,
        evaluationId: evaluationRecord._id
      }
    });

  } catch (error) {
    console.error("Error in evaluateSingleQuestion:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

export default {
  evaluateSingleQuestion
};

