import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, X, ChevronLeft, ChevronRight, Sparkles, BookOpen, Award } from 'lucide-react';
import { copyEvaluationAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useTheme } from '../hooks/useTheme';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QuestionEvaluationView } from '../components/QuestionEvaluationView';


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
  const [searchParams] = useSearchParams();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('General Studies');
  const [paper, setPaper] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [isUploading, setIsUploading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [fullEvaluation, setFullEvaluation] = useState<FullEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  const [streamingModalOpen, setStreamingModalOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load evaluation from URL parameter
  useEffect(() => {
    const evaluationId = searchParams.get('id');
    if (evaluationId) {
      setSelectedEvaluationId(evaluationId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedEvaluationId) {
      loadEvaluation(selectedEvaluationId);
    }
  }, [selectedEvaluationId]);


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
        setSelectedQuestionIndex(0); // Reset to first question
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
      // Step 1: Upload PDF and get evaluationId
      const uploadResponse = await copyEvaluationAPI.uploadAndEvaluate(selectedFile, {
        subject,
        paper,
        year,
      });

      if (!uploadResponse.data.success) {
        throw new Error(uploadResponse.data.message || 'Upload failed');
      }

      const evaluationId = uploadResponse.data.data.evaluationId;
      const rawText = uploadResponse.data.data.rawText;
      const confidenceScore = uploadResponse.data.data.confidenceScore;
      
      console.log('✅ PDF uploaded successfully. Evaluation ID:', evaluationId);
      console.log('📊 Confidence Score:', confidenceScore);

      // Step 2: Check confidence score
      if (confidenceScore < 0.7) {
        const shouldContinue = window.confirm(
          `Low text extraction confidence (${(confidenceScore * 100).toFixed(1)}%). ` +
          `The PDF may be scanned or have poor text quality. Continue with evaluation?`
        );
        if (!shouldContinue) {
          setIsUploading(false);
          return;
        }
      }


      // Step 4: Trigger AI evaluation
      console.log('🤖 Starting AI evaluation...');
      const processResponse = await copyEvaluationAPI.processEvaluation(evaluationId);

      if (processResponse.data.success) {
        setEvaluationResult(processResponse.data.data);
        setSelectedEvaluationId(evaluationId);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Dispatch event to refresh sidebar history
        window.dispatchEvent(new Event('evaluation-complete'));
        console.log('✅ AI evaluation completed successfully');
      } else {
        throw new Error(processResponse.data.message || 'AI evaluation failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to evaluate copy');
      console.error('Upload/Evaluation error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const startNewEvaluation = () => {
    setSelectedFile(null);
    setEvaluationResult(null);
    setFullEvaluation(null);
    setSelectedEvaluationId(null);
    setSelectedQuestionIndex(0);
    setError(null);
    setSubject('General Studies');
    setPaper('');
    setYear(new Date().getFullYear());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Clear URL parameter
    navigate('/copy-evaluation', { replace: true });
  };


  // Render tabs component


  return (
    <div className="max-w-7xl mx-auto space-y-4 xs:space-y-4 sm:space-y-5 md:space-y-6 pb-8 px-2 xs:px-3 sm:px-4">
      {/* Enhanced Header */}
      <div className={`relative overflow-hidden rounded-2xl p-4 xs:p-5 sm:p-6 md:p-8 mb-6 border-2 transition-all duration-300 ${
        theme === "dark" 
          ? "bg-gradient-to-br from-slate-800/90 via-purple-900/20 to-slate-900/90 border-purple-500/20 shadow-xl shadow-purple-500/10" 
          : "bg-gradient-to-br from-white via-purple-50/30 to-white border-purple-200/50 shadow-xl shadow-purple-100/30"
      }`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col gap-2 xs:gap-2.5 sm:gap-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 xs:gap-3.5 sm:gap-4">
              <div className={`p-2.5 xs:p-3 sm:p-3 rounded-xl ${
                theme === "dark" ? "bg-purple-500/20" : "bg-purple-100"
              }`}>
                <FileText className={`w-5 h-5 xs:w-6 xs:h-6 sm:w-6 sm:h-6 ${
                  theme === "dark" ? "text-purple-400" : "text-purple-600"
                }`} />
              </div>
              <div>
                <h1 className={`text-xl xs:text-2xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r ${
                  theme === "dark" 
                    ? "from-purple-200 via-purple-300 to-purple-400 bg-clip-text text-transparent" 
                    : "from-purple-600 via-purple-700 to-purple-800 bg-clip-text text-transparent"
                }`}>
                  Copy Evaluation
                </h1>
                <p className={`text-[10px] xs:text-xs sm:text-xs md:text-sm mt-0.5 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  Upload your UPSC answer copy PDF for AI-powered evaluation with examiner-style feedback
                </p>
              </div>
            </div>
            {!selectedEvaluationId && !evaluationResult && (
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-gradient-to-r from-fuchsia-500 to-emerald-400 hover:from-fuchsia-400 hover:to-emerald-300 text-white shadow-lg hover:shadow-xl transition-all"
              >
                <Upload className="w-4 h-4 mr-2" />
                <span className="hidden xs:inline">Upload New Answer</span>
                <span className="xs:hidden">Upload</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      

      {/* Main Content - Full width in Full Copy Evaluation mode */}
      <div className="h-[calc(100vh-10rem)] xs:h-[calc(100vh-11rem)] sm:h-[calc(100vh-12rem)] md:h-[calc(100vh-14rem)]">
        {/* Main Content Area */}
        <div className="w-full h-full overflow-hidden">
          {!selectedEvaluationId || !evaluationResult ? (
            <Card className={`h-full ${theme === "dark" ? "bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 border-purple-900/50" : "bg-white border-slate-200"} shadow-xl`}>
              <CardContent className="p-6 xs:p-8 text-center flex items-center justify-center h-full">
                <div className="max-w-md">
                  <div className={`p-4 xs:p-5 sm:p-6 rounded-full mx-auto mb-4 xs:mb-5 sm:mb-6 w-fit ${
                    theme === "dark" ? "bg-fuchsia-500/10" : "bg-purple-100"
                  }`}>
                    <FileText className={`w-8 h-8 xs:w-12 xs:h-12 sm:w-16 sm:h-16 mx-auto ${
                      theme === "dark" ? "text-fuchsia-400" : "text-purple-600"
                    }`} />
                  </div>
                  <h2 className={`text-lg xs:text-xl sm:text-xl md:text-2xl font-bold mb-2 xs:mb-3 ${
                    theme === "dark" ? "text-slate-200" : "text-slate-800"
                  }`}>
                    No Answer Copy Evaluated Yet
                  </h2>
                  <p className={`text-xs xs:text-sm sm:text-sm mb-6 xs:mb-7 sm:mb-8 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>
                    Upload your full answer copy PDF to get comprehensive evaluation with examiner-style feedback
                  </p>
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-gradient-to-r from-fuchsia-500 to-emerald-400 hover:from-fuchsia-400 hover:to-emerald-300 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New Answer Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className={`h-full flex flex-col shadow-xl ${
              theme === "dark" 
                ? "bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 border-purple-900/50" 
                : "bg-white border-slate-200"
            }`}>
              <CardHeader className="pb-3 xs:pb-3.5 sm:pb-4 border-b flex-shrink-0">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2 xs:gap-2.5">
                    <Award className={`w-5 h-5 xs:w-6 xs:h-6 ${
                      theme === "dark" ? "text-fuchsia-300" : "text-purple-600"
                    }`} />
                    <h2 className={`text-lg xs:text-xl sm:text-xl font-bold ${
                      theme === "dark" ? "text-slate-200" : "text-slate-800"
                    }`}>
                      Your Answer Evaluation
                    </h2>
                  </div>
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    variant="outline"
                    className="text-xs xs:text-sm"
                  >
                    <Upload className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1.5" />
                    <span className="hidden xs:inline">Upload New Answer</span>
                    <span className="xs:hidden">New</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto pr-1 xs:pr-1.5 sm:pr-2 custom-scrollbar">
                {/* Results Display - Question by Question */}
                {fullEvaluation && fullEvaluation.evaluations && fullEvaluation.evaluations.length > 0 ? (
                  <div className="space-y-4 xs:space-y-5 sm:space-y-6">
                    {/* Enhanced Question Navigation */}
                    <div className={`flex items-center justify-between p-3 xs:p-3.5 sm:p-4 rounded-xl ${
                      theme === "dark" ? "bg-slate-800/50 border border-slate-700/50" : "bg-slate-50 border border-slate-200"
                    }`}>
                      <div className="flex items-center gap-2 xs:gap-2.5">
                        <BookOpen className={`w-4 h-4 xs:w-5 xs:h-5 ${
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`} />
                        <span className={`text-xs xs:text-sm font-medium ${
                          theme === "dark" ? "text-slate-300" : "text-slate-700"
                        }`}>
                          Question {selectedQuestionIndex + 1} of {fullEvaluation.evaluations.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 xs:gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 xs:h-9 w-8 xs:w-9 p-0"
                          onClick={() => setSelectedQuestionIndex(Math.max(0, selectedQuestionIndex - 1))}
                          disabled={selectedQuestionIndex === 0}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 xs:h-9 w-8 xs:w-9 p-0"
                          onClick={() => setSelectedQuestionIndex(Math.min(fullEvaluation.evaluations.length - 1, selectedQuestionIndex + 1))}
                          disabled={selectedQuestionIndex === fullEvaluation.evaluations.length - 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Question Evaluation View */}
                    <QuestionEvaluationView 
                      question={fullEvaluation.evaluations[selectedQuestionIndex]} 
                      paper={fullEvaluation.paper || 'GS'}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>No evaluation data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Enhanced Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 xs:p-4">
          <Card className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl ${
            theme === "dark" 
              ? "bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/95 border-purple-900/50" 
              : "bg-white border-slate-200"
          }`}>
            <CardContent className="p-4 xs:p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4 xs:mb-5 sm:mb-6">
                <div className="flex items-center gap-2 xs:gap-2.5">
                  <div className={`p-2 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-emerald-400/20 border ${
                    theme === "dark" ? "border-fuchsia-500/30" : "border-purple-300/50"
                  }`}>
                    <Upload className={`w-4 h-4 xs:w-5 xs:h-5 ${
                      theme === "dark" ? "text-fuchsia-300" : "text-fuchsia-600"
                    }`} />
                  </div>
                  <h2 className={`text-lg xs:text-xl sm:text-xl font-bold ${
                    theme === "dark" ? "text-slate-200" : "text-slate-800"
                  }`}>
                    Upload Answer Copy
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setError(null);
                  }}
                  className={`p-1.5 xs:p-2 rounded-lg transition-colors ${
                    theme === "dark" 
                      ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" 
                      : "hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <X className="w-4 h-4 xs:w-5 xs:h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* File Upload */}
                <div>
                  <label className={`block font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                    Answer Copy (PDF)
                  </label>
                  {selectedFile ? (
                    <div className={`p-3 xs:p-4 rounded-xl border flex items-center justify-between ${
                      theme === "dark" 
                        ? "bg-slate-800/80 border-slate-700/50" 
                        : "bg-slate-50 border-slate-200"
                    }`}>
                      <div className="flex items-center gap-2 xs:gap-3 flex-1 min-w-0">
                        <FileText className={`w-5 h-5 xs:w-6 xs:h-6 flex-shrink-0 ${
                          theme === "dark" ? "text-fuchsia-400" : "text-purple-600"
                        }`} />
                        <span className={`text-xs xs:text-sm truncate ${
                          theme === "dark" ? "text-slate-300" : "text-slate-700"
                        }`}>
                          {selectedFile.name}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className={`p-1.5 xs:p-2 rounded-lg transition-colors flex-shrink-0 ${
                          theme === "dark" 
                            ? "hover:bg-slate-700 text-slate-400 hover:text-slate-200" 
                            : "hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className={`border-2 border-dashed rounded-xl xs:rounded-2xl p-6 xs:p-8 text-center transition-colors ${
                      theme === "dark" 
                        ? "border-slate-700/50 bg-slate-800/30 hover:border-fuchsia-500/50" 
                        : "border-slate-300 bg-slate-50/50 hover:border-purple-400"
                    }`}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="pdf-upload-full"
                      />
                      <label htmlFor="pdf-upload-full" className="cursor-pointer block">
                        <div className={`p-4 xs:p-5 rounded-full mx-auto mb-3 xs:mb-4 w-fit ${
                          theme === "dark" ? "bg-fuchsia-500/10" : "bg-purple-100"
                        }`}>
                          <Upload className={`w-6 h-6 xs:w-8 xs:h-8 mx-auto ${
                            theme === "dark" ? "text-fuchsia-400" : "text-purple-600"
                          }`} />
                        </div>
                        <p className={`text-xs xs:text-sm font-medium mb-1 ${
                          theme === "dark" ? "text-slate-300" : "text-slate-700"
                        }`}>
                          Click to upload PDF or drag and drop
                        </p>
                        <p className={`text-[10px] xs:text-xs ${
                          theme === "dark" ? "text-slate-500" : "text-slate-500"
                        }`}>
                          Maximum file size: 10MB
                        </p>
                      </label>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={`block font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                      Subject
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === "dark"
                          ? "bg-slate-800 border-slate-700 text-slate-200"
                          : "bg-white border-slate-300"
                      }`}
                    >
                      <option>General Studies</option>
                      <option>Essay</option>
                      <option>Optional Subject</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                      Paper (Optional)
                    </label>
                    <input
                      type="text"
                      value={paper}
                      onChange={(e) => setPaper(e.target.value)}
                      placeholder="e.g., GS Paper 1"
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === "dark"
                          ? "bg-slate-800 border-slate-700 text-slate-200"
                          : "bg-white border-slate-300"
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                      Year
                    </label>
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value))}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === "dark"
                          ? "bg-slate-800 border-slate-700 text-slate-200"
                          : "bg-white border-slate-300"
                      }`}
                    />
                  </div>
                </div>

                {/* Enhanced Error Message */}
                {error && (
                  <div className={`p-3 xs:p-3.5 rounded-xl border flex items-start gap-2 xs:gap-2.5 ${
                    theme === "dark"
                      ? "bg-red-900/20 border-red-700/50 text-red-300"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}>
                    <X className="w-4 h-4 xs:w-5 xs:h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-xs xs:text-sm">{error}</p>
                  </div>
                )}

                {/* Enhanced Submit Button */}
                <Button
                  onClick={async () => {
                    await handleUpload();
                    if (!error && selectedFile) {
                      setShowUploadModal(false);
                    }
                  }}
                  disabled={!selectedFile || isUploading}
                  className="w-full bg-gradient-to-r from-fuchsia-500 to-emerald-400 hover:from-fuchsia-400 hover:to-emerald-300 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 xs:h-5 xs:w-5 border-b-2 border-white mr-2"></div>
                      <span className="text-xs xs:text-sm">Evaluating... This may take 1-2 minutes</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 xs:w-5 xs:h-5 mr-2" />
                      <span className="text-xs xs:text-sm font-medium">Start Evaluation</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
};

export default CopyEvaluationPage;
