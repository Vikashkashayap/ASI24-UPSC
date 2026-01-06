import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Eye, EyeOff, Download, FileText, Target, AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface Highlight {
  type: 'irrelevant' | 'weak_structure' | 'grammar' | 'missing_keyword' | 'good_content';
  start: number;
  end: number;
  text: string;
}

interface AnnotatedTextViewProps {
  annotatedText: string;
  originalText: string;
  questionNumber: string;
  questionText?: string;
  wordCount?: number;
  wordLimit?: number;
  mistakeSummary?: string[];
  examinerComment?: string;
  scoringBreakdown?: {
    structure_score: number;
    content_score: number;
    analysis_score: number;
    language_score: number;
    value_addition_score: number;
    final_score: number;
  };
  totalMarks?: number;
  maxMarks?: number;
}

const AnnotatedTextView: React.FC<AnnotatedTextViewProps> = ({
  annotatedText,
  originalText,
  questionNumber,
  questionText,
  wordCount = 0,
  wordLimit = 250,
  mistakeSummary = [],
  examinerComment = '',
  scoringBreakdown,
  totalMarks = 0,
  maxMarks = 12.5
}) => {
  const { theme } = useTheme();
  const [showHighlights, setShowHighlights] = useState(true);

  // Parse highlight tags from annotated text
  const parseHighlights = (text: string): Array<{ type: string; text: string; start: number; end: number }> => {
    const highlights: Array<{ type: string; text: string; start: number; end: number }> = [];
    const regex = /<highlight type="([^"]+)">([^<]+)<\/highlight>/g;
    let match;
    let offset = 0;

    while ((match = regex.exec(text)) !== null) {
      const type = match[1];
      const content = match[2];
      const start = match.index - offset;
      const end = start + content.length;
      
      highlights.push({ type, text: content, start, end });
      offset += match[0].length - content.length; // Account for tag length
    }

    return highlights;
  };

  // Render text with highlights
  const renderAnnotatedText = () => {
    if (!annotatedText) {
      return <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>{originalText}</p>;
    }

    if (!showHighlights) {
      return <p className={`text-sm whitespace-pre-wrap ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>{originalText}</p>;
    }

    const highlights = parseHighlights(annotatedText);
    if (highlights.length === 0) {
      return <p className={`text-sm whitespace-pre-wrap ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>{originalText}</p>;
    }

    // Sort highlights by start position
    highlights.sort((a, b) => a.start - b.start);

    // Build segments
    const segments: Array<{ text: string; highlight?: { type: string } }> = [];
    let lastIndex = 0;

    highlights.forEach((highlight) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        segments.push({ text: originalText.substring(lastIndex, highlight.start) });
      }
      // Add highlighted text
      segments.push({ text: highlight.text, highlight: { type: highlight.type } });
      lastIndex = highlight.end;
    });

    // Add remaining text
    if (lastIndex < originalText.length) {
      segments.push({ text: originalText.substring(lastIndex) });
    }

    return (
      <div className="space-y-2">
        {segments.map((segment, idx) => {
          if (segment.highlight) {
            const highlightType = segment.highlight.type;
            const highlightStyles = getHighlightStyles(highlightType);
            return (
              <span
                key={idx}
                className={`${highlightStyles.bg} ${highlightStyles.text} ${highlightStyles.border} px-1 py-0.5 rounded cursor-help`}
                title={getHighlightTooltip(highlightType)}
              >
                {segment.text}
              </span>
            );
          }
          return <span key={idx}>{segment.text}</span>;
        })}
      </div>
    );
  };

  const getHighlightStyles = (type: string) => {
    const baseStyles = {
      irrelevant: {
        bg: theme === "dark" ? "bg-red-950/40" : "bg-red-100",
        text: theme === "dark" ? "text-red-300" : "text-red-800",
        border: "border-b-2 border-red-500"
      },
      weak_structure: {
        bg: theme === "dark" ? "bg-orange-950/40" : "bg-orange-100",
        text: theme === "dark" ? "text-orange-300" : "text-orange-800",
        border: "border-b-2 border-orange-500"
      },
      grammar: {
        bg: theme === "dark" ? "bg-yellow-950/40" : "bg-yellow-100",
        text: theme === "dark" ? "text-yellow-300" : "text-yellow-800",
        border: "border-b-2 border-yellow-500"
      },
      missing_keyword: {
        bg: theme === "dark" ? "bg-blue-950/40" : "bg-blue-100",
        text: theme === "dark" ? "text-blue-300" : "text-blue-800",
        border: "border-b-2 border-blue-500"
      },
      good_content: {
        bg: theme === "dark" ? "bg-green-950/40" : "bg-green-100",
        text: theme === "dark" ? "text-green-300" : "text-green-800",
        border: "border-b-2 border-green-500"
      }
    };

    return baseStyles[type as keyof typeof baseStyles] || baseStyles.grammar;
  };

  const getHighlightTooltip = (type: string): string => {
    const tooltips = {
      irrelevant: "Irrelevant content - doesn't answer the question",
      weak_structure: "Weak structure - needs better organization",
      grammar: "Grammar or spelling error",
      missing_keyword: "Missing important UPSC keyword/concept",
      good_content: "Well-written, relevant content"
    };
    return tooltips[type as keyof typeof tooltips] || type;
  };

  const getHighlightIcon = (type: string) => {
    switch (type) {
      case 'irrelevant':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'weak_structure':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'grammar':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'missing_keyword':
        return <Info className="w-4 h-4 text-blue-600" />;
      case 'good_content':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return null;
    }
  };

  const isOverLimit = wordCount > wordLimit;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      {/* Left Panel - Question */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Question {questionNumber}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {questionText && (
            <p className={`text-sm mb-4 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              {questionText}
            </p>
          )}
          <div className="space-y-2">
            <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Word Count: <span className={isOverLimit ? "text-red-600 font-semibold" : "font-semibold"}>{wordCount}</span> / {wordLimit}
            </div>
            {isOverLimit && (
              <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 p-2 rounded">
                ⚠️ Over word limit by {wordCount - wordLimit} words
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Center Panel - Annotated Text */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" />
              Your Answer
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHighlights(!showHighlights)}
              className="gap-2"
            >
              {showHighlights ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showHighlights ? 'Hide' : 'Show'} Highlights
            </Button>
          </div>
        </CardHeader>
        <CardContent className="max-h-[calc(100vh-20rem)] overflow-y-auto">
          <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-slate-900/50" : "bg-slate-50"}`}>
            {renderAnnotatedText()}
          </div>
          
          {/* Legend */}
          {showHighlights && (
            <div className="mt-4 p-3 rounded-lg border border-slate-300 dark:border-slate-700">
              <div className="text-xs font-semibold mb-2">Highlight Legend:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['irrelevant', 'weak_structure', 'grammar', 'missing_keyword', 'good_content'].map((type) => (
                  <div key={type} className="flex items-center gap-2">
                    {getHighlightIcon(type)}
                    <span className="capitalize">{type.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right Panel - Marks & Feedback */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4" />
            Evaluation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Display */}
          <div className={`p-4 rounded-lg text-center ${
            theme === "dark" ? "bg-purple-900/30" : "bg-purple-50"
          }`}>
            <div className={`text-2xl font-bold mb-1 ${theme === "dark" ? "text-purple-300" : "text-purple-700"}`}>
              {totalMarks.toFixed(1)} / {maxMarks}
            </div>
            <div className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              {((totalMarks / maxMarks) * 100).toFixed(1)}%
            </div>
          </div>

          {/* Scoring Breakdown */}
          {scoringBreakdown && (
            <div>
              <div className="text-xs font-semibold mb-2">Marks Breakdown:</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Structure:</span>
                  <span className="font-semibold">{scoringBreakdown.structure_score.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Content:</span>
                  <span className="font-semibold">{scoringBreakdown.content_score.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Analysis:</span>
                  <span className="font-semibold">{scoringBreakdown.analysis_score.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Language:</span>
                  <span className="font-semibold">{scoringBreakdown.language_score.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Value Addition:</span>
                  <span className="font-semibold">{scoringBreakdown.value_addition_score.toFixed(1)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Examiner Comment */}
          {examinerComment && (
            <div>
              <div className="text-xs font-semibold mb-2">Examiner Comment:</div>
              <p className={`text-xs ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                {examinerComment}
              </p>
            </div>
          )}

          {/* Mistake Summary */}
          {mistakeSummary.length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-2 text-red-600">Mistakes:</div>
              <ul className="space-y-1">
                {mistakeSummary.map((mistake, idx) => (
                  <li key={idx} className={`text-xs flex items-start gap-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                    <span className="text-red-600">•</span>
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnnotatedTextView;

