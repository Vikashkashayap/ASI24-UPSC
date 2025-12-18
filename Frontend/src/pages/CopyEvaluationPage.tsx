import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Menu, X, Trash2, Award, TrendingUp, AlertCircle, Target, CheckCircle, XCircle, BookOpen } from 'lucide-react';
import { copyEvaluationAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useTheme } from '../hooks/useTheme';
import { useNavigate } from 'react-router-dom';

interface EvaluationHistory {
  _id: string;
  pdfFileName: string;
  subject: string;
  paper: string;
  year: number;
  finalSummary?: {
    overallScore: {
      obtained: number;
      maximum: number;
      percentage: number;
      grade: string;
    };
  };
  status: string;
  createdAt: string;
}

interface EvaluationResult {
  evaluationId: string;
  finalSummary: {
    overallScore: {
      obtained: number;
      maximum: number;
      percentage: number;
      grade: string;
    };
    strengths: string[];
    weaknesses: string[];
    improvementPlan: string[];
    upscRange: string;
    sectionWisePerformance: {
      introduction: number;
      body: number;
      conclusion: number;
      diagram: number;
      presentation: number;
    };
    diagramStats: {
      total: number;
      withDiagram: number;
      avgDiagramMarks: number;
    };
  };
  totalQuestions: number;
}

interface FullEvaluation {
  _id: string;
  subject: string;
  paper: string;
  year: number;
  pdfFileName: string;
  totalPages: number;
  evaluations: any[];
  finalSummary: any;
  createdAt: string;
}

