import mongoose from 'mongoose';

const documentChunkSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  chunkIndex: {
    type: Number,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  wordCount: {
    type: Number,
    required: true
  },
  startPosition: {
    type: Number,
    required: true // Character position in original document
  },
  endPosition: {
    type: Number,
    required: true // Character position in original document
  },
  pageNumber: {
    type: Number,
    default: null
  },
  // Vector database reference
  vectorId: {
    type: String,
    required: true // ChromaDB document ID
  },
  metadata: {
    subject: String,
    topic: String,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    keywords: [String],
    summary: String
  }
}, {
  timestamps: true
});

// Compound indexes for efficient retrieval
documentChunkSchema.index({ documentId: 1, chunkIndex: 1 });
documentChunkSchema.index({ 'metadata.subject': 1, 'metadata.topic': 1 });
documentChunkSchema.index({ 'metadata.difficulty': 1 });
documentChunkSchema.index({ vectorId: 1 }, { unique: true });

const DocumentChunk = mongoose.model('DocumentChunk', documentChunkSchema);

export default DocumentChunk;