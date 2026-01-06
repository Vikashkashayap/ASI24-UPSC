import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { MessageSquare, CheckCircle, XCircle, AlertCircle, Target } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface InlineFeedback {
  location: string;
  comment: string;
  severity: 'positive' | 'neutral' | 'critical';
}

interface InlineFeedbackViewProps {
  answerText: string;
  inlineFeedback: InlineFeedback[];
  questionNumber: string;
  questionText?: string;
}

const InlineFeedbackView: React.FC<InlineFeedbackViewProps> = ({
  answerText,
  inlineFeedback,
  questionNumber,
  questionText
}) => {
  const { theme } = useTheme();
  const [selectedFeedback, setSelectedFeedback] = useState<InlineFeedback | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'inline'>('split');

  // Split answer text into paragraphs for better display
  const paragraphs = answerText.split('\n').filter(p => p.trim().length > 0);
  
  // If no paragraphs, split by sentences
  const displayParagraphs = paragraphs.length > 0 
    ? paragraphs 
    : answerText.split(/[.!?]\s+/).filter(p => p.trim().length > 0);

  // Map feedback to locations
  const feedbackByLocation: { [key: string]: InlineFeedback[] } = {};
  inlineFeedback.forEach(fb => {
    if (!feedbackByLocation[fb.location]) {
      feedbackByLocation[fb.location] = [];
    }
    feedbackByLocation[fb.location].push(fb);
  });

  // Determine section type for a paragraph based on position and content
  const getSectionType = (index: number, total: number, text: string): string => {
    const lowerText = text.toLowerCase();
    
    // Check for explicit section markers
    if (lowerText.includes('introduction') || lowerText.includes('intro')) return 'introduction';
    if (lowerText.includes('conclusion') || lowerText.includes('conclude')) return 'conclusion';
    if (lowerText.includes('body') || lowerText.includes('main')) return 'body';
    
    // Position-based heuristics
    if (index === 0 && total > 2) return 'introduction';
    if (index === total - 1 && total > 2) return 'conclusion';
    if (index > 0 && index < total - 1) return 'body';
    
    // Default
    return 'body';
  };

  const getFeedbackIcon = (severity: string) => {
    switch (severity) {
      case 'positive':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  const getFeedbackColor = (severity: string) => {
    switch (severity) {
      case 'positive':
        return theme === 'dark' 
          ? 'bg-green-950/30 border-green-600 text-green-300' 
          : 'bg-green-50 border-green-600 text-green-800';
      case 'critical':
        return theme === 'dark'
          ? 'bg-red-950/30 border-red-600 text-red-300'
          : 'bg-red-50 border-red-600 text-red-800';
      default:
        return theme === 'dark'
          ? 'bg-blue-950/30 border-blue-600 text-blue-300'
          : 'bg-blue-50 border-blue-600 text-blue-800';
    }
  };

  if (viewMode === 'inline') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
            Question {questionNumber}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('split')}
          >
            Split View
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {displayParagraphs.map((para, idx) => {
                const sectionType = getSectionType(idx, displayParagraphs.length, para);
                const relevantFeedback = feedbackByLocation[sectionType] || [];
                
                return (
                  <div key={idx} className="relative">
                    <div className={`p-4 rounded-lg mb-2 ${
                      theme === "dark" ? "bg-slate-800/50" : "bg-slate-50"
                    }`}>
                      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                        theme === "dark" ? "text-slate-200" : "text-slate-800"
                      }`}>
                        {para}
                      </p>
                    </div>
                    {relevantFeedback.length > 0 && (
                      <div className="ml-4 space-y-2">
                        {relevantFeedback.map((fb, fbIdx) => (
                          <div
                            key={fbIdx}
                            className={`p-3 rounded-lg border-l-4 ${getFeedbackColor(fb.severity)}`}
                          >
                            <div className="flex items-start gap-2">
                              {getFeedbackIcon(fb.severity)}
                              <div className="flex-1">
                                <div className={`text-xs font-semibold uppercase mb-1 ${
                                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                                }`}>
                                  {fb.location}
                                </div>
                                <p className="text-sm">{fb.comment}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
            Question {questionNumber}
          </h3>
          {questionText && (
            <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              {questionText}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewMode('inline')}
        >
          Inline View
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Panel - PDF Text */}
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Your Answer Text
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-20rem)] overflow-y-auto">
            <div className={`p-4 rounded-lg ${
              theme === "dark" ? "bg-slate-900/50" : "bg-slate-50"
            }`}>
              <div className="space-y-3">
                {displayParagraphs.length > 0 ? (
                  displayParagraphs.map((para, idx) => {
                    const sectionType = getSectionType(idx, displayParagraphs.length, para);
                    const hasFeedback = feedbackByLocation[sectionType]?.length > 0;
                    
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded border-l-4 transition-all ${
                          hasFeedback
                            ? theme === "dark"
                              ? "border-purple-500 bg-purple-950/20"
                              : "border-purple-400 bg-purple-50"
                            : theme === "dark"
                            ? "border-slate-700 bg-slate-800/30"
                            : "border-slate-200 bg-white"
                        }`}
                        onMouseEnter={() => {
                          const feedback = feedbackByLocation[sectionType];
                          if (feedback && feedback.length > 0) {
                            setSelectedFeedback(feedback[0]);
                          }
                        }}
                        onMouseLeave={() => setSelectedFeedback(null)}
                      >
                        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                          theme === "dark" ? "text-slate-200" : "text-slate-800"
                        }`}>
                          {para}
                        </p>
                        {hasFeedback && (
                          <div className="mt-2 flex items-center gap-2">
                            {feedbackByLocation[sectionType]?.map((fb, fbIdx) => (
                              <div key={fbIdx} className="flex items-center gap-1">
                                {getFeedbackIcon(fb.severity)}
                                <span className={`text-xs ${
                                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                                }`}>
                                  {fb.location}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    {answerText || 'No text available'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Feedback */}
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" />
              Examiner Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-20rem)] overflow-y-auto">
            <div className="space-y-3">
              {inlineFeedback.length === 0 ? (
                <p className={`text-sm text-center py-8 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  No feedback available
                </p>
              ) : (
                inlineFeedback.map((feedback, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-l-4 transition-all cursor-pointer ${
                      selectedFeedback === feedback
                        ? 'ring-2 ring-purple-500'
                        : ''
                    } ${getFeedbackColor(feedback.severity)}`}
                    onMouseEnter={() => setSelectedFeedback(feedback)}
                    onMouseLeave={() => setSelectedFeedback(null)}
                  >
                    <div className="flex items-start gap-3">
                      {getFeedbackIcon(feedback.severity)}
                      <div className="flex-1">
                        <div className={`text-xs font-semibold uppercase mb-2 tracking-wide ${
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`}>
                          {feedback.location}
                        </div>
                        <p className={`text-sm leading-relaxed ${
                          theme === "dark" ? "text-slate-200" : "text-slate-800"
                        }`}>
                          {feedback.comment}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InlineFeedbackView;

