import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  documentType: {
    type: String,
    enum: ['notes', 'pyq', 'current_affairs', 'reference_material'],
    default: 'notes'
  },
  subject: {
    type: String,
    required: true,
    enum: ['History', 'Geography', 'Polity', 'Economy', 'Environment', 'Science & Technology', 'General Studies', 'Current Affairs']
  },
  topic: {
    type: String,
    required: true,
    trim: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalPages: {
    type: Number,
    default: 0
  },
  totalChunks: {
    type: Number,
    default: 0
  },
  processingStatus: {
    type: String,
    enum: ['uploaded', 'processing', 'completed', 'failed'],
    default: 'uploaded'
  },
  processingError: {
    type: String,
    default: null
  },
  metadata: {
    extractedText: String,
    textLength: Number,
    wordCount: Number,
    language: {
      type: String,
      default: 'en'
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
documentSchema.index({ subject: 1, topic: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ processingStatus: 1 });

const Document = mongoose.model('Document', documentSchema);

export default Document;