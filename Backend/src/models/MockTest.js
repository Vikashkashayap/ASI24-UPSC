import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    enum: ['History', 'Geography', 'Polity', 'Economy', 'Environment', 'Science & Technology', 'General Studies', 'Current Affairs']
  },
  topic: {
    type: String,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  options: [{
    type: String,
    required: true
  }],
  correctOption: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard']
  },
  explanation: {
    type: String,
    default: ''
  },
  // References to source chunks used for generation
  sourceChunks: [{
    chunkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentChunk'
    },
    vectorId: String,
    relevanceScore: Number
  }],
  // Metadata for tracking
  generatedAt: {
    type: Date,
    default: Date.now
  },
  generationTime: Number // in milliseconds
}, { _id: true });

const mockTestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  subject: {
    type: String,
    required: true,
    enum: ['History', 'Geography', 'Polity', 'Economy', 'Environment', 'Science & Technology', 'General Studies', 'Current Affairs']
  },
  topic: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard', 'mixed']
  },
  totalQuestions: {
    type: Number,
    required: true,
    min: 1,
    max: 200
  },
  timeLimit: {
    type: Number, // in minutes
    default: 120
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [questionSchema],
  // Generation metadata
  generationParams: {
    queryEmbedding: [Number], // Store the query embedding for reproducibility
    retrievedChunks: Number,
    generationPrompt: String,
    modelUsed: String
  },
  // Test status
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed'],
    default: 'generating'
  },
  errorMessage: {
    type: String,
    default: null
  },
  // Usage tracking
  takenBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    score: Number,
    timeTaken: Number, // in minutes
    completedAt: Date
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
mockTestSchema.index({ subject: 1, topic: 1, difficulty: 1 });
mockTestSchema.index({ generatedBy: 1 });
mockTestSchema.index({ status: 1 });
mockTestSchema.index({ createdAt: -1 });

const MockTest = mongoose.model('MockTest', mockTestSchema);

export default MockTest;