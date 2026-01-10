import mongoose from 'mongoose';

const modelDrivenTopicSchema = new mongoose.Schema({
  // Core topic information
  topicTitle: {
    type: String,
    required: true,
    index: true,
    maxlength: 200
  },

  category: {
    type: String,
    required: true,
    enum: ['Economy', 'Polity', 'IR', 'Environment', 'S&T', 'Security', 'Society'],
    index: true
  },

  // UPSC-specific mappings
  gsPaperMapping: {
    primary: {
      type: String,
      required: true,
      enum: ['GS-I', 'GS-II', 'GS-III', 'GS-IV']
    },
    secondary: [{
      type: String,
      enum: ['GS-I', 'GS-II', 'GS-III', 'GS-IV']
    }],
    reasoning: {
      type: String,
      maxlength: 300
    }
  },

  // Importance and relevance
  importanceScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    index: true
  },

  trendReasoning: {
    type: String,
    maxlength: 500,
    required: true
  },

  tags: [{
    type: String,
    maxlength: 50
  }],

  // Generated analysis content
  analysis: {
    whyInNews: {
      type: String,
      required: true,
      maxlength: 300
    },
    background: {
      type: String,
      required: true,
      maxlength: 600
    },
    gsPaperMapping: {
      primary: {
        type: String,
        enum: ['GS-I', 'GS-II', 'GS-III', 'GS-IV']
      },
      secondary: [{
        type: String,
        enum: ['GS-I', 'GS-II', 'GS-III', 'GS-IV']
      }],
      reasoning: String
    },
    prelimsFacts: [{
      type: String,
      maxlength: 200
    }],
    mainsPoints: {
      introduction: {
        type: String,
        maxlength: 400
      },
      body: {
        significance: [{
          type: String,
          maxlength: 300
        }],
        challenges: [{
          type: String,
          maxlength: 300
        }],
        criticism: [{
          type: String,
          maxlength: 300
        }],
        wayForward: [{
          type: String,
          maxlength: 300
        }]
      },
      conclusion: {
        type: String,
        maxlength: 400
      }
    },
    probableQuestions: [{
      type: String,
      maxlength: 300
    }]
  },

  // Metadata and generation tracking
  isModelDriven: {
    type: Boolean,
    default: true,
    required: true
  },

  generatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  lastUpdated: {
    type: Date,
    default: Date.now
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  version: {
    type: Number,
    default: 1,
    min: 1
  },

  // Ethical safeguards and validation
  ethicalValidation: {
    disclaimer: {
      type: String,
      maxlength: 500
    },
    avoidSpecifics: {
      type: Boolean,
      default: true
    },
    conceptualFocus: {
      type: Boolean,
      default: true
    },
    validatedAt: {
      type: Date,
      default: Date.now
    }
  },

  // Generation metadata
  generationMetadata: {
    agentVersion: String,
    modelUsed: String,
    temperature: Number,
    maxTokens: Number,
    analysisGenerated: {
      type: Boolean,
      default: true
    },
    error: String
  },

  // Status and lifecycle
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    index: true
  }

}, {
  timestamps: true
});

// Indexes for efficient queries
modelDrivenTopicSchema.index({ topicTitle: 1, isActive: 1 });
modelDrivenTopicSchema.index({ category: 1, importanceScore: -1, isActive: 1 });
modelDrivenTopicSchema.index({ generatedAt: -1, isActive: 1 });
modelDrivenTopicSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup

// Pre-save middleware to update lastUpdated
modelDrivenTopicSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Static method to get active trending topics
modelDrivenTopicSchema.statics.getActiveTrendingTopics = function(filters = {}) {
  const query = { isActive: true, ...filters };
  return this.find(query).sort({ importanceScore: -1, generatedAt: -1 });
};

// Static method to cleanup expired topics
modelDrivenTopicSchema.statics.cleanupExpired = function() {
  return this.deleteMany({ expiresAt: { $lt: new Date() } });
};

// Instance method to check if topic needs refresh
modelDrivenTopicSchema.methods.needsRefresh = function() {
  const daysSinceGeneration = (Date.now() - this.generatedAt) / (1000 * 60 * 60 * 24);
  return daysSinceGeneration > 7; // Refresh weekly
};

// Instance method to get full analysis with metadata
modelDrivenTopicSchema.methods.getFullAnalysis = function() {
  return {
    topic: this.topicTitle,
    metadata: {
      category: this.category,
      gsPaperMapping: this.gsPaperMapping,
      importanceScore: this.importanceScore,
      tags: this.tags,
      generatedAt: this.generatedAt,
      lastUpdated: this.lastUpdated,
      isModelDriven: this.isModelDriven,
      disclaimer: this.ethicalValidation?.disclaimer,
      agentVersion: this.generationMetadata?.agentVersion
    },
    analysis: this.analysis
  };
};

export default mongoose.model('ModelDrivenTopic', modelDrivenTopicSchema);
