import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
// Lazy import to avoid initialization before .env is loaded
import premilTestGenerationService from '../services/premilTestGenerationService.js';
import PremilTestSession from '../models/PremilTestSession.js';
import PremilQuestion from '../models/PremilQuestion.js';
import documentProcessingService from '../services/documentProcessingService.js';
import Document from '../models/Document.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Create temp directory if it doesn't exist
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, TXT, DOC, and DOCX files are allowed.'), false);
    }
  }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * Upload document for prelims preparation
 * POST /api/premil/admin/upload
 */
router.post('/admin/upload', authMiddleware, adminMiddleware, upload.single('document'), async (req, res) => {
  let tempFilePath = null;

  try {
    const { subject, topic } = req.body;
    const file = req.file;
    const uploadedBy = req.user.id;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!subject || !topic) {
      return res.status(400).json({ error: 'Subject and topic are required' });
    }

    console.log(`📤 Admin uploading document: ${file.originalname} (${subject} - ${topic})`);

    tempFilePath = file.path;

    // Create document record in database
    const document = new Document({
      filename: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      subject,
      topic,
      uploadedBy
    });

    const savedDocument = await document.save();
    console.log(`📄 Document record created: ${savedDocument._id}`);

    // Process document (extract text, split into chunks, generate embeddings)
    const processingResult = await documentProcessingService.processDocument(
      savedDocument._id.toString(),
      file.path
    );

    // Clean up temp file after successful processing
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (cleanupError) {
      console.warn('⚠️ Failed to cleanup temp file:', cleanupError);
    }

    res.json({
      success: true,
      message: 'Document uploaded and processed successfully',
      documentId: savedDocument._id,
      chunksCreated: processingResult.chunksCreated,
      embeddingsGenerated: processingResult.embeddingsGenerated
    });

  } catch (error) {
    console.error('❌ Document upload failed:', error);

    // Clean up temp file on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup temp file on error:', cleanupError);
      }
    }

    res.status(500).json({
      error: 'Failed to upload document',
      details: error.message
    });
  }
});

/**
 * Get all uploaded documents
 * GET /api/premil/admin/documents
 */
router.get('/admin/documents', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const Document = (await import('../models/Document.js')).default;

    const documents = await Document.find()
      .sort({ createdAt: -1 })
      .select('filename subject topic fileSize uploadedBy createdAt')
      .populate('uploadedBy', 'name email');

    res.json({ documents });

  } catch (error) {
    console.error('❌ Failed to get documents:', error);
    res.status(500).json({ error: 'Failed to retrieve documents' });
  }
});

/**
 * Get prelims generation statistics
 * GET /api/premil/admin/stats
 */
router.get('/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { default: premilTestGenerationService } = await import('../services/premilTestGenerationService.js');
    const stats = await premilTestGenerationService.getGenerationStats();

    // Additional admin stats
    const Document = (await import('../models/Document.js')).default;
    const DocumentChunk = (await import('../models/DocumentChunk.js')).default;

    const totalDocuments = await Document.countDocuments();
    const totalChunks = await DocumentChunk.countDocuments();

    // Get available subjects and topics
    const subjectStats = await DocumentChunk.aggregate([
      {
        $group: {
          _id: {
            subject: '$metadata.subject',
            topic: '$metadata.topic'
          },
          chunkCount: { $sum: 1 },
          totalWords: { $sum: '$wordCount' }
        }
      },
      {
        $group: {
          _id: '$_id.subject',
          topics: {
            $push: {
              topic: '$_id.topic',
              chunks: '$chunkCount',
              words: '$totalWords'
            }
          },
          totalChunks: { $sum: '$chunkCount' },
          totalWords: { $sum: '$totalWords' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      ...stats,
      documents: {
        totalDocuments,
        totalChunks,
        availableContent: subjectStats
      },
      systemStatus: {
        aiService: 'Available (OpenRouter + Claude)',
        vectorStore: 'MongoDB-only (ChromaDB disabled)',
        costOptimization: 'Active'
      }
    });

  } catch (error) {
    console.error('❌ Failed to get stats:', error);
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

// ==========================================
// STUDENT ROUTES
// ==========================================

/**
 * Generate or retrieve prelims test
 * POST /api/premil/generate
 */
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { subject, topic, difficulty, questionCount } = req.body;
    const studentId = req.user.id;

    // Validate input
    if (!subject || !topic || !difficulty || !questionCount) {
      return res.status(400).json({
        error: 'Subject, topic, difficulty, and questionCount are required'
      });
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({ error: 'Difficulty must be easy, medium, or hard' });
    }

    if (questionCount < 5 || questionCount > 100) {
      return res.status(400).json({ error: 'Question count must be between 5 and 100' });
    }

    console.log(`🎯 Student ${studentId} requesting test: ${subject} - ${topic} (${difficulty}, ${questionCount} questions)`);

    // Lazy import service to ensure .env is loaded
    const { default: premilTestGenerationService } = await import('../services/premilTestGenerationService.js');

    // Generate or retrieve test with cost optimization
    const result = await premilTestGenerationService.generateOrRetrieveTest({
      subject,
      topic,
      difficulty,
      questionCount,
      studentId
    });

    res.json({
      success: true,
      sessionId: result.sessionId,
      cached: result.cached,
      questions: result.questions,
      totalQuestions: result.totalQuestions,
      aiCost: result.aiCost, // Cost in cents
      generationTime: result.generationTime || 0,
      message: result.cached ?
        'Test served from cache (cost optimized!)' :
        'New test generated using AI'
    });

  } catch (error) {
    console.error('❌ Test generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate test',
      details: error.message
    });
  }
});

