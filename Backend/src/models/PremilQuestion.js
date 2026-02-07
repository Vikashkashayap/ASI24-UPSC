import mongoose from 'mongoose';

const premilQuestionSchema = new mongoose.Schema({
  // Unique test configuration identifier
  // Format: subject_topic_difficulty_questionCount (e.g., "History_AncientIndia_medium_20")
  testKey: {
    type: String,
    required: true
  },

  // Test configuration components
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
    enum: ['easy', 'medium', 'hard']
  },
  questionCount: {
    type: Number,
    required: true,
    min: 5,
    max: 100
  },

  // Question data
  question: {
    type: String,
    required: true
  },
  options: [{
    type: String,
    required: true
  }],
  correctAnswer: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    default: ''
  },

  // Source tracking for cost optimization
  sourceChunks: [{
    chunkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentChunk'
    },
    vectorId: String,
    relevanceScore: Number
  }],

  // Metadata
  questionIndex: {
    type: Number,
    required: true,
    min: 0
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  generationCost: {
    type: Number,
    default: 0 // AI API cost for this question in cents
  },

  // AI generation tracking
  aiModel: {
    type: String,
    default: null
  },
  aiProvider: {
    type: String,
    enum: ['openai', 'openrouter', 'anthropic'],
    default: 'openrouter'
  },
  promptTokens: {
    type: Number,
    default: 0
  },
  completionTokens: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
premilQuestionSchema.index({ testKey: 1, questionIndex: 1 });
premilQuestionSchema.index({ subject: 1, topic: 1, difficulty: 1 });
premilQuestionSchema.index({ 'sourceChunks.chunkId': 1 });

// Static method to generate test key
premilQuestionSchema.statics.generateTestKey = function(subject, topic, difficulty, questionCount) {
  // Normalize strings to avoid duplicates due to case/spacing differences
  const normalizedSubject = subject.toLowerCase().replace(/\s+/g, '');
  const normalizedTopic = topic.toLowerCase().replace(/\s+/g, '');
  const normalizedDifficulty = difficulty.toLowerCase();

  return `${normalizedSubject}_${normalizedTopic}_${normalizedDifficulty}_${questionCount}`;
};

// Static method to check if test exists
premilQuestionSchema.statics.testExists = async function(testKey) {
  const count = await this.countDocuments({ testKey });
  return count > 0;
};

// Static method to get questions for a test
premilQuestionSchema.statics.getTestQuestions = async function(testKey, randomizeOrder = true) {
  let questions = await this.find({ testKey }).sort({ questionIndex: 1 });

  if (randomizeOrder) {
    // Shuffle question order
    questions = questions.sort(() => Math.random() - 0.5);

    // Shuffle options for each question
    questions = questions.map(q => {
      const question = q.toObject();
      const options = [...question.options];
      const correctAnswer = question.correctAnswer;

      // Create shuffled options with new correct answer index
      const shuffledOptions = options.sort(() => Math.random() - 0.5);
      const newCorrectIndex = shuffledOptions.indexOf(correctAnswer);

      // Map A/B/C/D to new positions
      const optionLabels = ['A', 'B', 'C', 'D'];
      question.correctAnswer = optionLabels[newCorrectIndex];
      question.options = shuffledOptions;

      return question;
    });
  }

  return questions;
};

const PremilQuestion = mongoose.model('PremilQuestion', premilQuestionSchema);

export default PremilQuestion;