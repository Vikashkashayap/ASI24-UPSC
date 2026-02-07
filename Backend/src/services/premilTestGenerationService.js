import PremilQuestion from '../models/PremilQuestion.js';
import PremilTestSession from '../models/PremilTestSession.js';
import retrievalService from './retrievalService.js';
import { ChatOpenAI } from '@langchain/openai';
import fetch from 'node-fetch';

// OpenRouter client for Claude models
class OpenRouterChat {
  constructor(options) {
    this.apiKey = options.apiKey;
    this.modelName = options.modelName || 'anthropic/claude-3.5-sonnet';
    this.temperature = options.temperature || 0.3;
    this.maxTokens = options.maxTokens || 4000;
    this.baseURL = 'https://openrouter.ai/api/v1';

    console.log(`🔧 OpenRouter Client initialized with model: ${this.modelName}`);
  }

  async invoke(messages) {
    try {
      console.log(`📡 Calling OpenRouter API with model: ${this.modelName}`);

      const requestBody = {
        model: this.modelName,
        messages: messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens
      };

      console.log(`📨 Request payload size: ${JSON.stringify(requestBody).length} characters`);

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://studentportal.mentorsdaily.com',
          'X-Title': 'UPSC AI Test Generator'
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`📥 OpenRouter response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ OpenRouter API error: ${response.status} ${errorText}`);
        throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ OpenRouter API success, response size: ${JSON.stringify(data).length} characters`);

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenRouter API');
      }

      return {
        content: data.choices[0].message.content
      };
    } catch (error) {
      console.error('❌ OpenRouter API call failed:', error.message);
      throw error;
    }
  }
}

class PremilTestGenerationService {
  constructor() {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    console.log('🔧 Initializing PremilTestGenerationService...');
    console.log(`🔑 OpenRouter Key: ${openRouterKey ? 'Present' : 'Missing'}`);
    console.log(`🔑 OpenAI Key: ${openAiKey ? 'Present' : 'Missing'}`);
    console.log(`🤖 AI Model: ${process.env.AI_MODEL || 'anthropic/claude-3.5-sonnet'}`);

    if (!openRouterKey && !openAiKey) {
      console.warn('⚠️ No AI API key found. AI features will be disabled.');
      this.llm = null;
      this.apiProvider = null;
    } else if (openRouterKey) {
      try {
        // Use OpenRouter for Claude models
        this.llm = new OpenRouterChat({
          apiKey: openRouterKey,
          modelName: process.env.AI_MODEL || 'anthropic/claude-3.5-sonnet',
          temperature: 0.3,
          maxTokens: 4000
        });
        this.apiProvider = 'openrouter';
        console.log('✅ Using OpenRouter API with Claude 3.5 Sonnet');
      } catch (error) {
        console.error('❌ Failed to initialize OpenRouter client:', error);
        this.llm = null;
        this.apiProvider = null;
      }
    } else {
      try {
        // Fallback to OpenAI
        this.llm = new ChatOpenAI({
          openAIApiKey: openAiKey,
          modelName: process.env.AI_MODEL || 'gpt-4o-mini',
          temperature: 0.3,
          maxTokens: 4000
        });
        this.apiProvider = 'openai';
        console.log('✅ Using OpenAI API');
      } catch (error) {
        console.error('❌ Failed to initialize OpenAI client:', error);
        this.llm = null;
        this.apiProvider = null;
      }
    }

    // Cost tracking (in cents per 1K tokens)
    this.costPerThousandTokens = {
      'openrouter': 8,     // ~$0.08 per 1K tokens for Claude 3.5 Sonnet via OpenRouter
      'gpt-4o-mini': 15,   // $0.15 per 1K tokens
      'gpt-3.5-turbo': 5,  // $0.05 per 1K tokens
    };

    console.log(`🎯 AI Service Status: ${this.llm ? 'Available' : 'Unavailable'} (${this.apiProvider || 'None'})`);
  }

  /**
   * COST OPTIMIZATION CORE: Generate test only ONCE per unique configuration
   * CRITICAL: AI is called ONLY when test_key doesn't exist in DB
   *
   * Flow:
   * 1. Generate deterministic test_key from (subject + topic + difficulty + questionCount)
   * 2. IF test_key exists in DB: serve cached questions (NO AI COST)
   * 3. ELSE: Generate via AI once, cache in DB, then serve (AI COST = 1x per test_key)
   * 4. All students get same questions for same test_key (cost-free reuse)
   */
  async generateOrRetrieveTest(params) {
    const { subject, topic, difficulty, questionCount, studentId } = params;

    // Generate deterministic test_key (DOES NOT include studentId)
    const testKey = PremilQuestion.generateTestKey(subject, topic, difficulty, questionCount);

    console.log(`🔑 Generated test_key: ${testKey}`);
    console.log(`🎯 Checking if test exists for key: ${testKey}`);

    // COST OPTIMIZATION CHECK: Has this exact test been generated before?
    const testExists = await PremilQuestion.testExists(testKey);

    if (testExists) {
      // 🎉 COST SAVED: Serve from cache (NO AI CALL)
      console.log(`💰 COST OPTIMIZATION: Serving CACHED test for ${testKey}`);
      console.log(`🚫 AI CALL: SKIPPED (questions exist in DB)`);

      const questions = await PremilQuestion.getTestQuestions(testKey, true);

      const session = await this.createTestSession(
        studentId, testKey, subject, topic, difficulty, questionCount, questions, true
      );

      return {
        success: true,
        cached: true, // Indicates this came from cache
        sessionId: session.sessionId,
        questions: questions.map(q => ({
          id: q._id,
          question: q.question,
          options: q.options,
          questionIndex: q.questionIndex
        })),
        totalQuestions: questions.length,
        aiCost: 0, // NO AI COST for cached tests
        message: 'Test served from cache (cost optimized!)'
      };
    }

    // 🤖 FIRST TIME: AI CALL REQUIRED for this test_key
    console.log(`🆕 NEW TEST: Generating questions for ${testKey}`);
    console.log(`🤖 AI CALL: REQUIRED (first time for this test configuration)`);

    const startTime = Date.now();
    let generationResult;
    try {
      generationResult = await this.generateNewTest(subject, topic, difficulty, questionCount, testKey);
    } catch (genError) {
      console.error('❌ generateNewTest threw error:', genError);
      throw new Error(`Failed to generate test: ${genError.message}`);
    }
    const generationTime = Date.now() - startTime;

    if (!generationResult || !generationResult.success) {
      const errorMsg = generationResult?.error || 'Unknown generation error';
      throw new Error(`Failed to generate test: ${errorMsg}`);
    }

    if (!generationResult.questions || generationResult.questions.length === 0) {
      throw new Error('Failed to generate test: No questions were generated');
    }

    const session = await this.createTestSession(
      studentId, testKey, subject, topic, difficulty, questionCount, generationResult.questions, false
    );

    console.log(`💾 Test cached for future use. Future calls will be cost-free.`);

    return {
      success: true,
      cached: false, // Indicates this was newly generated
      sessionId: session.sessionId,
      questions: generationResult.questions.map(q => ({
        id: q._id,
        question: q.question,
        options: q.options,
        questionIndex: q.questionIndex
      })),
      totalQuestions: generationResult.questions.length,
      aiCost: generationResult.totalCost,
      generationTime,
      message: 'New test generated using AI'
    };
  }

  /**
   * Generate new test using RAG with strict source control
   * AI called only once per unique test_key - COST OPTIMIZATION CORE
   */
  async generateNewTest(subject, topic, difficulty, questionCount, testKey) {
    try {
      console.log(`📚 Retrieving relevant chunks for ${subject} - ${topic}`);

      // Retrieve relevant document chunks using vector search
      const retrievalResult = await retrievalService.retrieveForMockTest(
        subject,
        topic,
        difficulty,
        questionCount * 2 // Retrieve more chunks for better selection
      );

      if (retrievalResult.chunks.length === 0) {
        throw new Error(`No relevant content found for ${subject} - ${topic}. Please ensure admin has uploaded study materials for this subject/topic combination.`);
      }

      console.log(`📄 Retrieved ${retrievalResult.chunks.length} relevant chunks`);

      // Combine chunks into context with strict length control
      const context = this.buildContextFromChunks(retrievalResult.chunks, 8000); // 8K token limit

      console.log(`📄 Context built: ${context.text.length} characters from ${context.chunks.length} chunks`);
      console.log(`📄 Context preview: ${context.text.substring(0, 200)}...`);

      // Generate questions using AI with strict prompt
      let aiResult;
      try {
        aiResult = await this.generateQuestionsWithAI(context, subject, topic, difficulty, questionCount);
      } catch (aiError) {
        console.error('❌ AI generation threw error:', aiError);
        throw new Error(`AI generation failed: ${aiError.message}`);
      }

      if (!aiResult || !aiResult.success) {
        const errorMsg = aiResult?.error || 'Unknown AI generation error';
        throw new Error(`AI generation failed: ${errorMsg}`);
      }

      if (!aiResult.questions || aiResult.questions.length === 0) {
        throw new Error(`AI generated no questions. Error: ${aiResult.error || 'No questions in response'}`);
      }

      // Save questions to database with test_key
      const savedQuestions = await this.saveQuestionsToDatabase(
        aiResult.questions,
        testKey,
        subject,
        topic,
        difficulty,
        questionCount,
        retrievalResult.chunks,
        aiResult.cost || 0,
        aiResult.model,
        aiResult.provider
      );

      return {
        success: true,
        questions: savedQuestions,
        totalCost: aiResult.cost || 0,
        chunksUsed: retrievalResult.chunks.length
      };

    } catch (error) {
      console.error('❌ Test generation failed:', error);
      throw error;
    }
  }

  /**
   * Build context from retrieved chunks with quality filtering
   */
  buildContextFromChunks(chunks, maxLength = 8000) {
    let context = '';
    const selectedChunks = [];

    // Filter and sort chunks by quality and relevance
    const filteredChunks = chunks
      .filter(chunk => this.isChunkQuality(chunk))
      .sort((a, b) => b.score - a.score); // Sort by relevance score

    console.log(`🔍 Filtered ${filteredChunks.length} quality chunks from ${chunks.length} total`);

    for (const chunk of filteredChunks) {
      const chunkText = chunk.document || chunk.text || '';

      if (context.length + chunkText.length > maxLength) {
        break; // Stop if adding this chunk would exceed limit
      }

      context += chunkText + '\n\n';
      selectedChunks.push(chunk);
    }

    console.log(`📝 Built context: ${context.length} characters from ${selectedChunks.length} chunks`);

    return {
      text: context.trim(),
      chunks: selectedChunks
    };
  }

  /**
   * Check if chunk has sufficient quality for question generation
   */
  isChunkQuality(chunk) {
    const text = chunk.document || chunk.text || '';

    // Must have minimum length
    if (text.length < 50) return false;

    // Count ASCII vs non-ASCII characters (poor PDF extraction has many non-ASCII)
    const asciiChars = (text.match(/[a-zA-Z0-9\s]/g) || []).length;
    const totalChars = text.length;
    const asciiRatio = asciiChars / totalChars;

    // Must have at least 60% ASCII characters (readable text)
    if (asciiRatio < 0.6) {
      console.log(`❌ Low quality chunk: ${asciiRatio.toFixed(2)} ASCII ratio, ${text.length} chars`);
      return false;
    }

    // Must have some meaningful words
    const words = text.split(/\s+/).filter(word => word.length > 2);
    if (words.length < 5) return false;

    return true;
  }

  /**
   * Generate questions using AI with strict source control
   * COST OPTIMIZATION: This is the ONLY place AI is called
   */
  async generateQuestionsWithAI(context, subject, topic, difficulty, questionCount) {
    if (!this.llm) {
      console.error('❌ AI service not initialized');
      return {
        success: false,
        error: 'AI service not available. Please configure OPENAI_API_KEY or OPENROUTER_API_KEY.',
        questions: [],
        cost: 0
      };
    }

    const prompt = this.buildStrictPrompt(subject, topic, difficulty, questionCount);

    console.log(`🤖 Calling AI for ${questionCount} questions on ${subject} - ${topic} (${difficulty})`);
    console.log(`📄 Context length: ${context.text.length} characters`);

    try {
      // STRICT system prompt to prevent external knowledge usage
      const messages = [
        {
          role: 'system',
          content: `You are a UPSC question generator with ZERO external knowledge.

CRITICAL RULES:
1. ONLY use information from the provided CONTEXT
2. If CONTEXT doesn't contain information for a question, DO NOT generate it
3. DO NOT use general knowledge about ${subject} or UPSC
4. DO NOT assume facts not explicitly stated in CONTEXT
5. If CONTEXT is insufficient, generate fewer questions rather than incorrect ones

Your knowledge base is LIMITED to the CONTEXT provided. Treat anything not in CONTEXT as unknown.`
        },
        {
          role: 'user',
          content: `${prompt}\n\n=== CONTEXT FROM UPLOADED NOTES ===\n${context.text}\n\n=== END CONTEXT ===\n\nGenerate UPSC questions using ONLY the above context.`
        }
      ];

      const startTime = Date.now();
      const response = await this.llm.invoke(messages);
      const endTime = Date.now();

      const content = response.content.trim();

      // Calculate AI cost (this is the ONLY place cost is incurred)
      const promptTokens = this.estimateTokens(prompt + context.text);
      const completionTokens = this.estimateTokens(content);
      const totalTokens = promptTokens + completionTokens;
      const costPerThousand = this.costPerThousandTokens[this.apiProvider] || this.costPerThousandTokens['openrouter'];
      const cost = Math.ceil((totalTokens / 1000) * costPerThousand); // Cost in cents

      console.log(`💰 AI COST INCURRED: $${(cost/100).toFixed(3)} (${totalTokens} tokens via ${this.apiProvider}, ${endTime - startTime}ms)`);

      // Parse and validate questions
      const questions = this.parseQuestionsResponse(content);

      console.log(`📝 AI Response Preview: ${content.substring(0, 200)}...`);
      console.log(`✅ Parsed ${questions.length} questions from AI response`);

      if (questions.length === 0) {
        console.error('❌ AI Response (full):', content);
        console.error('❌ Context length:', context.text.length);
        console.error('❌ Context preview:', context.text.substring(0, 300));
        throw new Error(`AI generated no valid questions. Response length: ${content.length}, Context length: ${context.text.length}`);
      }

      if (questions.length < questionCount) {
        console.warn(`⚠️ AI generated only ${questions.length}/${questionCount} questions (context limitation)`);
      }

      console.log(`✅ AI generated ${questions.length} valid UPSC questions from context`);

      return {
        success: true,
        questions,
        cost,
        tokens: totalTokens,
        model: this.llm ? (this.llm.modelName || 'anthropic/claude-3.5-sonnet') : 'unknown',
        provider: this.apiProvider,
        contextUsed: context.text.length
      };

    } catch (error) {
      console.error('❌ AI generation error:', error);
      return {
        success: false,
        error: error.message,
        questions: [],
        cost: 0
      };
    }
  }

  /**
   * Build ADAPTIVE UPSC prompt - Works with any available content
   */
  buildStrictPrompt(subject, topic, difficulty, questionCount) {
    const difficultyLevels = {
      easy: "basic concepts and simple facts",
      medium: "conceptual understanding and applications",
      hard: "analysis and connections between ideas"
    };

    return `# UPSC PRELIMS QUESTION GENERATOR

## TASK:
Generate ${questionCount} multiple choice questions for ${subject} - ${topic} at ${difficulty} level (${difficultyLevels[difficulty]}).

## QUESTION TYPES (Serve a mix):
1. **Statement-based**: Multiple statements (1, 2, 3), followed by options like "1 and 2 only", "2 and 3 only", etc.
2. **Assertion-Reason**: Two statements labelled Assertion (A) and Reason (R). Options: Both true and R explains A, etc.
3. **Match the Following**: List-I vs List-II.
4. **Counting**: "How many of the above are correct?" (Only one, Only two, All three, None).
5. **Conceptual**: Direct conceptual application.

## CONTENT:
Use the provided context below to create questions. The context may contain educational material, concepts, or any relevant information.

## REQUIREMENTS:
- Create questions that can be answered using ONLY the provided context
- Each question must have exactly 4 options (A, B, C, D)
- Exactly one correct answer
- Avoid direct factual recall; focus on conceptual elimination logic
- **Options must be balanced** (no obvious answers)
- If context is insufficient for ${questionCount} questions, generate fewer
- **Explanation**: Provide a detailed explanation for the correct answer AND why other options are incorrect.

## OUTPUT FORMAT:
Return a valid JSON object with this exact structure:
{
  "questions": [
    {
      "question": "The question text here...",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A",
      "explanation": "Correct Answer: A. Explanation: [Why A is right]. Why others are wrong: [Brief reasoning for B, C, D]"
    }
  ]
}

## IMPORTANT:
- Ensure the JSON is valid and parseable
- Use neutral, academic tone (UPSC style)
- Base answers directly on the context provided
- If unsure about any question, skip it rather than guess

Generate questions now:`;
  }

  /**
   * Parse AI response into structured questions (improved parsing)
   */
  parseQuestionsResponse(content) {
    try {
      console.log('🔍 Parsing AI response...');

      // Try to extract JSON from various formats
      let jsonContent = content.trim();

      // Remove markdown code blocks if present
      jsonContent = jsonContent.replace(/```json\s*/g, '').replace(/```\s*$/g, '');

      // Find JSON object
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('❌ No JSON object found in response');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`📋 Found ${parsed.questions?.length || 0} questions in JSON`);

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        console.log('❌ No questions array in JSON');
        return [];
      }

      // Validate and normalize questions
      const validQuestions = parsed.questions
        .filter(q => this.validateQuestion(q))
        .map((q, index) => ({
          question: q.question.trim(),
          options: q.options.map(opt => opt.trim()),
          correctAnswer: q.correctAnswer.toString().toUpperCase(),
          explanation: q.explanation?.trim() || '',
          questionIndex: index
        }));

      console.log(`✅ ${validQuestions.length} valid questions parsed`);
      return validQuestions;

    } catch (error) {
      console.error('❌ Failed to parse questions response:', error);
      console.error('Raw content:', content.substring(0, 500));
      return [];
    }
  }

  /**
   * Validate question structure (more flexible)
   */
  validateQuestion(question) {
    try {
      // Check basic structure
      if (!question.question || typeof question.question !== 'string') {
        console.log('❌ Question missing or not a string');
        return false;
      }

      if (!Array.isArray(question.options) || question.options.length < 2) {
        console.log('❌ Options missing or insufficient');
        return false;
      }

      // Check if correct answer is valid
      const validAnswers = ['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd'];
      const correctAnswer = question.correctAnswer?.toString()?.toUpperCase();

      if (!validAnswers.includes(correctAnswer)) {
        console.log(`❌ Invalid correct answer: ${question.correctAnswer}`);
        return false;
      }

      // Check if correct answer corresponds to an option
      const correctIndex = ['A', 'B', 'C', 'D'].indexOf(correctAnswer);
      if (correctIndex < 0 || correctIndex >= question.options.length) {
        console.log(`❌ Correct answer index out of range: ${correctIndex}`);
        return false;
      }

      return true;
    } catch (error) {
      console.log('❌ Question validation error:', error.message);
      return false;
    }
  }

  /**
   * Save generated questions to database
   */
  async saveQuestionsToDatabase(questions, testKey, subject, topic, difficulty, questionCount, sourceChunks, aiCost, aiModel = null, aiProvider = null) {
    const savedQuestions = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      const questionDoc = new PremilQuestion({
        testKey,
        subject,
        topic,
        difficulty,
        questionCount,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        questionIndex: i,
        sourceChunks: sourceChunks.map(chunk => ({
          chunkId: chunk.mongoData?._id || chunk.id,
          vectorId: chunk.id,
          relevanceScore: chunk.score || 1.0
        })),
        generationCost: Math.ceil(aiCost / questions.length), // Distribute cost across questions
        aiModel: aiModel || 'anthropic/claude-3.5-sonnet',
        aiProvider: aiProvider || 'openrouter'
      });

      const saved = await questionDoc.save();
      savedQuestions.push(saved);
    }

    console.log(`💾 Saved ${savedQuestions.length} questions for test key: ${testKey}`);
    return savedQuestions;
  }

  /**
   * Create test session for student
   */
  async createTestSession(studentId, testKey, subject, topic, difficulty, questionCount, questions, wasCached) {
    const sessionId = PremilTestSession.generateSessionId();

    // Build question order mapping
    const questionOrder = questions.map((q, index) => ({
      originalIndex: q.questionIndex,
      shuffledIndex: index,
      questionId: q._id
    }));

    const session = new PremilTestSession({
      studentId,
      testKey,
      subject,
      topic,
      difficulty,
      totalQuestions: questionCount,
      sessionId,
      questionOrder,
      wasCached,
      aiCost: wasCached ? 0 : questions.reduce((sum, q) => sum + (q.generationCost || 0), 0)
    });

    await session.save();
    console.log(`📝 Created test session: ${sessionId} for student: ${studentId}`);

    return session;
  }

  /**
   * Submit test answers and calculate score
   */
  async submitTest(sessionId, answers, timeSpent) {
    const session = await PremilTestSession.findOne({ sessionId });
    if (!session) {
      throw new Error('Test session not found');
    }

    if (session.status !== 'in_progress') {
      throw new Error('Test session is not in progress');
    }

    // Validate and score answers
    const validatedAnswers = await this.validateAndScoreAnswers(session, answers);

    // Submit test
    const result = await session.submitTest(validatedAnswers, timeSpent);

    return result;
  }

  /**
   * Validate answers against correct answers and calculate scores
   */
  async validateAndScoreAnswers(session, submittedAnswers) {
    const validatedAnswers = [];

    // Get the original questions to check correct answers
    const questionIds = session.questionOrder.map(q => q.questionId);
    const questions = await PremilQuestion.find({ _id: { $in: questionIds } });

    for (const submitted of submittedAnswers) {
      const questionOrder = session.questionOrder.find(q => q.shuffledIndex === submitted.questionIndex);
      if (!questionOrder) continue;

      const question = questions.find(q => q._id.toString() === questionOrder.questionId.toString());
      if (!question) continue;

      // Find the correct answer in the shuffled options
      const correctAnswerIndex = question.options.indexOf(question.correctAnswer);
      const correctAnswerLabel = ['A', 'B', 'C', 'D'][correctAnswerIndex];

      const isCorrect = submitted.selectedAnswer === correctAnswerLabel;

      validatedAnswers.push({
        questionIndex: submitted.questionIndex,
        selectedAnswer: submitted.selectedAnswer,
        isCorrect,
        timeSpent: submitted.timeSpent || 0,
        answeredAt: new Date()
      });
    }

    return validatedAnswers;
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text) {
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Get generation statistics for cost monitoring
   */
  async getGenerationStats() {
    const stats = await PremilQuestion.aggregate([
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          totalCost: { $sum: '$generationCost' },
          uniqueTestKeys: { $addToSet: '$testKey' },
          avgCostPerQuestion: { $avg: '$generationCost' },
          subjects: { $addToSet: '$subject' }
        }
      }
    ]);

    const sessionStats = await PremilTestSession.aggregate([
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          cachedSessions: {
            $sum: { $cond: [{ $eq: ['$wasCached', true] }, 1, 0] }
          },
          totalAiCost: { $sum: '$aiCost' },
          avgScore: { $avg: '$percentage' }
        }
      }
    ]);

    return {
      questions: stats[0] || {
        totalQuestions: 0,
        totalCost: 0,
        uniqueTestKeys: [],
        avgCostPerQuestion: 0,
        subjects: []
      },
      sessions: sessionStats[0] || {
        totalSessions: 0,
        cachedSessions: 0,
        totalAiCost: 0,
        avgScore: 0
      }
    };
  }
}

export default new PremilTestGenerationService();