/**
 * Submit prelims test answers
 * POST /api/premil/submit
 */
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { sessionId, answers, timeSpent } = req.body;

    if (!sessionId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({
        error: 'sessionId and answers array are required'
      });
    }

    console.log(`📝 Student submitting test: ${sessionId} (${answers.length} answers)`);

    // Submit test and calculate score
    const result = await premilTestGenerationService.submitTest(sessionId, answers, timeSpent);

    res.json({
      success: true,
      result: {
        sessionId: result.sessionId,
        score: result.score,
        percentage: result.percentage,
        correctAnswers: result.correctAnswers,
        totalQuestions: result.totalQuestions,
        timeSpent: result.timeSpent,
        status: 'completed'
      }
    });

  } catch (error) {
    console.error('❌ Test submission failed:', error);
    res.status(500).json({
      error: 'Failed to submit test',
      details: error.message
    });
  }
});

/**
 * Get student's test history
 * GET /api/premil/history
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const studentId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const history = await PremilTestSession.getStudentHistory(studentId, page, limit);

    res.json({
      success: true,
      history: history.sessions,
      pagination: history.pagination
    });

  } catch (error) {
    console.error('❌ Failed to get test history:', error);
    res.status(500).json({ error: 'Failed to retrieve test history' });
  }
});

/**
 * Get test session details
 * GET /api/premil/session/:sessionId
 */
router.get('/session/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user.id;

    const session = await PremilTestSession.findOne({
      sessionId,
      studentId
    }).populate('questionOrder.questionId', 'question options correctAnswer explanation');

    if (!session) {
      return res.status(404).json({ error: 'Test session not found' });
    }

    // Return session details with answers if submitted
    const response = {
      sessionId: session.sessionId,
      testKey: session.testKey,
      subject: session.subject,
      topic: session.topic,
      difficulty: session.difficulty,
      totalQuestions: session.totalQuestions,
      status: session.status,
      startedAt: session.startedAt,
      submittedAt: session.submittedAt,
      timeSpent: session.timeSpent,
      score: session.score,
      percentage: session.percentage,
      wasCached: session.wasCached
    };

    if (session.status === 'completed' && session.answers) {
      response.detailedResults = session.answers.map((answer, index) => {
        const questionOrder = session.questionOrder.find(q => q.shuffledIndex === answer.questionIndex);
        const question = questionOrder ? session.questionOrder.id(questionOrder.questionId) : null;

        return {
          questionIndex: index,
          question: question?.question || 'Question not found',
          options: question?.options ? 
            // Convert array to object for frontend compatibility if needed, or send as array
            // Frontend TestHistoryPage expects options as object {A: "...", B: "..."}?
            // Let's check TestHistoryPage line 462: Object.entries(question.options)
            // So it expects an object or array?
            // "Object.entries" works on Arrays too (indices as keys), but let's see.
            // If question.options is ["Opt1", "Opt2"], Object.entries gives [["0", "Opt1"], ["1", "Opt2"]]
            // But the UI code uses `key` as `A`, `B`... 
            // "key === question.correctAnswer" suggests keys are "A", "B", etc.
            // Backend `PremilQuestion` options are Array of strings.
            // `correctAnswer` is "A", "B"...
            // We need to map ["Opt1", "Opt2"] to {A: "Opt1", B: "Opt2"}.
            question.options.reduce((acc, opt, i) => ({ ...acc, [String.fromCharCode(65 + i)]: opt }), {})
            : {},
          selectedAnswer: answer.selectedAnswer,
          correctAnswer: question?.correctAnswer || 'N/A',
          explanation: question?.explanation || 'No explanation available',
          isCorrect: answer.isCorrect,
          timeSpent: answer.timeSpent
        };
      });
    }

    res.json({ success: true, session: response });

  } catch (error) {
    console.error('❌ Failed to get session details:', error);
    res.status(500).json({ error: 'Failed to retrieve session details' });
  }
});

