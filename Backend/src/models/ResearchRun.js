import mongoose from 'mongoose';

const researchRunSchema = new mongoose.Schema({
  runId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'running', 'completed', 'failed', 'cancelled'],
    default: 'scheduled'
  },
  type: {
    type: String,
    enum: ['manual', 'scheduled', 'webhook', 'model-driven'],
    default: 'manual'
  },
  startTime: Date,
  endTime: Date,
  duration: Number, // in milliseconds

  // Configuration
  config: {
    dateRange: {
      from: Date,
      to: Date
    },
    sources: [String], // Array of source IDs
    categories: [String],
    minRelevanceScore: { type: Number, default: 30 },
    maxTopics: { type: Number, default: 10 }
  },

  // Progress tracking
  progress: {
    totalSteps: { type: Number, default: 0 },
    completedSteps: { type: Number, default: 0 },
    currentStep: String,
    percentage: { type: Number, default: 0, min: 0, max: 100 }
  },

  // Results
  results: {
    topicsFound: { type: Number, default: 0 },
    topicsProcessed: { type: Number, default: 0 },
    topicsUpdated: { type: Number, default: 0 },
    newTopics: { type: Number, default: 0 }
  },

  // Error tracking
  errors: [{
    step: String,
    error: String,
    timestamp: { type: Date, default: Date.now },
    retryCount: { type: Number, default: 0 }
  }],

  // Performance metrics
  metrics: {
    totalApiCalls: { type: Number, default: 0 },
    successfulApiCalls: { type: Number, default: 0 },
    failedApiCalls: { type: Number, default: 0 },
    averageResponseTime: Number,
    peakMemoryUsage: Number
  },

  // Logs
  logs: [{
    level: { type: String, enum: ['info', 'warn', 'error', 'debug'] },
    message: String,
    timestamp: { type: Date, default: Date.now },
    step: String
  }],

  // Trigger information
  triggeredBy: {
    type: String,
    enum: ['scheduler', 'api', 'webhook', 'manual'],
    default: 'manual'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Retry information
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  nextRetryAt: Date
}, {
  timestamps: true
});

// Indexes for efficient queries
researchRunSchema.index({ status: 1, createdAt: -1 });
researchRunSchema.index({ type: 1, status: 1 });
researchRunSchema.index({ runId: 1 });
researchRunSchema.index({ nextRetryAt: 1 });

export default mongoose.model('ResearchRun', researchRunSchema);