const CopyEvaluationPage: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('General Studies');
  const [paper, setPaper] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [isUploading, setIsUploading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [fullEvaluation, setFullEvaluation] = useState<FullEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<EvaluationHistory[]>([]);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (selectedEvaluationId) {
      loadEvaluation(selectedEvaluationId);
    }
  }, [selectedEvaluationId]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await copyEvaluationAPI.getHistory(1, 50);
      if (response.data.success) {
        setHistory(response.data.data.evaluations);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadEvaluation = async (id: string) => {
    try {
      const response = await copyEvaluationAPI.getEvaluationById(id);
      if (response.data.success) {
        setFullEvaluation(response.data.data);
        setEvaluationResult({
          evaluationId: response.data.data._id,
          finalSummary: response.data.data.finalSummary,
          totalQuestions: response.data.data.evaluations.length,
        });
        setError(null);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load evaluation');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError(null);
    setEvaluationResult(null);
    setFullEvaluation(null);

    try {
      const response = await copyEvaluationAPI.uploadAndEvaluate(selectedFile, {
        subject,
        paper,
        year,
      });

      if (response.data.success) {
        setEvaluationResult(response.data.data);
        setSelectedEvaluationId(response.data.data.evaluationId);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        await loadHistory(); // Reload history
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to evaluate copy');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const startNewEvaluation = () => {
    setSelectedFile(null);
    setEvaluationResult(null);
    setFullEvaluation(null);
    setSelectedEvaluationId(null);
    setError(null);
    setSubject('General Studies');
    setPaper('');
    setYear(new Date().getFullYear());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSidebarOpen(false);
  };

  const deleteEvaluation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this evaluation?')) return;
    
    try {
      await copyEvaluationAPI.deleteEvaluation(id);
      if (selectedEvaluationId === id) {
        startNewEvaluation();
      }
      await loadHistory();
    } catch (error) {
      console.error('Failed to delete evaluation:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-8">
      <div className="flex flex-col gap-1 md:gap-2">
        <h1 className={`text-xl md:text-2xl font-semibold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>Copy Evaluation</h1>
        <p className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Upload your UPSC answer copy PDF for AI-powered evaluation with examiner-style feedback</p>
      </div>
      <div className="flex gap-0 md:gap-4 h-[calc(100vh-12rem)] md:h-[calc(100vh-14rem)] relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Evaluation History */}
      <div className={`w-64 md:w-64 flex-shrink-0 fixed md:relative inset-y-0 left-0 z-50 transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0`}>
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm">Evaluation History</CardTitle>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-1 hover:bg-slate-800 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <Button
              onClick={startNewEvaluation}
              className="w-full mt-2"
              variant="outline"
              size="sm"
            >
              + New Evaluation
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2 px-3">
            {loadingHistory ? (
              <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Loading...</p>
            ) : history.length === 0 ? (
              <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>No evaluations yet</p>
            ) : (
              history.map((evaluation) => (
                <div
                  key={evaluation._id}
                  onClick={() => {
                    setSelectedEvaluationId(evaluation._id);
                    setSidebarOpen(false);
                  }}
                  className={`group relative cursor-pointer rounded-lg p-2 text-xs transition-colors ${
                    theme === "dark"
                      ? `hover:bg-slate-800 ${
                          selectedEvaluationId === evaluation._id
                            ? "bg-slate-800 border border-purple-500/30"
                            : "border border-slate-700"
                        }`
                      : `hover:bg-slate-100 ${
                          selectedEvaluationId === evaluation._id
                            ? "bg-purple-50 border border-purple-300"
                            : "border border-slate-200"
                        }`
                  }`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <FileText className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className={`truncate font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                        {evaluation.pdfFileName}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${theme === "dark" ? "text-slate-500" : "text-slate-500"}`}>
                        {evaluation.subject} • {formatDate(evaluation.createdAt)}
                      </div>
                      {evaluation.finalSummary?.overallScore && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-[10px] font-semibold ${
                            evaluation.finalSummary.overallScore.percentage >= 70 ? 'text-green-600' :
                            evaluation.finalSummary.overallScore.percentage >= 50 ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {evaluation.finalSummary.overallScore.percentage}%
                          </span>
                          <span className={`text-[10px] ${theme === "dark" ? "text-slate-500" : "text-slate-500"}`}>
                            • Grade {evaluation.finalSummary.overallScore.grade}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteEvaluation(evaluation._id, e)}
                    className={`absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                      theme === "dark" ? "text-red-400 hover:text-red-300" : "text-red-500 hover:text-red-600"
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full overflow-hidden">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3 md:pb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className={`md:hidden p-2 rounded-lg ${
                  theme === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-100"
                }`}
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pr-1 md:pr-2">
            {!selectedEvaluationId || !evaluationResult ? (
              /* Upload Form */
              <div className="space-y-4 md:space-y-6">
                {/* File Upload */}
                <div className={`border-2 border-dashed rounded-xl p-6 md:p-8 text-center transition-colors ${
                  theme === "dark" 
                    ? "border-purple-500/30 hover:border-purple-500/50" 
                    : "border-purple-300 hover:border-purple-500"
                }`}>
                  <Upload className={`w-12 h-12 mx-auto mb-4 ${
                    theme === "dark" ? "text-purple-400" : "text-purple-600"
                  }`} />
                  <h3 className={`text-base md:text-lg font-semibold mb-2 ${
                    theme === "dark" ? "text-slate-200" : "text-slate-800"
                  }`}>
                    Upload Answer Copy (PDF)
                  </h3>
                  <p className={`text-sm md:text-base mb-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    {selectedFile ? selectedFile.name : 'Drag and drop or click to select'}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload">
                    <Button variant="outline" className="cursor-pointer" asChild>
                      <span>Select PDF</span>
                    </Button>
                  </label>
                  {selectedFile && (
                    <div className={`mt-4 text-sm font-medium ${
                      theme === "dark" ? "text-green-400" : "text-green-600"
                    }`}>
                      ✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <div>
                    <label className={`block text-xs md:text-sm font-medium mb-2 ${
                      theme === "dark" ? "text-slate-300" : "text-slate-700"
                    }`}>
                      Subject
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        theme === "dark"
                          ? "bg-slate-800 border-slate-700 text-slate-200"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      <option>General Studies</option>
                      <option>Essay</option>
                      <option>Optional Subject</option>
                    </select>
                  </div>

                <div>
                  <label className={`block text-xs md:text-sm font-medium mb-2 ${
                    theme === "dark" ? "text-slate-300" : "text-slate-700"
                  }`}>
                    Paper (Optional)
                  </label>
                    <input
                      type="text"
                      value={paper}
                      onChange={(e) => setPaper(e.target.value)}
                      placeholder="e.g., GS Paper 1"
                      className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        theme === "dark"
                          ? "bg-slate-800 border-slate-700 text-slate-200"
                          : "border-slate-300 bg-white"
                      }`}
                    />
                  </div>

                <div>
                  <label className={`block text-xs md:text-sm font-medium mb-2 ${
                    theme === "dark" ? "text-slate-300" : "text-slate-700"
                  }`}>
                    Year
                  </label>
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value))}
                      className={`w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        theme === "dark"
                          ? "bg-slate-800 border-slate-700 text-slate-200"
                          : "border-slate-300 bg-white"
                      }`}
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className={`border rounded-lg p-4 flex items-start gap-3 ${
                    theme === "dark"
                      ? "bg-red-950/50 border-red-800"
                      : "bg-red-50 border-red-200"
                  }`}>
                    <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      theme === "dark" ? "text-red-400" : "text-red-600"
                    }`} />
                    <p className={theme === "dark" ? "text-red-300" : "text-red-800"}>{error}</p>
                  </div>
                )}

                {/* Upload Button */}
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-4 md:py-6 text-sm md:text-base shadow-lg"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Evaluating... This may take 1-2 minutes
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2" />
                      Start Evaluation
                    </>
                  )}
                </Button>
              </div>
            ) : (
              /* Results Display */
              <div className="space-y-6">
                {/* Overall Score Card */}
                <Card className={`p-6 md:p-8 shadow-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white`}>
                  <div className="text-center">
                    <Award className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 opacity-90" />
                    <h2 className="text-xl md:text-2xl font-semibold mb-2">Overall Score</h2>
                    <div className="text-4xl md:text-5xl font-semibold mb-2">
                      {evaluationResult.finalSummary.overallScore.obtained.toFixed(1)}
                      <span className="text-2xl md:text-3xl opacity-75">
                        /{evaluationResult.finalSummary.overallScore.maximum}
                      </span>
                    </div>
                    <div className="text-base md:text-lg mb-2">
                      {evaluationResult.finalSummary.overallScore.percentage}% | Grade {evaluationResult.finalSummary.overallScore.grade}
                    </div>
                    <div className="inline-block bg-white/20 backdrop-blur-sm px-4 md:px-6 py-1.5 md:py-2 rounded-full text-sm md:text-base font-semibold">
                      {evaluationResult.finalSummary.upscRange}
                    </div>
                  </div>
                </Card>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <Button
                    onClick={() => navigate(`/copy-evaluation/${selectedEvaluationId}`)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-4 md:py-6 text-sm md:text-base"
                  >
                    View Detailed Analysis
                  </Button>
                  <Button
                    onClick={startNewEvaluation}
                    variant="outline"
                    className="flex-1 py-4 md:py-6 text-sm md:text-base font-semibold"
                  >
                    Evaluate Another Copy
                  </Button>
                </div>

                {/* Section-wise Performance */}
                <Card className="p-4 md:p-6 shadow-lg">
                  <h3 className={`text-sm md:text-base font-semibold mb-3 md:mb-4 flex items-center gap-2 ${
                    theme === "dark" ? "text-slate-200" : "text-slate-800"
                  }`}>
                    <Target className={`w-4 h-4 md:w-5 md:h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
                    Section-wise Performance
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                    {Object.entries(evaluationResult.finalSummary.sectionWisePerformance).map(([key, value]) => (
                      <div key={key} className={`p-3 md:p-4 rounded-lg ${
                        theme === "dark" ? "bg-slate-800" : "bg-gradient-to-br from-slate-50 to-slate-100"
                      }`}>
                        <div className={`text-xs md:text-sm capitalize mb-1 ${
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`}>{key}</div>
                        <div className={`text-xl md:text-2xl font-semibold ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}>
                          {(value as number).toFixed(1)}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Diagram Stats */}
                <Card className="p-4 md:p-6 shadow-lg">
                  <h3 className={`text-sm md:text-base font-semibold mb-3 md:mb-4 flex items-center gap-2 ${
                    theme === "dark" ? "text-slate-200" : "text-slate-800"
                  }`}>
                    <BookOpen className={`w-4 h-4 md:w-5 md:h-5 ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`} />
                    Diagram Usage Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className={`p-3 md:p-4 rounded-lg ${theme === "dark" ? "bg-indigo-950/50" : "bg-indigo-50"}`}>
                      <div className={`text-xs md:text-sm mb-1 ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`}>Diagrams Used</div>
                      <div className={`text-2xl md:text-3xl font-semibold ${theme === "dark" ? "text-indigo-300" : "text-indigo-700"}`}>
                        {evaluationResult.finalSummary.diagramStats.withDiagram}/{evaluationResult.finalSummary.diagramStats.total}
                      </div>
                    </div>
                    <div className={`p-3 md:p-4 rounded-lg ${theme === "dark" ? "bg-indigo-950/50" : "bg-indigo-50"}`}>
                      <div className={`text-xs md:text-sm mb-1 ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`}>Avg Diagram Marks</div>
                      <div className={`text-2xl md:text-3xl font-semibold ${theme === "dark" ? "text-indigo-300" : "text-indigo-700"}`}>
                        {evaluationResult.finalSummary.diagramStats.avgDiagramMarks.toFixed(1)}
                      </div>
                    </div>
                    <div className={`p-3 md:p-4 rounded-lg ${theme === "dark" ? "bg-indigo-950/50" : "bg-indigo-50"}`}>
                      <div className={`text-xs md:text-sm mb-1 ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`}>Total Questions</div>
                      <div className={`text-2xl md:text-3xl font-semibold ${theme === "dark" ? "text-indigo-300" : "text-indigo-700"}`}>
                        {evaluationResult.totalQuestions}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Strengths */}
                <Card className="p-4 md:p-6 shadow-lg">
                  <h3 className={`text-sm md:text-base font-semibold mb-3 md:mb-4 flex items-center gap-2 ${
                    theme === "dark" ? "text-green-300" : "text-green-800"
                  }`}>
                    <TrendingUp className={`w-4 h-4 md:w-5 md:h-5 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {evaluationResult.finalSummary.strengths.map((strength, idx) => (
                      <li key={idx} className={`flex items-start gap-2 md:gap-3 text-xs md:text-sm ${
                        theme === "dark" ? "text-slate-300" : "text-slate-700"
                      }`}>
                        <span className={`font-semibold ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* Weaknesses */}
                <Card className="p-4 md:p-6 shadow-lg">
                  <h3 className={`text-sm md:text-base font-semibold mb-3 md:mb-4 flex items-center gap-2 ${
                    theme === "dark" ? "text-orange-300" : "text-orange-800"
                  }`}>
                    <AlertCircle className={`w-4 h-4 md:w-5 md:h-5 ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`} />
                    Areas to Improve
                  </h3>
                  <ul className="space-y-2">
                    {evaluationResult.finalSummary.weaknesses.map((weakness, idx) => (
                      <li key={idx} className={`flex items-start gap-2 md:gap-3 text-xs md:text-sm ${
                        theme === "dark" ? "text-slate-300" : "text-slate-700"
                      }`}>
                        <span className={`font-semibold ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`}>•</span>
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* Improvement Plan */}
                <Card className="p-4 md:p-6 shadow-lg">
                  <h3 className={`text-sm md:text-base font-semibold mb-3 md:mb-4 flex items-center gap-2 ${
                    theme === "dark" ? "text-purple-300" : "text-purple-800"
                  }`}>
                    <Target className={`w-4 h-4 md:w-5 md:h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
                    Actionable Improvement Plan
                  </h3>
                  <ol className="space-y-2 md:space-y-3">
                    {evaluationResult.finalSummary.improvementPlan.map((plan, idx) => (
                      <li key={idx} className={`flex items-start gap-2 md:gap-3 text-xs md:text-sm ${
                        theme === "dark" ? "text-slate-300" : "text-slate-700"
                      }`}>
                        <span className={`flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] md:text-xs font-semibold ${
                          theme === "dark" 
                            ? "bg-purple-600 text-white" 
                            : "bg-purple-600 text-white"
                        }`}>
                          {idx + 1}
                        </span>
                        <span>{plan}</span>
                      </li>
                    ))}
                  </ol>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
};

export default CopyEvaluationPage;