/**
 * Get available subjects and topics
 * GET /api/premil/subjects
 */
router.get('/subjects', authMiddleware, async (req, res) => {
  try {
    // Get distinct subjects and their topics from uploaded documents
    const Document = (await import('../models/Document.js')).default;

    const subjectTopicMap = await Document.aggregate([
      {
        $group: {
          _id: '$subject',
          topics: { $addToSet: '$topic' },
          documentCount: { $sum: 1 }
        }
      },
      {
        $project: {
          subject: '$_id',
          topics: 1,
          documentCount: 1,
          _id: 0
        }
      },
      { $sort: { subject: 1 } }
    ]);

    res.json({
      success: true,
      subjects: subjectTopicMap
    });

  } catch (error) {
    console.error('❌ Failed to get subjects:', error);
    res.status(500).json({ error: 'Failed to retrieve subjects' });
  }
});

/**
 * Get student's test history
 * GET /api/premil/history
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const studentId = req.user.id;

    const result = await PremilTestSession.getStudentHistory(studentId, page, limit);

    // Map _id to id for frontend compatibility if needed, though frontend uses _id
    const tests = result.sessions.map(session => ({
      _id: session._id,
      sessionId: session.sessionId,
      testKey: session.testKey,
      subject: session.subject,
      topic: session.topic,
      difficulty: session.difficulty,
      score: session.score,
      percentage: session.percentage,
      totalQuestions: session.totalQuestions,
      status: session.status,
      createdAt: session.createdAt,
      submittedAt: session.submittedAt,
      timeSpent: session.timeSpent,
      isSubmitted: session.status === 'completed'
    }));

    res.json({
      success: true,
      data: {
        tests,
        pagination: result.pagination
      }
    });

  } catch (error) {
    console.error('❌ Failed to get history:', error);
    res.status(500).json({ error: 'Failed to retrieve history' });
  }
});

/**
 * Get test configuration options
 * GET /api/premil/config
 */
router.get('/config', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        difficulties: ['easy', 'medium', 'hard'],
        questionCounts: [10, 20, 30, 50, 100],
        timeLimits: {
          10: 900,   // 15 minutes
          20: 1800,  // 30 minutes
          30: 2700,  // 45 minutes
          50: 4500,  // 75 minutes
          100: 7200  // 2 hours
        },
        subjects: [
          'History',
          'Geography',
          'Polity',
          'Economy',
          'Environment',
          'Science & Technology',
          'General Studies',
          'Current Affairs'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Failed to get config:', error);
    res.status(500).json({ error: 'Failed to retrieve configuration' });
  }
});

/**
 * DEBUG: Check available content and chunks
 * GET /api/premil/debug/content
 */
router.get('/debug/content', authMiddleware, async (req, res) => {
  try {
    const DocumentChunk = (await import('../models/DocumentChunk.js')).default;

    const sampleChunks = await DocumentChunk.find({})
      .limit(5)
      .select('text metadata subject topic wordCount')
      .sort({ createdAt: -1 });

    const stats = await DocumentChunk.aggregate([
      {
        $group: {
          _id: {
            subject: '$metadata.subject',
            topic: '$metadata.topic'
          },
          count: { $sum: 1 },
          totalWords: { $sum: '$wordCount' }
        }
      },
      { $sort: { '_id.subject': 1, '_id.topic': 1 } }
    ]);

    res.json({
      totalChunks: await DocumentChunk.countDocuments(),
      availableSubjects: stats,
      sampleChunks: sampleChunks.map(chunk => ({
        subject: chunk.metadata.subject,
        topic: chunk.metadata.topic,
        wordCount: chunk.wordCount,
        textPreview: chunk.text.substring(0, 100) + '...'
      }))
    });

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({ error: 'Debug failed', details: error.message });
  }
});

export default router;