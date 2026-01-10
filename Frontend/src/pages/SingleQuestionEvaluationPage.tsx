import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Info, Star, CheckCircle, XCircle, AlertCircle, Sparkles, BookOpen, ExternalLink } from 'lucide-react';
import { singleQuestionEvaluationAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useTheme } from '../hooks/useTheme';

interface EvaluationData {
  demandOfQuestion: string[];
  introduction: {
    whatYouWrote: string;
    analysis: string;
    suggestions: string[];
  };
  body: {
    whatYouWrote: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  conclusion: {
    whatYouWrote: string;
    analysis: string;
    suggestions: string[];
  };
  overallFeedback: string;
  marksScored: number;
  maxMarks: number;
  wordCount: number;
  wordLimit: number;
  wordCountStatus: 'GOOD' | 'BAD' | 'EXCEEDED';
  modelAnswer?: string;
  rating?: {
    content: number;
    structure: number;
    analysis: number;
    examples: number;
    language: number;
  };
  question: string;
  answerText: string;
  paper: string;
  language: string;
}

interface SingleQuestionEvaluationPageProps {
  hideHeader?: boolean;
}

const SingleQuestionEvaluationPage: React.FC<SingleQuestionEvaluationPageProps> = ({ hideHeader = false }) => {
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [question, setQuestion] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [paper, setPaper] = useState<'GS' | 'Ethics' | 'Essay' | 'Optional'>('GS');
  const [marks, setMarks] = useState<10 | 15>(10);
  const [language, setLanguage] = useState<'English' | 'Hindi'>('English');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const answerTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEvaluate = async () => {
    if (!question.trim()) {
      setError('Please enter the question');
      return;
    }

    if (!answerText.trim() && !selectedFile) {
      setError('Please provide an answer (text or PDF)');
      return;
    }

    setIsEvaluating(true);
    setError(null);
    setEvaluation(null);

    try {
      const response = await singleQuestionEvaluationAPI.evaluate({
        question: question.trim(),
        answerText: answerText.trim() || undefined,
        paper,
        marks,
        language,
        wordLimit: marks === 10 ? 150 : 250,
        pdfFile: selectedFile || undefined,
      });

      if (response.data.success) {
        setEvaluation(response.data.data.evaluation);
        setShowModal(false);
      } else {
        setError(response.data.message || 'Evaluation failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to evaluate answer');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNewEvaluation = () => {
    setEvaluation(null);
    setQuestion('');
    setAnswerText('');
    setSelectedFile(null);
    setPaper('GS');
    setMarks(10);
    setLanguage('English');
    setRating(0);
    setShowModelAnswer(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getWordCountStatusColor = (status: string) => {
    switch (status) {
      case 'GOOD':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'BAD':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'EXCEEDED':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getMarksColor = (scored: number, max: number) => {
    const percentage = (scored / max) * 100;
    if (percentage >= 70) return 'text-green-600';
    if (percentage >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className={hideHeader ? '' : `min-h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className={hideHeader ? '' : 'max-w-7xl mx-auto px-4 py-6'}>
        {!hideHeader && (
          <div className="flex items-center justify-between mb-6">
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-slate-50' : 'text-slate-900'}`}>
              Evaluate Mains Answer
            </h1>
            {!evaluation && (
              <Button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Upload New Answer
              </Button>
            )}
          </div>
        )}

        {!evaluation ? (
          <Card className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
            <CardContent className="p-8 text-center">
              <FileText className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
              <h2 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                No Answer Evaluated Yet
              </h2>
              <p className={`mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Upload your answer to get detailed evaluation and feedback
              </p>
              <Button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Upload New Answer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Uploaded Answer Section */}
            <Card className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      theme === 'dark' 
                        ? 'bg-blue-900/50 text-blue-300 border border-blue-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {evaluation.paper}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      theme === 'dark' 
                        ? 'bg-purple-900/50 text-purple-300 border border-purple-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {evaluation.maxMarks} Marks
                    </span>
                  </div>
                  <Button
                    onClick={handleNewEvaluation}
                    variant="outline"
                    size="sm"
                  >
                    Upload New Answer
                  </Button>
                </div>
                <div className={`mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  <p className="font-semibold mb-2">Question:</p>
                  <p className="text-sm">{evaluation.question}</p>
                </div>
                <div className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  <p className="font-semibold mb-2">Answer:</p>
                  <p className="text-sm line-clamp-3">{evaluation.answerText.substring(0, 200)}...</p>
                </div>
              </CardContent>
            </Card>

            {/* Your Answer Evaluation */}
            <div className="space-y-6">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                Your Answer Evaluation
              </h2>

              {/* Demand of the Question */}
              <Card className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                      Demand of the Question
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {evaluation.demandOfQuestion.map((demand, idx) => (
                      <li key={idx} className={`flex items-start gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span className="text-red-500 mt-1">•</span>
                        <span>{demand}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Introduction */}
              <Card className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
                <CardContent className="p-6">
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                    INTRODUCTION
                  </h3>
                  
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-red-500" />
                      <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        What you wrote:
                      </span>
                    </div>
                    <p className={`italic text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {evaluation.introduction.whatYouWrote}
                    </p>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-blue-500" />
                      <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Analysis:
                      </span>
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {evaluation.introduction.analysis}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Suggestions to improve:
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {evaluation.introduction.suggestions.map((suggestion, idx) => (
                        <li key={idx} className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          • {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Body */}
              <Card className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
                <CardContent className="p-6">
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                    BODY
                  </h3>
                  
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-red-500" />
                      <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        What you wrote:
                      </span>
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {evaluation.body.whatYouWrote}
                    </p>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Strengths:
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {evaluation.body.strengths.map((strength, idx) => (
                        <li key={idx} className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          • {strength}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Weaknesses:
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {evaluation.body.weaknesses.map((weakness, idx) => (
                        <li key={idx} className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          • {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Suggestions to improve:
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {evaluation.body.suggestions.map((suggestion, idx) => (
                        <li key={idx} className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          • {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Conclusion */}
              <Card className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
                <CardContent className="p-6">
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                    CONCLUSION
                  </h3>
                  
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-red-500" />
                      <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        What you wrote:
                      </span>
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {evaluation.conclusion.whatYouWrote}
                    </p>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-blue-500" />
                      <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Analysis:
                      </span>
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {evaluation.conclusion.analysis}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Suggestions to improve:
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {evaluation.conclusion.suggestions.map((suggestion, idx) => (
                        <li key={idx} className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          • {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Overall Feedback */}
              <Card className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
                <CardContent className="p-6">
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                    OVERALL FEEDBACK:
                  </h3>
                  <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    {evaluation.overallFeedback}
                  </p>
                </CardContent>
              </Card>

              {/* Marks Scored */}
              <Card className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">😐</div>
                    <div className="flex-1">
                      <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Marks scored:
                      </p>
                      <p className={`text-3xl font-bold ${getMarksColor(evaluation.marksScored, evaluation.maxMarks)}`}>
                        {evaluation.marksScored}/{evaluation.maxMarks}
                      </p>
                      <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Keep practicing, and you'll improve!
                      </p>
                    </div>
                    <div className="flex-1">
                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`absolute top-0 left-0 h-full ${
                            (evaluation.marksScored / evaluation.maxMarks) >= 0.7
                              ? 'bg-green-500'
                              : (evaluation.marksScored / evaluation.maxMarks) >= 0.5
                              ? 'bg-orange-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${(evaluation.marksScored / evaluation.maxMarks) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span>0</span>
                        <span>{evaluation.maxMarks}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Word Count */}
              <Card className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Word count:
                      </p>
                      <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                        {evaluation.wordCount}
                      </p>
                    </div>
                    <div className={`px-4 py-2 rounded-full border text-sm font-medium ${getWordCountStatusColor(evaluation.wordCountStatus)}`}>
                      {evaluation.wordCountStatus}
                    </div>
                  </div>
                  <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Word limit is considered while calculating your marks. Check word limit guide
                  </p>
                </CardContent>
              </Card>

              {/* Model Answer Button */}
              {evaluation.modelAnswer && (
                <Button
                  onClick={() => setShowModelAnswer(!showModelAnswer)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {showModelAnswer ? 'Hide Model Answer' : 'Get Model Answer'}
                </Button>
              )}

              {/* Model Answer */}
              {showModelAnswer && evaluation.modelAnswer && (
                <Card className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
                  <CardContent className="p-6">
                    <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                      <BookOpen className="w-5 h-5" />
                      Model Answer
                    </h3>
                    <p className={`whitespace-pre-wrap ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {evaluation.modelAnswer}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Rating */}
              <Card className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
                <CardContent className="p-6">
                  <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    How would you rate this evaluation?
                  </p>
                  <p className={`text-xs mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Your feedback helps us improve
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`p-1 ${
                          star <= rating
                            ? 'text-yellow-400'
                            : theme === 'dark'
                            ? 'text-slate-600'
                            : 'text-slate-300'
                        }`}
                      >
                        <Star className="w-6 h-6 fill-current" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                    Evaluate your answer
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Language Selection */}
                <div className="mb-6">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLanguage('English')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        language === 'English'
                          ? 'bg-blue-600 text-white'
                          : theme === 'dark'
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setLanguage('Hindi')}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        language === 'Hindi'
                          ? 'bg-blue-600 text-white'
                          : theme === 'dark'
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Hindi (BETA)
                    </button>
                  </div>
                </div>

                {/* Answer Upload */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <label className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Answer
                    </label>
                    <Info className="w-4 h-4 text-slate-400" />
                  </div>
                  
                  {selectedFile ? (
                    <div className={`p-4 rounded-lg border flex items-center justify-between ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {selectedFile.name}
                      </span>
                      <button
                        onClick={removeFile}
                        className="p-1 hover:bg-slate-700 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                      theme === 'dark' ? 'border-slate-700' : 'border-slate-300'
                    }`}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="pdf-upload"
                      />
                      <label htmlFor="pdf-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          Click to upload PDF or drag and drop
                        </p>
                      </label>
                    </div>
                  )}

                  {/* Answer Text Input (Alternative to PDF) */}
                  <div className="mt-4">
                    <label className={`block font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Or type your answer:
                    </label>
                    <textarea
                      ref={answerTextareaRef}
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Type your answer here..."
                      rows={6}
                      className={`w-full px-4 py-2 rounded-lg border resize-none ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Paper Selection */}
                <div className="mb-6">
                  <label className={`block font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Paper
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['GS', 'Ethics', 'Essay', 'Optional'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPaper(p)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          paper === p
                            ? 'bg-blue-600 text-white'
                            : theme === 'dark'
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Input */}
                <div className="mb-6">
                  <label className={`block font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Question
                  </label>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Enter the question here..."
                    rows={3}
                    className={`w-full px-4 py-2 rounded-lg border resize-none ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* Marks Selection */}
                <div className="mb-6">
                  <label className={`block font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Marks
                  </label>
                  <div className="flex gap-2">
                    {([10, 15] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMarks(m)}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                          marks === m
                            ? 'bg-blue-600 text-white'
                            : theme === 'dark'
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className={`mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm`}>
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleEvaluate}
                  disabled={isEvaluating}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isEvaluating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Evaluating...
                    </>
                  ) : (
                    'Ask Mentor'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SingleQuestionEvaluationPage;

