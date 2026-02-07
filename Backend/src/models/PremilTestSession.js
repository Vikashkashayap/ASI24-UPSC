import mongoose from 'mongoose';

const premilTestSessionSchema = new mongoose.Schema({
  // Student who took the test
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Test configuration
  testKey: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard']
  },
  totalQuestions: {
    type: Number,
    required: true
  },

  // Session tracking
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  attemptNumber: {
    type: Number,
    default: 1,
    min: 1
  },

  // Question order (for consistent scoring)
  questionOrder: [{
    originalIndex: Number, // Original question index in DB
    shuffledIndex: Number, // Position shown to student (0-based)
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PremilQuestion'
    }
  }],

  // Student answers
  answers: [{
    questionIndex: Number, // Position shown to student (0-based)
    selectedAnswer: String, // A, B, C, D
    isCorrect: Boolean,
    timeSpent: Number, // seconds spent on this question
    answeredAt: Date
  }],

  // Test timing
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date,
    default: null
  },
  timeLimit: {
    type: Number,
    default: 7200 // 2 hours in seconds
  },
  timeSpent: {
    type: Number,
    default: 0 // total time spent in seconds
  },

  // Scoring
  score: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  incorrectAnswers: {
    type: Number,
    default: 0
  },
  unansweredQuestions: {
    type: Number,
    default: 0
  },

  // Status
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned', 'timed_out'],
    default: 'in_progress'
  },

  // Cost tracking (for analytics)
  aiCost: {
    type: Number,
    default: 0 // Total AI cost for this test generation in cents
  },
  wasCached: {
    type: Boolean,
    default: false // Whether questions were served from cache
  },

  // Metadata
  ipAddress: String,
  userAgent: String,
  deviceInfo: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
premilTestSessionSchema.index({ studentId: 1, createdAt: -1 });
premilTestSessionSchema.index({ testKey: 1 });
premilTestSessionSchema.index({ sessionId: 1 }, { unique: true });
premilTestSessionSchema.index({ status: 1 });

// Pre-save middleware to calculate score
premilTestSessionSchema.pre('save', function(next) {
  if (this.answers && this.answers.length > 0) {
    this.correctAnswers = this.answers.filter(a => a.isCorrect).length;
    this.incorrectAnswers = this.answers.filter(a => !a.isCorrect && a.selectedAnswer).length;
    this.unansweredQuestions = this.totalQuestions - this.answers.length;

    if (this.totalQuestions > 0) {
      // UPSC Scoring: +2 for correct, -0.66 for incorrect
      const rawScore = (this.correctAnswers * 2) - (this.incorrectAnswers * 0.66);
      this.score = Number(rawScore.toFixed(2)); // Allow negative scores as per real exam

      // Calculate percentage based on total possible marks (totalQuestions * 2)
      const totalPossibleMarks = this.totalQuestions * 2;
      this.percentage = Math.round((Math.max(0, this.score) / totalPossibleMarks) * 100);
    }
  }
  next();
});

// Static method to generate unique session ID
premilTestSessionSchema.statics.generateSessionId = function() {
  return `premil_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Instance method to submit test
premilTestSessionSchema.methods.submitTest = async function(answers, timeSpent) {
  if (this.status !== 'in_progress') {
    throw new Error('Test session is not in progress');
  }

  this.answers = answers;
  this.timeSpent = timeSpent;
  this.submittedAt = new Date();
  this.status = 'completed';

  // Calculate score in pre-save middleware
  await this.save();

  return {
    sessionId: this.sessionId,
    score: this.score,
    percentage: this.percentage,
    correctAnswers: this.correctAnswers,
    totalQuestions: this.totalQuestions,
    timeSpent: this.timeSpent
  };
};

// Static method to get student's test history
premilTestSessionSchema.statics.getStudentHistory = async function(studentId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const sessions = await this.find({ studentId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('sessionId testKey subject topic difficulty score percentage totalQuestions status createdAt submittedAt timeSpent')
    .lean();

  const total = await this.countDocuments({ studentId });

  return {
    sessions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

const PremilTestSession = mongoose.model('PremilTestSession', premilTestSessionSchema);

export default PremilTestSession;