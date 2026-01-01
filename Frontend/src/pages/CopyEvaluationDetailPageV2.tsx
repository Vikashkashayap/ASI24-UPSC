import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, TrendingUp, TrendingDown, Target, CheckCircle, XCircle, Info, ArrowRight } from 'lucide-react';
import { copyEvaluationAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useTheme } from '../hooks/useTheme';

interface QuestionEvaluation {
  questionNumber: string;
  questionText: string;
  answerText: string;
  pageNumber: number;
  totalMarks: number;
  maxMarks: number;
  marksBreakdown: {
    introduction: number;
    body: number;
    conclusion: number;
    diagram: number;
    presentation: number;
  };
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
  finalSummary: {
    overallScore: {
      obtained: number;
      maximum: number;
      percentage: number;
    };
  };
  createdAt: string;
}

const CopyEvaluationDetailPageV2: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<number>(0);

  useEffect(() => {
    loadEvaluation();
  }, [id]);

  const loadEvaluation = async () => {
    try {
      const response = await copyEvaluationAPI.getEvaluationById(id!);
      if (response.data.success) {
        const data = response.data.data;
        setEvaluation(data);
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

  if (!evaluation || !evaluation.evaluations || evaluation.evaluations.length === 0) {
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

  const currentEvaluation = evaluation.evaluations[selectedQuestion];
  const score = currentEvaluation.totalMarks || 0;
  const maxMarks = currentEvaluation.maxMarks || 250;
  const percentage = Math.round((score / maxMarks) * 100);

  return (
    <div className={`max-w-7xl mx-auto space-y-4 md:space-y-6 pb-8 px-4 md:px-6 ${theme === "dark" ? "bg-slate-950" : "bg-slate-50"}`}>
      <div className="flex flex-col gap-1 md:gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/copy-evaluation')}
              className="gap-2"
              size="sm"
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

      {/* Question Navigator */}
      {evaluation.evaluations.length > 1 && (
        <Card className="p-3 md:p-4">
          <h3 className={`text-sm md:text-base font-semibold mb-3 flex items-center gap-2 ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
            <FileText className="w-4 h-4 md:w-5 md:h-5" />
            Questions ({evaluation.evaluations.length})
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {evaluation.evaluations.map((q, idx) => {
              const qPercentage = Math.round((q.totalMarks / q.maxMarks) * 100);
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedQuestion(idx)}
                  className={`flex-shrink-0 p-3 rounded-lg transition-all ${
                    selectedQuestion === idx
                      ? theme === "dark"
                        ? 'bg-purple-900/50 border-2 border-purple-600'
                        : 'bg-purple-100 border-2 border-purple-600'
                      : theme === "dark"
                        ? 'bg-slate-800/50 border border-slate-700 hover:bg-slate-700/50'
                        : 'bg-white border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-center">
                    <div className={`font-semibold text-xs md:text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                      Q{q.questionNumber}
                    </div>
                    <div className={`text-xs font-semibold mt-1 ${
                      qPercentage >= 70 ? 'text-green-600' :
                      qPercentage >= 50 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {q.totalMarks}/{q.maxMarks}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Question and Answer Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Left: Question and Answer */}
        <div className="space-y-4 md:space-y-6">
          {/* Question Card */}
          <Card>
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <FileText className={`w-4 h-4 md:w-5 md:h-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                Question {currentEvaluation.questionNumber}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Your answer scored {score}/{maxMarks} marks ({percentage}%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg border ${
                percentage >= 70
                  ? theme === "dark" ? 'bg-green-950/30 border-green-700' : 'bg-green-50 border-green-300'
                : percentage >= 50
                  ? theme === "dark" ? 'bg-orange-950/30 border-orange-700' : 'bg-orange-50 border-orange-300'
                : theme === "dark" ? 'bg-red-950/30 border-red-700' : 'bg-red-50 border-red-300'
              }`}>
                <p className={`text-sm md:text-base leading-relaxed ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                  {currentEvaluation.questionText || `Question ${currentEvaluation.questionNumber}`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Answer Card */}
          <Card>
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <ArrowRight className={`w-4 h-4 md:w-5 md:h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
                Your Answer
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {currentEvaluation.wordCount} words • {currentEvaluation.upscRange}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg border bg-white ${
                theme === "dark" ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <p className={`text-sm md:text-base leading-relaxed whitespace-pre-line ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                  {currentEvaluation.answerText}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Feedback */}
        <div className="space-y-4 md:space-y-6">
          {/* Score Card */}
          <Card>
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-sm md:text-base">Score Breakdown</CardTitle>
              <CardDescription className="text-xs md:text-sm">Detailed marking analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-4">
                <div className={`text-2xl md:text-3xl font-semibold ${
                  percentage >= 70 ? "text-green-600" :
                  percentage >= 50 ? "text-orange-600" : "text-red-600"
                }`}>
                  {score}
                </div>
                <div className={`text-sm md:text-base ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  /{maxMarks} marks
                </div>
              </div>

              {/* Marks Breakdown */}
              <div className="grid grid-cols-5 gap-2 md:gap-3 mb-4">
                {Object.entries(currentEvaluation.marksBreakdown || {}).map(([key, value]) => {
                  const shortKey = key === 'introduction' ? 'Intro' :
                                  key === 'conclusion' ? 'Con' :
                                  key === 'diagram' ? 'Diag' :
                                  key.charAt(0).toUpperCase() + key.slice(1);
                  return (
                    <div key={key} className={`p-2 md:p-3 rounded-lg text-center ${theme === "dark" ? "bg-slate-800/50" : "bg-slate-50"}`}>
                      <div className={`text-[10px] md:text-xs font-medium mb-1 md:mb-2 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                        {shortKey}
                      </div>
                      <div className={`text-base md:text-lg font-semibold px-2 md:px-3 py-1 md:py-2 rounded ${
                        theme === "dark" ? "bg-purple-900/30 text-purple-300" : "bg-purple-100 text-purple-700"
                      }`}>
                        {value || 0}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Examiner Feedback */}
          {currentEvaluation.inlineFeedback && currentEvaluation.inlineFeedback.length > 0 && (
            <Card>
              <CardHeader className="pb-2 md:pb-3">
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
                  <Info className={`w-4 h-4 md:w-5 md:h-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                  Examiner Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentEvaluation.inlineFeedback.map((feedback, idx) => (
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
                        <div className={`text-xs font-semibold uppercase mb-1 ${
                          feedback.severity === 'positive' ? "text-green-600" :
                          feedback.severity === 'critical' ? "text-red-600" : "text-blue-600"
                        }`}>
                          {feedback.location}
                        </div>
                        <p className={theme === "dark" ? "text-slate-200" : "text-slate-800"}>
                          {feedback.comment}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid md:grid-cols-1 gap-4">
            {currentEvaluation.strengths && currentEvaluation.strengths.length > 0 && (
              <Card>
                <CardHeader className="pb-2 md:pb-3">
                  <CardTitle className="text-sm md:text-base flex items-center gap-2">
                    <TrendingUp className={`w-4 h-4 md:w-5 md:h-5 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {currentEvaluation.strengths.map((strength, idx) => (
                      <li key={idx} className={`flex items-start gap-2 text-xs md:text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                        <span className="text-green-600 font-bold">✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {currentEvaluation.weaknesses && currentEvaluation.weaknesses.length > 0 && (
              <Card>
                <CardHeader className="pb-2 md:pb-3">
                  <CardTitle className="text-sm md:text-base flex items-center gap-2">
                    <TrendingDown className={`w-4 h-4 md:w-5 md:h-5 ${theme === "dark" ? "text-red-400" : "text-red-600"}`} />
                    Weaknesses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {currentEvaluation.weaknesses.map((weakness, idx) => (
                      <li key={idx} className={`flex items-start gap-2 text-xs md:text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                        <span className="text-red-600 font-bold">•</span>
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Improvements */}
          {currentEvaluation.improvements && currentEvaluation.improvements.length > 0 && (
            <Card>
              <CardHeader className="pb-2 md:pb-3">
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
                  <Target className={`w-4 h-4 md:w-5 md:h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
                  How to Improve
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {currentEvaluation.improvements.map((improvement, idx) => (
                    <li key={idx} className={`flex items-start gap-2 md:gap-3 text-xs md:text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                      <span className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] md:text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Diagram Analysis */}
          {currentEvaluation.diagramAnalysis && (
            <Card>
              <CardHeader className="pb-2 md:pb-3">
                <CardTitle className="text-sm md:text-base">Diagram Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-purple-950/30" : "bg-purple-50"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                      Diagram Present: {currentEvaluation.diagramAnalysis.present ? 'Yes' : 'No'}
                    </span>
                    <span className={`text-xl font-bold ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}>
                      {currentEvaluation.diagramAnalysis.marksAwarded} marks
                    </span>
                  </div>
                  <p className={theme === "dark" ? "text-slate-300" : "text-slate-700"}>
                    {currentEvaluation.diagramAnalysis.comment}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Navigation */}
      {evaluation.evaluations.length > 1 && (
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
      )}
    </div>
  );
};

export default CopyEvaluationDetailPageV2;

