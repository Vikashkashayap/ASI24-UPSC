import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import DocumentChunk from '../models/DocumentChunk.js';
import MockTest from '../models/MockTest.js';
import retrievalService from '../services/retrievalService.js';
import mockTestGenerationService from '../services/mockTestGenerationService.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

console.log('✅ New RAG Routes loaded successfully');

// Import Document model dynamically to avoid startup issues
let Document;
const getDocumentModel = async () => {
  if (!Document) {
    const { default: DocumentModel } = await import('../models/Document.js');
    Document = DocumentModel;
  }
  return Document;
};

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    console.log('Upload directory:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

/**
 * Upload PDF document
 * POST /api/rag/documents/upload
 */
router.post('/documents/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('📁 Upload request received');
    console.log('📄 File:', req.file);
    console.log('📝 Body:', req.body);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Extract metadata from request
    const { documentType, subject, topic } = req.body;

    // Validate required fields
    if (!documentType || !subject || !topic) {
      return res.status(400).json({
        error: 'Document type, subject and topic are required'
      });
    }

    // Validate document type
    const validTypes = ['notes', 'pyq', 'current_affairs', 'reference_material'];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({
        error: 'Invalid document type. Must be one of: notes, pyq, current_affairs, reference_material'
      });
    }

    // Create document record in database
    const DocumentModel = await getDocumentModel();
    const document = new DocumentModel({
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      documentType,
      subject,
      topic,
      uploadedBy: "507f1f77bcf86cd799439011", // Temporary placeholder user ID
      processingStatus: 'uploaded'
    });

    await document.save();

    console.log('✅ Document saved to database:', document._id);

    // Process document asynchronously
    setImmediate(async () => {
      try {
        console.log('🔄 Starting document processing for:', document._id);

        // Import services dynamically to avoid circular dependencies
        const { default: documentProcessingService } = await import('../services/documentProcessingService.js');
        const { default: vectorStoreService } = await import('../services/vectorStoreService.js');

        // Process the document
        const result = await documentProcessingService.processDocument(document._id, req.file.path);

        // Add chunks to vector store
        await vectorStoreService.addChunks(result.chunks, document._id);

        console.log(`✅ Document ${document._id} processed successfully with ${result.totalChunks} chunks`);

      } catch (error) {
        console.error(`❌ Failed to process document ${document._id}:`, error);

        // Update document status to failed
        const DocumentModel = await getDocumentModel();
        await DocumentModel.findByIdAndUpdate(document._id, {
          processingStatus: 'failed',
          processingError: error.message
        });
      }
    });

    res.json({
      success: true,
      message: 'Document uploaded successfully! Processing started in background.',
      documentId: document._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      documentType,
      subject,
      topic,
      status: 'processing'
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get available subjects and topics from processed chunks
 * GET /api/rag/subjects
 */
router.get('/subjects', async (req, res) => {
  try {
    const stats = await DocumentChunk.aggregate([
      {
        $group: {
          _id: { subject: '$metadata.subject', topic: '$metadata.topic' },
          totalChunks: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.subject',
          topics: { $addToSet: '$_id.topic' },
          totalChunks: { $sum: '$totalChunks' }
        }
      },
      {
        $project: {
          _id: 0,
          name: '$_id',
          topics: 1,
          totalChunks: 1
        }
      }
    ]);

    res.json({
      success: true,
      subjects: stats
    });
  } catch (error) {
    console.error('❌ Failed to load RAG subjects:', error);
    res.status(500).json({ error: error.message });
  }
});

// All mock test routes require authentication
router.use('/mock-tests', authMiddleware);

/**
 * Generate a new RAG-based mock test
 * POST /api/rag/mock-tests/generate
 */
router.post('/mock-tests/generate', async (req, res) => {
  try {
    const { subject, topic, difficulty = 'medium', questionCount = 20 } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({ error: 'Subject and topic are required' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await mockTestGenerationService.generateMockTest({
      subject,
      topic,
      difficulty,
      questionCount,
      generatedBy: req.user.id
    });

    res.json({
      success: true,
      mockTestId: result.mockTestId,
      meta: {
        questions: result.questions,
        generationTime: result.generationTime,
        chunksUsed: result.chunksUsed,
        method: result.method
      }
    });
  } catch (error) {
    console.error('❌ Mock test generation API failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get current user's generated mock tests (summary list)
 * GET /api/rag/mock-tests
 */
router.get('/mock-tests', async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [mockTests, total] = await Promise.all([
      MockTest.find({ generatedBy: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('title subject topic difficulty totalQuestions status createdAt'),
      MockTest.countDocuments({ generatedBy: req.user.id })
    ]);

    res.json({
      success: true,
      mockTests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Failed to load user mock tests:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get a single mock test with questions for taking the test
 * GET /api/rag/mock-tests/:id
 */
router.get('/mock-tests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const mockTest = await mockTestGenerationService.getMockTest(id);

    const testObj = mockTest.toObject();
    const questions = (testObj.questions || []).map(q => ({
      subject: q.subject,
      topic: q.topic,
      question: q.question,
      options: q.options,
      // Do not expose raw correctOption field name; map to frontend's expected key
      correct_option: q.correctOption,
      difficulty: q.difficulty,
      explanation: q.explanation
    }));

    res.json({
      _id: testObj._id,
      title: testObj.title,
      subject: testObj.subject,
      topic: testObj.topic,
      difficulty: testObj.difficulty,
      totalQuestions: testObj.totalQuestions,
      status: testObj.status,
      createdAt: testObj.createdAt,
      questions
    });
  } catch (error) {
    console.error('❌ Failed to get mock test by ID:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Submit RAG mock test answers
 * POST /api/rag/mock-tests/:id/submit
 */
router.post('/mock-tests/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers must be an array' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await mockTestGenerationService.submitMockTest(id, req.user.id, answers);
    res.json(result);
  } catch (error) {
    console.error('❌ Failed to submit mock test:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get documents
 */
router.get('/documents', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // For now, get all documents (later we can filter by user)
    const DocumentModel = await getDocumentModel();
    const documents = await DocumentModel.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const total = await DocumentModel.countDocuments({});
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    });

  } catch (error) {
    console.error('❌ Get documents error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get document statistics
 */
router.get('/documents/stats', async (req, res) => {
  try {
    // Get statistics from database
    const DocumentModel = await getDocumentModel();
    const stats = await DocumentModel.aggregate([
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          totalPages: { $sum: '$totalPages' },
          totalChunks: { $sum: '$totalChunks' },
          completedDocuments: {
            $sum: { $cond: [{ $eq: ['$processingStatus', 'completed'] }, 1, 0] }
          },
          failedDocuments: {
            $sum: { $cond: [{ $eq: ['$processingStatus', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalDocuments: 0,
      totalPages: 0,
      totalChunks: 0,
      completedDocuments: 0,
      failedDocuments: 0
    };

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete document by ID
 */
router.delete('/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Delete request for document ID:', id);

    // Find the document
    const DocumentModel = await getDocumentModel();
    const document = await DocumentModel.findById(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete the physical file if it exists
    const fs = await import('fs');
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
      console.log('✅ Physical file deleted:', document.filePath);
    }

    // Delete from database
    await DocumentModel.findByIdAndDelete(id);
    console.log('✅ Document deleted from database:', id);

    res.json({
      success: true,
      message: `Document ${id} deleted successfully`
    });

  } catch (error) {
    console.error('❌ Delete document error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;