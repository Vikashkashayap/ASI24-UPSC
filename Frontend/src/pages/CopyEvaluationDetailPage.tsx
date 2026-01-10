import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, TrendingUp, TrendingDown, Target, CheckCircle, XCircle, Layout, List } from 'lucide-react';
import { copyEvaluationAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useTheme } from '../hooks/useTheme';
import InlineFeedbackView from '../components/InlineFeedbackView';
import AnnotatedTextView from '../components/AnnotatedTextView';

interface QuestionEvaluation {
  questionNumber: string;
  questionText: string;
  answerText: string;
  annotatedText?: string;
  pageNumber: number;
  wordCount: number;
  wordLimit?: number;
  totalMarks: number;
  maxMarks: number;
  marksBreakdown: {
    introduction: number;
    body: number;
    conclusion: number;
    diagram: number;
    presentation: number;
  };
  scoringBreakdown?: {
    structure_score: number;
    content_score: number;
    analysis_score: number;
    language_score: number;
    value_addition_score: number;
    final_score: number;
  };
  mistakeSummary?: string[];
  examinerComment?: string;
  modelAnswer?: string;
  diagramSuggestions?: string;
  inlineFeedback: Array<{
    location: string;
    comment: string;
    severity: string;
  }>;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  diagramAnalysis: {
    present: boolean;
    relevant: boolean;
    marksAwarded: number;
    comment: string;
  };
  upscRange: string;
}

interface EvaluationData {
  _id: string;
  subject: string;
  paper: string;
  year: number;
  pdfFileName: string;
  totalPages: number;
  evaluations: QuestionEvaluation[];
  finalSummary: any;
  createdAt: string;
}

const CopyEvaluationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'detailed' | 'inline'>('inline');

  useEffect(() => {
    loadEvaluation();
  }, [id]);

  const loadEvaluation = async () => {
    try {
      const response = await copyEvaluationAPI.getEvaluationById(id!);
      if (response.data.success) {
        setEvaluation(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load evaluation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === "dark" ? "bg-slate-950" : "bg-slate-50"}`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${theme === "dark" ? "border-purple-600" : "border-purple-600"}`}></div>
          <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>Loading evaluation...</p>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === "dark" ? "bg-slate-950" : "bg-slate-50"}`}>
        <div className="text-center">
          <p className={`text-lg mb-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Evaluation not found</p>
          <Button onClick={() => navigate('/copy-evaluation')}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = evaluation.evaluations[selectedQuestion];
  const percentage = Math.round((currentQuestion.totalMarks / currentQuestion.maxMarks) * 100);

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-8 px-4 md:px-6">
      <div className="flex flex-col gap-1 md:gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/copy-evaluation')}
              className="gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className={`text-base md:text-xl font-semibold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>
                {evaluation.pdfFileName}
              </h1>
              <p className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                {evaluation.subject} • {evaluation.paper} • {evaluation.year}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xl md:text-2xl font-semibold ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}>
              {evaluation.finalSummary.overallScore.obtained.toFixed(1)}/{evaluation.finalSummary.overallScore.maximum}
            </div>
            <div className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              {evaluation.finalSummary.overallScore.percentage}% | Grade {evaluation.finalSummary.overallScore.grade}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Question Navigator */}
        <div className="lg:col-span-1">
          <Card className="p-3 md:p-4 sticky top-20 md:top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <h3 className={`text-sm md:text-base font-semibold mb-3 flex items-center gap-2 ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                <FileText className="w-4 h-4 md:w-5 md:h-5" />
                Questions ({evaluation.evaluations.length})
              </h3>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {evaluation.evaluations.map((q, idx) => {
                  const qPercentage = Math.round((q.totalMarks / q.maxMarks) * 100);
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedQuestion(idx)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedQuestion === idx
                          ? theme === "dark"
                            ? 'bg-purple-900/50 border-2 border-purple-600'
                            : 'bg-purple-100 border-2 border-purple-600'
                          : theme === "dark"
                          ? 'bg-slate-800/50 border border-slate-700 hover:bg-slate-700/50'
                          : 'bg-white border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold text-xs md:text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>Question {q.questionNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] md:text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>P{q.pageNumber}</span>
                        <span className={`text-[10px] md:text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>•</span>
                        <span className={`text-[10px] md:text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>C{q.questionNumber}</span>
                      </div>
                      <div className={`text-xs md:text-sm font-semibold mt-1 ${
                        qPercentage >= 70 ? 'text-green-600' :
                        qPercentage >= 50 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {q.totalMarks}/{q.maxMarks}
                      </div>
                    </button>
                  );
                })}
              </div>
          </Card>
        </div>

        {/* Question Details */}
        <div className="lg:col-span-3 space-y-4 md:space-y-6">
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'inline' ? 'default' : 'outline'}
                  onClick={() => setViewMode('inline')}
                  className="gap-2 text-sm"
                >
                  <Layout className="w-4 h-4" />
                  Text & Feedback View
                </Button>
                <Button
                  variant={viewMode === 'detailed' ? 'default' : 'outline'}
                  onClick={() => setViewMode('detailed')}
                  className="gap-2 text-sm"
                >
                  <List className="w-4 h-4" />
                  Detailed Analysis
                </Button>
              </div>
            </div>

            {viewMode === 'inline' ? (
              /* Annotated Text View (Three-Panel) */
              <AnnotatedTextView
                annotatedText={currentQuestion.annotatedText || currentQuestion.answerText}
                originalText={currentQuestion.answerText}
                questionNumber={currentQuestion.questionNumber}
                questionText={currentQuestion.questionText}
                wordCount={currentQuestion.wordCount}
                wordLimit={currentQuestion.wordLimit}
                mistakeSummary={currentQuestion.mistakeSummary}
                examinerComment={currentQuestion.examinerComment}
                scoringBreakdown={currentQuestion.scoringBreakdown}
                totalMarks={currentQuestion.totalMarks}
                maxMarks={currentQuestion.maxMarks}
              />
            ) : (
              /* Detailed View */
              <>
            {/* Score Card */}
            <Card className={`p-4 md:p-6 ${
              percentage >= 70 
                ? theme === "dark" 
                  ? 'bg-green-900/20 border-green-700' 
                  : 'bg-green-100 border-green-300'
              : percentage >= 50 
                ? theme === "dark"
                  ? 'bg-orange-900/20 border-orange-700'
                  : 'bg-orange-100 border-orange-300'
              : theme === "dark"
                ? 'bg-red-900/20 border-red-700'
                : 'bg-red-100 border-red-300'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <h2 className={`text-base md:text-lg font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-slate-800"}`}>
                    Question {currentQuestion.questionNumber}
                  </h2>
                  <p className={`text-xs md:text-sm mb-2 md:mb-3 ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                    {currentQuestion.questionText || `Question ${currentQuestion.questionNumber}`}
                  </p>
                  <div className={`flex flex-wrap gap-2 md:gap-3 text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    <span>Page {currentQuestion.pageNumber}</span>
                    <span>•</span>
                    <span>{currentQuestion.wordCount} words</span>
                    <span>•</span>
                    <span>{currentQuestion.upscRange}</span>
                  </div>
                </div>
                <div className="text-left sm:text-right sm:ml-4 md:ml-6">
                  <div className={`text-xl md:text-2xl font-semibold mb-1 ${
                    theme === "dark" ? "text-white" : "text-slate-900"
                  }`}>
                    {currentQuestion.totalMarks}
                  </div>
                  <div className={`text-sm md:text-base ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                    /{currentQuestion.maxMarks}
                  </div>
                  <div className={`text-xs md:text-sm font-semibold mt-1 ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                    {percentage}%
                  </div>
                </div>
              </div>
            </Card>

            {/* Marks Breakdown */}
            <Card className="p-4 md:p-6">
              <h3 className={`text-sm md:text-base font-semibold mb-3 md:mb-4 flex items-center gap-2 ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                <Target className={`w-4 h-4 md:w-5 md:h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
                Marks Breakdown
              </h3>
              <div className="grid grid-cols-5 gap-2 md:gap-3">
                {Object.entries(currentQuestion.marksBreakdown).map(([key, value]) => {
                  const shortKey = key === 'introduction' ? 'Intro' : 
                                  key === 'conclusion' ? 'Con' : 
                                  key === 'diagram' ? 'Diag' : 
                                  key.charAt(0).toUpperCase() + key.slice(1);
                  return (
                    <div key={key} className={`p-2 md:p-3 rounded-lg text-center ${theme === "dark" ? "bg-slate-800/50" : "bg-slate-50"}`}>
                      <div className={`text-[10px] md:text-xs font-medium mb-1 md:mb-2 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>{shortKey}</div>
                      <div className={`text-base md:text-lg font-semibold px-2 md:px-3 py-1 md:py-2 rounded ${theme === "dark" ? "bg-purple-900/30 text-purple-300" : "bg-purple-100 text-purple-700"}`}>
                        {value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Inline Feedback */}
            <Card className="p-4 md:p-6">
              <h3 className={`text-sm md:text-base font-semibold mb-3 md:mb-4 ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>Examiner Feedback</h3>
              <div className="space-y-3">
                {currentQuestion.inlineFeedback.map((feedback, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-l-4 ${
                      feedback.severity === 'positive'
                        ? theme === "dark"
                          ? 'bg-green-950/30 border-green-600'
                          : 'bg-green-50 border-green-600'
                        : feedback.severity === 'critical'
                        ? theme === "dark"
                          ? 'bg-red-950/30 border-red-600'
                          : 'bg-red-50 border-red-600'
                        : theme === "dark"
                        ? 'bg-blue-950/30 border-blue-600'
                        : 'bg-blue-50 border-blue-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {feedback.severity === 'positive' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : feedback.severity === 'critical' ? (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className={`text-xs font-semibold uppercase mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                          {feedback.location}
                        </div>
                        <p className={theme === "dark" ? "text-slate-200" : "text-slate-800"}>{feedback.comment}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Diagram Analysis */}
            {currentQuestion.diagramAnalysis && (
              <Card className="p-4 md:p-6">
                <h3 className={`text-sm md:text-base font-semibold mb-3 md:mb-4 ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>Diagram Analysis</h3>
                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-purple-950/30" : "bg-purple-50"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                      Diagram Present: {currentQuestion.diagramAnalysis.present ? 'Yes' : 'No'}
                    </span>
                    <span className={`text-xl font-bold ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}>
                      {currentQuestion.diagramAnalysis.marksAwarded} marks
                    </span>
                  </div>
                  <p className={theme === "dark" ? "text-slate-300" : "text-slate-700"}>{currentQuestion.diagramAnalysis.comment}</p>
                </div>
              </Card>
            )}

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              <Card className="p-4 md:p-6">
                <h3 className={`text-sm md:text-base font-semibold mb-3 md:mb-4 flex items-center gap-2 ${theme === "dark" ? "text-green-300" : "text-green-800"}`}>
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
                  Strengths
                </h3>
                <ul className="space-y-2">
                  {currentQuestion.strengths.map((strength, idx) => (
                    <li key={idx} className={`flex items-start gap-2 text-xs md:text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                      <span className="text-green-600 font-bold">✓</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-4 md:p-6">
                <h3 className={`text-sm md:text-base font-semibold mb-3 md:mb-4 flex items-center gap-2 ${theme === "dark" ? "text-orange-300" : "text-orange-800"}`}>
                  <TrendingDown className="w-4 h-4 md:w-5 md:h-5" />
                  Weaknesses
                </h3>
                <ul className="space-y-2">
                  {currentQuestion.weaknesses.map((weakness, idx) => (
                    <li key={idx} className={`flex items-start gap-2 text-xs md:text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                      <span className="text-orange-600 font-bold">•</span>
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Improvements */}
            <Card className="p-4 md:p-6">
              <h3 className={`text-sm md:text-base font-semibold mb-3 md:mb-4 ${theme === "dark" ? "text-purple-300" : "text-purple-800"}`}>How to Improve This Answer</h3>
              <ol className="space-y-2">
                {currentQuestion.improvements.map((improvement, idx) => (
                  <li key={idx} className={`flex items-start gap-2 md:gap-3 text-xs md:text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                    <span className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] md:text-xs font-semibold">
                      {idx + 1}
                    </span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ol>
            </Card>

            {/* Model Answer */}
            {currentQuestion.modelAnswer && (
              <Card className="p-4 md:p-6">
                <h3 className={`text-sm md:text-base font-semibold mb-3 md:mb-4 flex items-center gap-2 ${theme === "dark" ? "text-indigo-300" : "text-indigo-800"}`}>
                  <FileText className="w-4 h-4 md:w-5 md:h-5" />
                  Model Answer (UPSC-Ready)
                </h3>
                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-indigo-950/30" : "bg-indigo-50"}`}>
                  <p className={`text-xs md:text-sm whitespace-pre-wrap leading-relaxed ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                    {currentQuestion.modelAnswer}
                  </p>
                </div>
              </Card>
            )}

            {/* Diagram Suggestions */}
            {currentQuestion.diagramSuggestions && (
              <Card className="p-4 md:p-6">
                <h3 className={`text-sm md:text-base font-semibold mb-3 md:mb-4 ${theme === "dark" ? "text-cyan-300" : "text-cyan-800"}`}>
                  Diagram Suggestions
                </h3>
                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-cyan-950/30" : "bg-cyan-50"}`}>
                  <p className={`text-xs md:text-sm whitespace-pre-wrap ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                    {currentQuestion.diagramSuggestions}
                  </p>
                </div>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <Button
                variant="outline"
                onClick={() => setSelectedQuestion(Math.max(0, selectedQuestion - 1))}
                disabled={selectedQuestion === 0}
                className="flex-1"
              >
                ← Previous Question
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedQuestion(Math.min(evaluation.evaluations.length - 1, selectedQuestion + 1))}
                disabled={selectedQuestion === evaluation.evaluations.length - 1}
                className="flex-1"
              >
                Next Question →
              </Button>
            </div>
              </>
            )}
        </div>
      </div>
    </div>
  );
};

export default CopyEvaluationDetailPage;
