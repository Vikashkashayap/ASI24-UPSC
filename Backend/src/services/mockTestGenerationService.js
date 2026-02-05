import { ChatOpenAI } from '@langchain/openai';
import retrievalService from './retrievalService.js';
import MockTest from '../models/MockTest.js';

class MockTestGenerationService {
  constructor() {
    // For pure RAG, we don't use external LLM
    // Questions are generated directly from retrieved chunks
    this.useExternalLLM = process.env.USE_EXTERNAL_LLM === 'true';

    if (this.useExternalLLM) {
      this.llm = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: 'gpt-4o-mini',
        temperature: 0.3,
        maxTokens: 2000
      });
    }
  }

  /**
   * Generate a complete mock test
   */
  async generateMockTest(params) {
    const startTime = Date.now();
    let mockTest;

    try {
      const {
        subject,
        topic,
        difficulty = 'medium',
        questionCount = 20,
        generatedBy
      } = params;

      console.log(`🎯 Starting RAG-based mock test generation: ${subject} - ${topic}`);

      // Create mock test record
      mockTest = new MockTest({
        title: `${subject} - ${topic} Mock Test (RAG Generated)`,
        description: `RAG-generated UPSC Prelims mock test from uploaded documents for ${subject}: ${topic}`,
        subject,
        topic,
        difficulty,
        totalQuestions: questionCount,
        generatedBy,
        status: 'generating'
      });

      await mockTest.save();
      console.log(`📝 Created mock test record: ${mockTest._id}`);

      // Retrieve relevant chunks from uploaded documents using RAG
      const retrievalResult = await retrievalService.retrieveForMockTest(
        subject,
        topic,
        difficulty,
        questionCount
      );

      console.log(`📚 Retrieved ${retrievalResult.chunks.length} relevant chunks from uploaded documents`);

      if (retrievalResult.chunks.length === 0) {
        throw new Error('No relevant content found in uploaded documents for the specified subject and topic');
      }

      // Generate questions based on configuration
      const questions = [];
      const chunksPerQuestion = Math.max(1, Math.floor(retrievalResult.chunks.length / questionCount));

      for (let i = 0; i < questionCount && questions.length < questionCount; i++) {
        const startIdx = i * chunksPerQuestion;
        const endIdx = Math.min((i + 1) * chunksPerQuestion, retrievalResult.chunks.length);
        const relevantChunks = retrievalResult.chunks.slice(startIdx, endIdx);

        let rawQuestion;
        if (this.useExternalLLM) {
          // Use AI for question generation
          rawQuestion = await this.generateSingleQuestion(relevantChunks, subject, topic, difficulty);
        } else {
          // Pure RAG - generate questions directly from chunks
          rawQuestion = this.generateQuestionFromChunks(relevantChunks, subject, topic, difficulty, i + 1);
        }

        const question = this.normalizeQuestion(rawQuestion, subject, topic, difficulty);
        if (question) {
          questions.push(question);
        }
      }

      console.log(`✅ Generated ${questions.length} questions directly from uploaded content`);

      // Update mock test with generated questions
      const generationTime = Date.now() - startTime;
      await MockTest.findByIdAndUpdate(mockTest._id, {
        questions,
        status: 'completed',
        generationParams: {
          retrievedChunks: retrievalResult.chunks.length,
          generationMethod: this.useExternalLLM ? 'RAG-with-AI' : 'Pure-RAG-from-uploaded-content',
          modelUsed: this.useExternalLLM ? 'gpt-4o-mini' : 'rule-based-extraction',
          chunksUsed: retrievalResult.chunks.length
        }
      });

      console.log(`🎉 RAG mock test completed in ${generationTime}ms`);

      return {
        mockTestId: mockTest._id,
        questions: questions.length,
        generationTime,
        chunksUsed: retrievalResult.chunks.length,
        method: 'Pure-RAG-from-uploaded-content'
      };

    } catch (error) {
      console.error('❌ RAG mock test generation failed:', error);

      // Update status to failed if mock test was created
      if (mockTest && mockTest._id) {
        await MockTest.findByIdAndUpdate(mockTest._id, {
          status: 'failed',
          errorMessage: error.message
        });
      }

      throw error;
    }
  }

  /**
   * Generate question directly from chunks (Pure RAG - no external AI)
   */
  generateQuestionFromChunks(chunks, subject, topic, difficulty, questionNumber) {
    try {
      // Combine all chunk texts
      const fullText = chunks.map(chunk => chunk.document || chunk.text).join(' ');

      // Extract key facts and information
      const facts = this.extractFactsFromText(fullText);

      if (facts.length === 0) {
        console.warn('No facts extracted from chunks for question generation');
        return null;
      }

      // Select a random fact to create question about
      const selectedFact = facts[Math.floor(Math.random() * facts.length)];

      // Generate question based on the fact
      const question = this.createQuestionFromFact(selectedFact, subject, topic, difficulty);

      if (!question) {
        console.warn('Failed to create question from fact:', selectedFact);
        return null;
      }

      // Add source chunk references
      question.sourceChunks = chunks.map(chunk => ({
        chunkId: chunk.mongoData?._id || chunk.id,
        vectorId: chunk.id,
        relevanceScore: chunk.score || 1.0
      }));

      question.generatedAt = new Date();
      question.questionNumber = questionNumber;

      return question;

    } catch (error) {
      console.error('❌ Failed to generate question from chunks:', error);
      return null;
    }
  }

  /**
   * Normalize question object to match MockTest schema
   * Ensures fields: subject, topic, question, options[], correctOption, difficulty, explanation
   */
  normalizeQuestion(question, subject, topic, difficulty) {
    try {
      if (!question) return null;

      const options = Array.isArray(question.options) ? question.options : [];
      if (!question.question || options.length === 0) {
        return null;
      }

      // Derive correct option in a robust way
      let correctOption =
        question.correctOption ||
        question.correct_option ||
        (typeof question.correctAnswer === 'number'
          ? options[question.correctAnswer] || null
          : null);

      // Fallback: if correct answer is a single-character label like "A"/"B"
      if (!correctOption && typeof question.correctAnswer === 'string') {
        const idxMap = { A: 0, B: 1, C: 2, D: 3 };
        const idx = idxMap[question.correctAnswer.toUpperCase()];
        if (idx !== undefined) {
          correctOption = options[idx] || null;
        }
      }

      if (!correctOption) {
        console.warn('Unable to determine correct option for question, skipping:', question.question);
        return null;
      }

      return {
        subject: question.subject || subject,
        topic: question.topic || topic,
        question: question.question,
        options,
        correctOption,
        difficulty: question.difficulty || difficulty || 'medium',
        explanation: question.explanation || '',
        sourceChunks: question.sourceChunks || [],
        generatedAt: question.generatedAt || new Date()
      };
    } catch (error) {
      console.error('❌ Failed to normalize question:', error);
      return null;
    }
  }

  /**
   * Extract key facts from text
   */
  extractFactsFromText(text) {
    const facts = [];

    // Split text into sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();

      // Look for factual statements (contains numbers, dates, names, etc.)
      if (this.isFactualStatement(trimmed)) {
        facts.push({
          text: trimmed,
          type: this.classifyFactType(trimmed)
        });
      }
    }

    return facts.slice(0, 20); // Limit to 20 facts
  }

  /**
   * Check if a sentence is a factual statement
   */
  isFactualStatement(sentence) {
    const lower = sentence.toLowerCase();

    // Skip questions, commands, opinions
    if (lower.includes('?') || lower.includes('should') || lower.includes('would') ||
        lower.includes('could') || lower.includes('may') || lower.includes('might')) {
      return false;
    }

    // Look for factual indicators
    const factualIndicators = [
      /\d{4}/, // years
      /\d+%/, // percentages
      /\d+ (years?|km|million|billion|crore|lakh)/, // quantities
      /article \d+/, // constitution articles
      /schedule \w+/, // schedules
      /amendment \d+/, // amendments
      /(president|prime minister|governor|chief minister)/i, // officials
      /(established|founded|created|formed)/i, // establishment
      /(largest|smallest|highest|lowest|first|last)/i // superlatives
    ];

    return factualIndicators.some(pattern => pattern.test(lower)) || sentence.length > 50;
  }

  /**
   * Classify the type of fact
   */
  classifyFactType(sentence) {
    const lower = sentence.toLowerCase();

    if (lower.includes('article') && /\d+/.test(lower)) return 'constitution';
    if (/\d{4}/.test(lower)) return 'historical';
    if (/(population|area|density)/.test(lower)) return 'geographical';
    if (/(economy|gdp|budget)/.test(lower)) return 'economic';
    if (/(river|mountain|sea|ocean)/.test(lower)) return 'geographical';
    if (/(president|minister|governor)/.test(lower)) return 'political';
    if (/(amendment|schedule)/.test(lower)) return 'legal';

    return 'general';
  }

  /**
   * Create a question from a fact
   */
  createQuestionFromFact(fact, subject, topic, difficulty) {
    try {
      const { text, type } = fact;

      // Create question based on fact type
      switch (type) {
        case 'constitution':
          return this.createConstitutionQuestion(text, subject, topic);
        case 'historical':
          return this.createHistoricalQuestion(text, subject, topic);
        case 'geographical':
          return this.createGeographyQuestion(text, subject, topic);
        case 'economic':
          return this.createEconomicQuestion(text, subject, topic);
        case 'political':
          return this.createPoliticalQuestion(text, subject, topic);
        case 'legal':
          return this.createLegalQuestion(text, subject, topic);
        default:
          return this.createGeneralQuestion(text, subject, topic);
      }

    } catch (error) {
      console.error('Error creating question from fact:', error);
      return null;
    }
  }

  /**
   * Create constitution-related question
   */
  createConstitutionQuestion(text, subject, topic) {
    // Extract article numbers, schedules, etc.
    const articleMatch = text.match(/article (\d+)/i);
    if (articleMatch) {
      const articleNumber = articleMatch[1];
      const options = [
        `Article ${articleNumber}`,
        `Article ${parseInt(articleNumber) + 1}`,
        `Article ${parseInt(articleNumber) - 1}`,
        `Article ${parseInt(articleNumber) + 10}`
      ];
      return {
        question: `Under which Article of the Constitution of India does the following provision fall: "${text.replace(/article \d+/i, 'Article ' + articleNumber)}"?`,
        options,
        correctOption: options[0],
        explanation: text,
        subject,
        topic,
        difficulty: 'medium',
        type: 'factual'
      };
    }

    return this.createGeneralQuestion(text, subject, topic);
  }

  /**
   * Create historical question
   */
  createHistoricalQuestion(text, subject, topic) {
    const yearMatch = text.match(/(\d{4})/);
    if (yearMatch) {
      const year = yearMatch[1];
      const options = [
        year,
        (parseInt(year) + 1).toString(),
        (parseInt(year) - 1).toString(),
        (parseInt(year) + 2).toString()
      ];
      return {
        question: `In which year did the following event occur: "${text}"?`,
        options,
        correctOption: options[0],
        explanation: text,
        subject,
        topic,
        difficulty: 'medium',
        type: 'historical'
      };
    }

    return this.createGeneralQuestion(text, subject, topic);
  }

  /**
   * Create geography question
   */
  createGeographyQuestion(text, subject, topic) {
    const options = [
      text,
      text.replace(/\d+/g, match => (parseInt(match) + 10).toString()),
      text.replace(/\d+/g, match => (parseInt(match) - 10).toString()),
      `None of the above`
    ];
    return {
      question: `Which of the following statements is correct about geography:`,
      options,
      correctOption: options[0],
      explanation: text,
      subject,
      topic,
      difficulty: 'easy',
      type: 'geographical'
    };
  }

  /**
   * Create general knowledge question
   */
  createGeneralQuestion(text, subject, topic) {
    // Create a simple true/false or multiple choice question
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 10);

    if (sentences.length >= 2) {
      const options = [
        sentences[0].trim(),
        sentences[1].trim(),
        sentences[0].trim().replace(/\d+/g, match => (parseInt(match) + 1).toString()),
        sentences[0].trim().replace(/\d+/g, match => (parseInt(match) - 1).toString())
      ];
      return {
        question: `Which of the following statements about ${topic} is correct?`,
        options,
        correctOption: options[0],
        explanation: text,
        subject,
        topic,
        difficulty: 'medium',
        type: 'general'
      };
    }

    const options = [
      'Correct',
      'Incorrect',
      'Partially correct',
      'Cannot be determined'
    ];

    return {
      question: `Consider the following statement: "${text}". This statement is:`,
      options,
      correctOption: options[0],
      explanation: text,
      subject,
      topic,
      difficulty: 'easy',
      type: 'true_false'
    };
  }

  /**
   * Create political question
   */
  createPoliticalQuestion(text, subject, topic) {
    return this.createGeneralQuestion(text, subject, topic);
  }

  /**
   * Create economic question
   */
  createEconomicQuestion(text, subject, topic) {
    return this.createGeneralQuestion(text, subject, topic);
  }

  /**
   * Create legal question
   */
  createLegalQuestion(text, subject, topic) {
    return this.createGeneralQuestion(text, subject, topic);
  }

  /**
   * Generate a single UPSC-style question
   */
  async generateSingleQuestion(chunks, subject, topic, difficulty) {
    try {
      // Combine relevant chunks into context
      const context = chunks
        .map(chunk => chunk.document)
        .join('\n\n')
        .substring(0, 4000); // Limit context length

      const prompt = this.getGenerationPrompt(subject, topic, difficulty);

      const messages = [
        {
          role: 'system',
          content: `You are a UPSC Prelims question setter. Generate ONE high-quality multiple choice question based ONLY on the provided context. Follow UPSC standards strictly.`
        },
        {
          role: 'user',
          content: `${prompt}\n\nCONTEXT:\n${context}\n\nGenerate exactly ONE question in the specified JSON format.`
        }
      ];

      const response = await this.llm.invoke(messages);
      const content = response.content.trim();

      // Parse JSON response
      const parsed = this.parseQuestionResponse(content);

      if (!parsed) {
        console.warn('Failed to parse question response:', content);
        return null;
      }

      // Validate question format
      if (!this.validateQuestion(parsed)) {
        console.warn('Invalid question format:', parsed);
        return null;
      }

      // Normalize shape so it matches our schema expectations
      const questionData = {
        subject: parsed.subject || subject,
        topic: parsed.topic || topic,
        question: parsed.question,
        options: parsed.options || [],
        correctOption: parsed.correct_option || parsed.correctOption,
        difficulty: parsed.difficulty || difficulty,
        explanation: parsed.explanation || ''
      };

      // Add source chunk references
      questionData.sourceChunks = chunks.map(chunk => ({
        chunkId: chunk.mongoData?._id,
        vectorId: chunk.id,
        relevanceScore: chunk.score
      }));

      questionData.generatedAt = new Date();

      return questionData;

    } catch (error) {
      console.error('❌ Failed to generate question:', error);
      return null;
    }
  }

  /**
   * Get the generation prompt for different subjects
   */
  getGenerationPrompt(subject, topic, difficulty) {
    const basePrompt = `Generate ONE UPSC Prelims multiple choice question on "${subject} - ${topic}".

STRICT REQUIREMENTS:
1. Use ONLY information from the provided CONTEXT - do NOT use external knowledge
2. Create UPSC-level ambiguity with close options
3. Make it elimination-friendly with plausible distractors
4. Ensure ONE clearly correct answer
5. Question should test conceptual understanding, NOT memory
6. Avoid direct quotes from context - rephrase naturally
7. Difficulty level: ${difficulty}

QUESTION FORMAT:
{
  "subject": "${subject}",
  "topic": "${topic}",
  "question": "Clear, concise question statement",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_option": "Exact text of correct option",
  "difficulty": "${difficulty}",
  "explanation": "Brief explanation based on context"
}`;

    return basePrompt;
  }

  /**
   * Parse JSON response from LLM
   */
  parseQuestionResponse(content) {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const jsonString = jsonMatch[0];
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      return null;
    }
  }

  /**
   * Validate question format and content
   */
  validateQuestion(question) {
    try {
      // Required fields
      if (!question.subject || !question.topic || !question.question ||
          !question.options || (!question.correct_option && !question.correctOption) || !question.difficulty) {
        return false;
      }

      // Options validation
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        return false;
      }

      // Check if correct option exists in options
      const correct = question.correct_option || question.correctOption;
      if (!question.options.includes(correct)) {
        return false;
      }

      // Question length validation
      if (question.question.length < 20 || question.question.length > 200) {
        return false;
      }

      // Options length validation
      for (const option of question.options) {
        if (option.length < 5 || option.length > 150) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get mock test by ID with populated questions
   */
  async getMockTest(mockTestId) {
    try {
      const mockTest = await MockTest.findById(mockTestId)
        .populate('generatedBy', 'name email')
        .populate('takenBy.userId', 'name email');

      if (!mockTest) {
        throw new Error('Mock test not found');
      }

      return mockTest;
    } catch (error) {
      console.error('❌ Failed to get mock test:', error);
      throw new Error(`Failed to retrieve mock test: ${error.message}`);
    }
  }

  /**
   * Get user's mock tests
   */
  async getUserMockTests(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const mockTests = await MockTest.find({ generatedBy: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('title subject topic difficulty totalQuestions status createdAt takenBy');

      const total = await MockTest.countDocuments({ generatedBy: userId });

      return {
        mockTests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Failed to get user mock tests:', error);
      throw new Error(`Failed to retrieve mock tests: ${error.message}`);
    }
  }

  /**
   * Submit mock test answers and calculate score
   */
  async submitMockTest(mockTestId, userId, answers) {
    try {
      const mockTest = await MockTest.findById(mockTestId);
      if (!mockTest) {
        throw new Error('Mock test not found');
      }

      let correct = 0;
      const results = [];

      for (let i = 0; i < mockTest.questions.length; i++) {
        const question = mockTest.questions[i];
        const userAnswer = answers[i];
        // Derive correct option in a robust way
        const options = Array.isArray(question.options) ? question.options : [];
        let correctOption =
          question.correctOption ||
          question.correct_option ||
          (typeof question.correctAnswer === 'number'
            ? options[question.correctAnswer] || null
            : null);

        if (!correctOption && typeof question.correctAnswer === 'string') {
          const idxMap = { A: 0, B: 1, C: 2, D: 3 };
          const idx = idxMap[question.correctAnswer.toUpperCase()];
          if (idx !== undefined) {
            correctOption = options[idx] || null;
          }
        }

        const isCorrect = !!correctOption && userAnswer === correctOption;

        if (isCorrect) correct++;

        results.push({
          questionIndex: i,
          userAnswer,
          correctAnswer: correctOption,
          isCorrect
        });
      }

      const score = (correct / mockTest.questions.length) * 100;

      // Update takenBy array
      const takenEntry = {
        userId,
        score,
        timeTaken: 0, // TODO: Implement timer
        completedAt: new Date()
      };

      await MockTest.findByIdAndUpdate(mockTestId, {
        $push: { takenBy: takenEntry }
      });

      return {
        score,
        correct,
        total: mockTest.questions.length,
        results,
        percentage: Math.round(score)
      };
    } catch (error) {
      console.error('❌ Failed to submit mock test:', error);
      throw new Error(`Failed to submit test: ${error.message}`);
    }
  }

  /**
   * Get generation statistics
   */
  async getGenerationStats(userId) {
    try {
      const stats = await MockTest.aggregate([
        { $match: { generatedBy: userId } },
        {
          $group: {
            _id: null,
            totalTests: { $sum: 1 },
            completedTests: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            totalQuestions: { $sum: '$totalQuestions' },
            avgQuestionsPerTest: { $avg: '$totalQuestions' },
            subjects: { $addToSet: '$subject' }
          }
        }
      ]);

      return stats[0] || {
        totalTests: 0,
        completedTests: 0,
        totalQuestions: 0,
        avgQuestionsPerTest: 0,
        subjects: []
      };
    } catch (error) {
      console.error('❌ Failed to get generation stats:', error);
      throw new Error(`Stats retrieval failed: ${error.message}`);
    }
  }
}

export default new MockTestGenerationService();