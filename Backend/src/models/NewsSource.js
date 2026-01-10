import mongoose from 'mongoose';

const newsSourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  url: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['news', 'government', 'editorial', 'academic'],
    required: true
  },
  category: {
    type: String,
    enum: ['national', 'international', 'regional', 'specialized'],
    default: 'national'
  },
  reliabilityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  apiEndpoint: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    select: false // Don't include in regular queries
  },
  headers: {
    type: Map,
    of: String,
    default: {}
  },
  rateLimit: {
    requests: { type: Number, default: 100 },
    period: { type: Number, default: 60 }, // minutes
    lastRequest: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastFetched: Date,
  errorCount: {
    type: Number,
    default: 0
  },
  successCount: {
    type: Number,
    default: 0
  },
  fetchConfig: {
    method: { type: String, default: 'GET' },
    timeout: { type: Number, default: 30000 },
    retries: { type: Number, default: 3 },
    retryDelay: { type: Number, default: 1000 }
  }
}, {
  timestamps: true
});

// Index for efficient source lookups
newsSourceSchema.index({ type: 1, isActive: 1 });
newsSourceSchema.index({ lastFetched: 1 });

export default mongoose.model('NewsSource', newsSourceSchema);
