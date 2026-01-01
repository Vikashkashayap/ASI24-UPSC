import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useTheme } from '../hooks/useTheme';

interface Annotation {
  page: number;
  issue_type: 'content' | 'structure' | 'language';
  severity: 'high' | 'medium' | 'low';
  highlight_text: string;
  comment: string;
  suggestion: string;
}

interface FeedbackPanelProps {
  annotations: Annotation[];
  selectedAnnotation: Annotation | null;
  onAnnotationSelect: (annotation: Annotation) => void;
  score?: number;
  maxMarks?: number;
  overallFeedback?: string;
  strengths?: string[];
  weaknesses?: string[];
}

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  annotations,
  selectedAnnotation,
  onAnnotationSelect,
  score = 0,
  maxMarks = 250,
  overallFeedback = '',
  strengths = [],
  weaknesses = []
}) => {
  const { theme } = useTheme();
  const percentage = Math.round((score / maxMarks) * 100);

  const getSeverityColor = (severity: string) => {
    if (severity === 'high') {
      return theme === "dark" ? "text-red-400 border-red-600 bg-red-950/20" : "text-red-600 border-red-300 bg-red-50";
    } else if (severity === 'medium') {
      return theme === "dark" ? "text-yellow-400 border-yellow-600 bg-yellow-950/20" : "text-yellow-600 border-yellow-300 bg-yellow-50";
    } else {
      return theme === "dark" ? "text-green-400 border-green-600 bg-green-950/20" : "text-green-600 border-green-300 bg-green-50";
    }
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'high') {
      return <XCircle className="w-5 h-5 text-red-600" />;
    } else if (severity === 'medium') {
      return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    } else {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  return (
    <div className={`h-full overflow-y-auto ${theme === "dark" ? "bg-slate-900" : "bg-slate-50"}`}>
      <div className="p-4 space-y-4">
        {/* Score Card */}
        <Card className={theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-lg ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
              Overall Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className={`text-3xl font-semibold ${
                percentage >= 70 ? "text-green-600" :
                percentage >= 50 ? "text-yellow-600" : "text-red-600"
              }`}>
                {score}
              </div>
              <div className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                / {maxMarks} marks
              </div>
            </div>
            <div className={`text-sm mt-2 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              {percentage}% • {percentage >= 70 ? "Good" : percentage >= 50 ? "Average" : "Needs Improvement"}
            </div>
          </CardContent>
        </Card>

        {/* Overall Feedback */}
        {overallFeedback && (
          <Card className={theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-base flex items-center gap-2 ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
                <Info className="w-4 h-4" />
                Overall Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-sm leading-relaxed ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                {overallFeedback}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Strengths */}
        {strengths.length > 0 && (
          <Card className={theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-base flex items-center gap-2 ${theme === "dark" ? "text-green-300" : "text-green-700"}`}>
                <CheckCircle className="w-4 h-4" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {strengths.map((strength, idx) => (
                  <li key={idx} className={`flex items-start gap-2 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                    <span className="text-green-600 font-bold mt-0.5">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Weaknesses */}
        {weaknesses.length > 0 && (
          <Card className={theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-base flex items-center gap-2 ${theme === "dark" ? "text-red-300" : "text-red-700"}`}>
                <XCircle className="w-4 h-4" />
                Weaknesses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {weaknesses.map((weakness, idx) => (
                  <li key={idx} className={`flex items-start gap-2 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                    <span className="text-red-600 font-bold mt-0.5">•</span>
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Annotations List */}
        <Card className={theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-base ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>
              Issues Found ({annotations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {annotations.length === 0 ? (
                <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                  No issues found. Great work!
                </p>
              ) : (
                annotations.map((annotation, idx) => (
                  <button
                    key={idx}
                    onClick={() => onAnnotationSelect(annotation)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedAnnotation === annotation
                        ? theme === "dark"
                          ? "border-purple-600 bg-purple-950/30"
                          : "border-purple-600 bg-purple-50"
                        : `${getSeverityColor(annotation.severity)} hover:opacity-80`
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {getSeverityIcon(annotation.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold uppercase ${
                            annotation.severity === 'high' ? "text-red-600" :
                            annotation.severity === 'medium' ? "text-yellow-600" : "text-green-600"
                          }`}>
                            {annotation.issue_type}
                          </span>
                          <span className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                            Page {annotation.page}
                          </span>
                        </div>
                        <p className={`text-xs font-medium mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                          "{annotation.highlight_text.substring(0, 50)}..."
                        </p>
                        <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                          {annotation.comment}
                        </p>
                      </div>
                    </div>
                    {selectedAnnotation === annotation && (
                      <div className={`mt-2 pt-2 border-t ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
                        <p className={`text-xs font-semibold mb-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                          Suggestion:
                        </p>
                        <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                          {annotation.suggestion}
                        </p>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeedbackPanel;

