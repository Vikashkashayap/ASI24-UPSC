import mongoose from 'mongoose';

const trendingTopicSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
    index: true
  },
  frequency: {
    type: Number,
    default: 1,
    min: 1
  },
  relevanceScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  category: {
    type: String,
    enum: ['Politics', 'Economy', 'International Relations', 'Science & Technology', 'Environment', 'Society', 'Governance', 'Defense', 'Other'],
    default: 'Other'
  },
  gsPapers: [{
    type: String,
    enum: ['GS-I', 'GS-II', 'GS-III', 'GS-IV']
  }],
  firstDetected: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  sourceCount: {
    type: Number,
    default: 1
  },
  sources: [{
    name: String,
    url: String,
    publishDate: Date,
    snippet: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  researchData: {
    whyInNews: String,
    background: String,
    prelimsFacts: [String],
    mainsPoints: {
      pros: [String],
      cons: [String],
      wayForward: [String]
    },
    probableQuestions: [String]
  },
  generatedAt: Date,
  confidenceScore: {
    type: Number,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
trendingTopicSchema.index({ topic: 1, lastUpdated: -1 });
trendingTopicSchema.index({ category: 1, relevanceScore: -1 });
trendingTopicSchema.index({ isActive: 1, frequency: -1 });

export default mongoose.model('TrendingTopic', trendingTopicSchema);
