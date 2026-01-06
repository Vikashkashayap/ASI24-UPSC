import mongoose from "mongoose";

const inlineFeedbackSchema = new mongoose.Schema({
  location: {
    type: String,
    enum: ['introduction', 'body', 'conclusion', 'diagram', 'overall'],
    required: true
  },
  comment: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['positive', 'neutral', 'critical'],
    default: 'neutral'
  }
}, { _id: false });

const marksBreakdownSchema = new mongoose.Schema({
  introduction: { type: Number, default: 0 },
  body: { type: Number, default: 0 },
  conclusion: { type: Number, default: 0 },
  diagram: { type: Number, default: 0 },
  presentation: { type: Number, default: 0 }
}, { _id: false });

const diagramAnalysisSchema = new mongoose.Schema({
  present: { type: Boolean, default: false },
  relevant: { type: Boolean, default: false },
  marksAwarded: { type: Number, default: 0 },
  comment: { type: String, default: '' }
}, { _id: false });

const questionEvaluationSchema = new mongoose.Schema({
  questionNumber: { type: String, required: true },
  questionText: { type: String, default: '' },
  answerText: { type: String, required: true },
  annotatedText: { type: String, default: '' }, // Text with highlight tags
  pageNumber: { type: Number, required: true },
  wordCount: { type: Number, default: 0 },
  wordLimit: { type: Number, default: 250 },
  totalMarks: { type: Number, required: true },
  maxMarks: { type: Number, required: true },
  marksBreakdown: marksBreakdownSchema,
  scoringBreakdown: {
    structure_score: { type: Number, default: 0 },
    content_score: { type: Number, default: 0 },
    analysis_score: { type: Number, default: 0 },
    language_score: { type: Number, default: 0 },
    value_addition_score: { type: Number, default: 0 },
    final_score: { type: Number, default: 0 }
  },
  mistakeSummary: [{ type: String }],
  examinerComment: { type: String, default: '' },
  modelAnswer: { type: String, default: '' },
  diagramSuggestions: { type: String, default: '' },
  inlineFeedback: [inlineFeedbackSchema],
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  improvements: [{ type: String }],
  diagramAnalysis: diagramAnalysisSchema,
  upscRange: {
    type: String,
    enum: ['Below Average', 'Average', 'Above Average', 'Toppers Range'],
    default: 'Average'
  }
}, { _id: false });

const pageWiseSummarySchema = new mongoose.Schema({
  pageNumber: { type: Number, required: true },
  questionsEvaluated: [{
    questionNumber: String,
    marks: Number,
    maxMarks: Number
  }],
  totalMarksOnPage: { type: Number, default: 0 },
  maxMarksOnPage: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 }
}, { _id: false });

const overallScoreSchema = new mongoose.Schema({
  obtained: { type: Number, required: true },
  maximum: { type: Number, required: true },
  percentage: { type: Number, required: true },
  grade: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'F'],
    default: 'C'
  }
}, { _id: false });

const sectionWisePerformanceSchema = new mongoose.Schema({
  introduction: { type: Number, default: 0 },
  body: { type: Number, default: 0 },
  conclusion: { type: Number, default: 0 },
  diagram: { type: Number, default: 0 },
  presentation: { type: Number, default: 0 }
}, { _id: false });

const diagramStatsSchema = new mongoose.Schema({
  total: { type: Number, default: 0 },
  withDiagram: { type: Number, default: 0 },
  avgDiagramMarks: { type: Number, default: 0 }
}, { _id: false });

const finalSummarySchema = new mongoose.Schema({
  overallScore: overallScoreSchema,
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  improvementPlan: [{ type: String }],
  diagramStats: diagramStatsSchema,
  upscRange: { type: String, default: 'Average' },
  sectionWisePerformance: sectionWisePerformanceSchema,
  metadata: {
    subject: { type: String, default: 'General Studies' },
    paper: { type: String, default: 'Unknown' },
    year: { type: Number, default: new Date().getFullYear() },
    totalQuestions: { type: Number, default: 0 },
    evaluationDate: { type: Date, default: Date.now }
  }
}, { _id: false });

const copyEvaluationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  pdfFileName: {
    type: String,
    required: true
  },
  pdfFileSize: {
    type: Number,
    required: true
  },
  subject: {
    type: String,
    default: 'General Studies'
  },
  paper: {
    type: String,
    default: 'Unknown'
  },
  year: {
    type: Number,
    default: new Date().getFullYear()
  },
  totalPages: {
    type: Number,
    default: 0
  },
  isScanned: {
    type: Boolean,
    default: false
  },
  evaluations: [questionEvaluationSchema],
  pageWiseSummary: [pageWiseSummarySchema],
  finalSummary: finalSummarySchema,
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  errorMessage: {
    type: String,
    default: null
  },
  // Temporary storage for extracted answers before AI evaluation
  extractedAnswers: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // Store PDF processing metadata
  pdfProcessingMetadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // Store raw extracted text for user preview
  rawText: {
    type: String,
    default: null
  },
  // OCR confidence score
  confidenceScore: {
    type: Number,
    default: 1.0
  }
}, {
  timestamps: true
});

// Indexes for faster queries
copyEvaluationSchema.index({ userId: 1, createdAt: -1 });
copyEvaluationSchema.index({ subject: 1, createdAt: -1 });
copyEvaluationSchema.index({ status: 1 });

// Virtual for overall score
copyEvaluationSchema.virtual('overallScore').get(function() {
  return this.finalSummary?.overallScore || null;
});

// Method to calculate statistics
copyEvaluationSchema.methods.calculateStats = function() {
  return {
    totalQuestions: this.evaluations.length,
    averageMarks: this.evaluations.reduce((sum, e) => sum + e.totalMarks, 0) / this.evaluations.length,
    highestMarks: Math.max(...this.evaluations.map(e => e.totalMarks)),
    lowestMarks: Math.min(...this.evaluations.map(e => e.totalMarks)),
    diagramUsage: this.evaluations.filter(e => e.diagramAnalysis.present).length,
    overallPercentage: this.finalSummary?.overallScore?.percentage || 0
  };
};

// Static method to get user's evaluation history
copyEvaluationSchema.statics.getUserHistory = async function(userId, limit = 10) {
  return this.find({ userId, status: 'completed' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('subject paper year finalSummary.overallScore createdAt pdfFileName');
};

// Static method to get analytics
copyEvaluationSchema.statics.getUserAnalytics = async function(userId) {
  const evaluations = await this.find({ userId, status: 'completed' });
  
  if (evaluations.length === 0) {
    return {
      totalEvaluations: 0,
      averageScore: 0,
      highestScore: 0,
      improvementTrend: 0,
      subjectWisePerformance: {}
    };
  }

  const scores = evaluations.map(e => e.finalSummary?.overallScore?.percentage || 0);
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  
  // Calculate improvement trend (last 3 vs first 3)
  const recentScores = scores.slice(0, 3);
  const oldScores = scores.slice(-3);
  const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const oldAvg = oldScores.reduce((a, b) => a + b, 0) / oldScores.length;
  
  // Subject-wise performance
  const subjectWisePerformance = {};
  evaluations.forEach(evaluation => {
    const subject = evaluation.subject || 'General Studies';
    if (!subjectWisePerformance[subject]) {
      subjectWisePerformance[subject] = {
        count: 0,
        totalScore: 0,
        avgScore: 0
      };
    }
    subjectWisePerformance[subject].count++;
    subjectWisePerformance[subject].totalScore += evaluation.finalSummary?.overallScore?.percentage || 0;
  });
  
  // Calculate averages
  Object.keys(subjectWisePerformance).forEach(subject => {
    const data = subjectWisePerformance[subject];
    data.avgScore = Math.round(data.totalScore / data.count);
  });

  return {
    totalEvaluations: evaluations.length,
    averageScore: Math.round(totalScore / evaluations.length),
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    improvementTrend: Math.round(recentAvg - oldAvg),
    subjectWisePerformance,
    recentEvaluations: evaluations.slice(0, 5).map(e => ({
      id: e._id,
      subject: e.subject,
      score: e.finalSummary?.overallScore?.percentage || 0,
      date: e.createdAt
    }))
  };
};

const CopyEvaluation = mongoose.model('CopyEvaluation', copyEvaluationSchema);

export default CopyEvaluation;
