import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { copyEvaluationAPI, singleQuestionEvaluationAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useTheme } from '../hooks/useTheme';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SingleQuestionEvaluationPage from './SingleQuestionEvaluationPage';
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
  const [evaluationMode, setEvaluationMode] = useState<'full' | 'single'>('single'); // Default to single question
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
      setEvaluationMode('full'); // Switch to full mode when loading from history
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

      // Step 3: Show text preview (optional - user can skip)
      if (rawText) {
        const previewText = rawText.substring(0, 500) + (rawText.length > 500 ? '...' : '');
        const shouldPreview = window.confirm(
          `Extracted Text Preview (first 500 chars):\n\n${previewText}\n\n` +
          `Do you want to see the full extracted text before evaluation?`
        );
        
        if (shouldPreview) {
          // Open full text in new window/modal
          const fullTextWindow = window.open('', '_blank');
          if (fullTextWindow) {
            fullTextWindow.document.write(`
              <html>
                <head><title>Extracted Text Preview</title></head>
                <body style="font-family: monospace; padding: 20px; white-space: pre-wrap;">
                  <h2>Extracted Text from PDF</h2>
                  <p><strong>Confidence Score:</strong> ${(confidenceScore * 100).toFixed(1)}%</p>
                  <hr>
                  ${rawText.replace(/\n/g, '<br>')}
                </body>
              </html>
            `);
          }
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
  const renderTabs = () => {
    const isSingle = evaluationMode === 'single';
    const isFull = evaluationMode === 'full';
    return (
      <div className={`flex gap-2 mb-6 p-1 rounded-lg ${theme === "dark" ? "bg-slate-800" : "bg-slate-100"}`}>
        <button
          onClick={() => setEvaluationMode('single')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isSingle
              ? theme === "dark"
                ? "bg-purple-600 text-white"
                : "bg-white text-purple-700 shadow-sm"
              : theme === "dark"
              ? "text-slate-300 hover:bg-slate-700"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          Single Question Evaluation
        </button>
        <button
          onClick={() => setEvaluationMode('full')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isFull
              ? theme === "dark"
                ? "bg-purple-600 text-white"
                : "bg-white text-purple-700 shadow-sm"
              : theme === "dark"
              ? "text-slate-300 hover:bg-slate-700"
              : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          Full Copy Evaluation
        </button>
      </div>
    );
  };

  // If single question mode, render that component
  if (evaluationMode === 'single') {
    return (
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-8">
        {/* Mode Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col gap-1 md:gap-2">
            <h1 className={`text-xl md:text-2xl font-semibold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>Copy Evaluation</h1>
            <p className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Evaluate your UPSC mains answers with detailed feedback</p>
          </div>
        </div>
        
        {renderTabs()}

        <SingleQuestionEvaluationPage hideHeader={true} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-8">
      <div className="flex flex-col gap-1 md:gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-xl md:text-2xl font-semibold tracking-tight ${theme === "dark" ? "text-slate-50" : "text-slate-900"}`}>Copy Evaluation</h1>
            <p className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Upload your UPSC answer copy PDF for AI-powered evaluation with examiner-style feedback</p>
          </div>
          {!selectedEvaluationId && !evaluationResult && (
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Upload New Answer
            </Button>
          )}
        </div>
        
        {renderTabs()}
      </div>

      {/* Main Content - Full width in Full Copy Evaluation mode */}
      <div className="h-[calc(100vh-12rem)] md:h-[calc(100vh-14rem)]">
        {/* Main Content Area */}
        <div className="w-full h-full overflow-hidden">
          {!selectedEvaluationId || !evaluationResult ? (
            <Card className={`h-full ${theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"}`}>
              <CardContent className="p-8 text-center flex items-center justify-center h-full">
                <div>
                  <FileText className={`w-16 h-16 mx-auto mb-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`} />
                  <h2 className={`text-xl font-semibold mb-2 ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                    No Answer Copy Evaluated Yet
                  </h2>
                  <p className={`mb-6 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    Upload your full answer copy PDF to get comprehensive evaluation with examiner-style feedback
                  </p>
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Upload New Answer Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3 md:pb-4">
                <div className="flex items-center justify-between">
                  <h2 className={`text-xl font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                    Your Answer Evaluation
                  </h2>
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    variant="outline"
                    className="text-sm"
                  >
                    Upload New Answer
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto pr-1 md:pr-2">
                {/* Results Display - Question by Question */}
                {fullEvaluation && fullEvaluation.evaluations && fullEvaluation.evaluations.length > 0 ? (
                  <div className="space-y-6">
                    {/* Question Navigation */}
                    <div className="flex items-center justify-end mb-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="text-sm"
                          onClick={() => setSelectedQuestionIndex(Math.max(0, selectedQuestionIndex - 1))}
                          disabled={selectedQuestionIndex === 0}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className={`text-sm px-3 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                          Question {selectedQuestionIndex + 1} of {fullEvaluation.evaluations.length}
                        </span>
                        <Button
                          variant="outline"
                          className="text-sm"
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                  Upload Answer Copy
                </h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setError(null);
                  }}
                  className={`p-1 rounded ${theme === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* File Upload */}
                <div>
                  <label className={`block font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                    Answer Copy (PDF)
                  </label>
                  {selectedFile ? (
                    <div className={`p-4 rounded-lg border flex items-center justify-between ${
                      theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}>
                      <span className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                        {selectedFile.name}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="p-1 hover:bg-slate-700 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                      theme === "dark" ? "border-slate-700" : "border-slate-300"
                    }`}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="pdf-upload-full"
                      />
                      <label htmlFor="pdf-upload-full" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                          Click to upload PDF or drag and drop
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

                {/* Error Message */}
                {error && (
                  <div className={`p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm`}>
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={async () => {
                    await handleUpload();
                    if (!error && selectedFile) {
                      setShowUploadModal(false);
                    }
                  }}
                  disabled={!selectedFile || isUploading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
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
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
};

export default CopyEvaluationPage;
