import React from 'react';
import { FileText, AlertCircle, CheckCircle, XCircle, Sparkles, Download, Share2, Save, TrendingUp, BookOpen, Target, Award, Clock, BarChart3, Lightbulb, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useTheme } from '../hooks/useTheme';

interface QuestionEvaluation {
  questionNumber: string;
  questionText: string;
  answerText: string;
  totalMarks: number;
  maxMarks: number;
  wordCount: number;
  wordLimit?: number;
  strengths?: string[];
  weaknesses?: string[];
  improvements?: string[];
  examinerComment?: string;
  inlineFeedback?: Array<{
    location: string;
    comment: string;
    severity: string;
  }>;
}

interface QuestionEvaluationViewProps {
  question: QuestionEvaluation;
  paper?: string;
}

export const QuestionEvaluationView: React.FC<QuestionEvaluationViewProps> = ({ question, paper = 'GS' }) => {
  const { theme } = useTheme();

  // Extract sections from answer text
  const answerText = question.answerText || '';
  const introMatch = answerText.match(/(?:^|\.\s+)([^.]{50,200}\.)/);
  const introText = introMatch ? introMatch[1] : answerText.substring(0, Math.min(150, answerText.length));
  const bodyText = answerText.substring(introText.length, Math.max(0, answerText.length - 100));
  const conclusionText = answerText.substring(Math.max(0, answerText.length - 150));

  // Extract demand from question text
  const questionText = question.questionText || '';
  const demandPoints = [
    questionText.includes('discuss') ? 'Discuss the key aspects and provide comprehensive analysis' : null,
    questionText.includes('analyse') || questionText.includes('analyze') ? 'Analyze the topic with cause-effect relationships' : null,
    questionText.includes('evaluate') ? 'Evaluate different perspectives and provide balanced view' : null,
    questionText.includes('explain') ? 'Explain the concept with clear examples' : null,
  ].filter(Boolean) as string[];

  if (demandPoints.length === 0) {
    demandPoints.push('Address all aspects of the question', 'Provide relevant examples and case studies', 'Maintain analytical depth throughout');
  }

  const getWordCountStatus = () => {
    if (!question.wordCount || !question.wordLimit) return 'N/A';
    if (question.wordCount < question.wordLimit * 0.7) return 'BAD';
    if (question.wordCount > question.wordLimit * 1.1) return 'EXCEEDED';
    return 'GOOD';
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

  // Generate overall feedback text
  const getOverallFeedback = () => {
    if (question.examinerComment) {
      return question.examinerComment;
    }
    const performance = question.totalMarks >= question.maxMarks * 0.7 ? 'good' : 
                       question.totalMarks >= question.maxMarks * 0.5 ? 'average' : 'basic';
    const suggestion = question.totalMarks >= question.maxMarks * 0.7 
      ? 'could benefit from more specific examples and deeper analysis.' 
      : 'needs significant improvement in structure, depth, and examples.';
    return `The answer demonstrates ${performance} understanding but ${suggestion}`;
  };

  return (
    <div className="space-y-6">
      {/* Uploaded Answer Section */}
      <Card className={`${theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                theme === "dark" 
                  ? "bg-blue-900/50 text-blue-300 border border-blue-700" 
                  : "bg-blue-100 text-blue-700"
              }`}>
                {paper}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                theme === "dark" 
                  ? "bg-purple-900/50 text-purple-300 border border-purple-700" 
                  : "bg-purple-100 text-purple-700"
              }`}>
                {question.maxMarks} Marks
              </span>
            </div>
          </div>
          <div className={`mb-4 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
            <p className="font-semibold mb-2">Question:</p>
            <p className="text-sm">{question.questionText || `Question ${question.questionNumber}`}</p>
          </div>
          <div className={`${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
            <p className="font-semibold mb-2">Answer:</p>
            <p className="text-sm line-clamp-3">{answerText.substring(0, 200)}...</p>
          </div>
        </CardContent>
      </Card>

      {/* Demand of the Question */}
      <Card className={`${theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
              Demand of the Question
            </h3>
          </div>
          <ul className="space-y-2">
            {demandPoints.map((demand, idx) => (
              <li key={idx} className={`flex items-start gap-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                <span className="text-red-500 mt-1">•</span>
                <span>{demand}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Introduction */}
      <Card className={`${theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"}`}>
        <CardContent className="p-6">
          <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
            INTRODUCTION
          </h3>
          
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-red-500" />
              <span className={`font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                What you wrote:
              </span>
            </div>
            <p className={`italic text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              {introText || "No distinct introduction provided"}
            </p>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-blue-500" />
              <span className={`font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Analysis:
              </span>
            </div>
            <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              {question.inlineFeedback?.find(f => f.location === 'introduction')?.comment || 
               question.examinerComment?.substring(0, 200) || 
               "Basic introduction that states the core concept but could be more engaging and detailed."}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className={`font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Suggestions to improve:
              </span>
            </div>
            <ul className="space-y-1">
              {(question.improvements?.slice(0, 3) || [
                "Begin with constitutional or historical context",
                "Include key definitions and concepts",
                "Add a brief thesis statement"
              ]).map((suggestion, idx) => (
                <li key={idx} className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  • {typeof suggestion === 'string' ? suggestion : 'Improve introduction structure'}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Body */}
      <Card className={`${theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"}`}>
        <CardContent className="p-6">
          <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
            BODY
          </h3>
          
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-red-500" />
              <span className={`font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                What you wrote:
              </span>
            </div>
            <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              {bodyText || answerText.substring(100, 300) || "Body content"}
            </p>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className={`font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Strengths:
              </span>
            </div>
            <ul className="space-y-1">
              {(question.strengths?.slice(0, 3) || ["Good attempt", "Relevant content"]).map((strength, idx) => (
                <li key={idx} className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  • {strength}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className={`font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Weaknesses:
              </span>
            </div>
            <ul className="space-y-1">
              {(question.weaknesses?.slice(0, 3) || ["Needs more depth", "Missing examples"]).map((weakness, idx) => (
                <li key={idx} className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  • {weakness}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className={`font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Suggestions to improve:
              </span>
            </div>
            <ul className="space-y-1">
              {(question.improvements?.slice(0, 3) || [
                "Add specific examples and case studies",
                "Include constitutional articles and provisions",
                "Strengthen analytical depth"
              ]).map((suggestion, idx) => (
                <li key={idx} className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  • {typeof suggestion === 'string' ? suggestion : 'Improve body content'}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Conclusion */}
      <Card className={`${theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"}`}>
        <CardContent className="p-6">
          <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
            CONCLUSION
          </h3>
          
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-red-500" />
              <span className={`font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                What you wrote:
              </span>
            </div>
            <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              {conclusionText || answerText.substring(Math.max(0, answerText.length - 100)) || "No distinct conclusion provided"}
            </p>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-blue-500" />
              <span className={`font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Analysis:
              </span>
            </div>
            <p className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              {question.inlineFeedback?.find(f => f.location === 'conclusion')?.comment || 
               (conclusionText ? "Conclusion provides summary but could be more forward-looking." : "Missing conclusion severely impacts answer quality. Every answer needs proper closure.")}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className={`font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Suggestions to improve:
              </span>
            </div>
            <ul className="space-y-1">
              {[
                "Add forward-looking perspective",
                "Include balanced view on limitations and potential",
                "Summarize key points effectively"
              ].map((suggestion, idx) => (
                <li key={idx} className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                  • {suggestion}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Overall Feedback */}
      <Card className={`${theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"}`}>
        <CardContent className="p-6">
          <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
            OVERALL FEEDBACK:
          </h3>
          <p className={`${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
            {getOverallFeedback()}
          </p>
        </CardContent>
      </Card>

      {/* Marks Scored */}
      <Card className={`${theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{"😐"}</div>
            <div className="flex-1">
              <p className={`text-sm mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Marks scored:
              </p>
              <p className={`text-3xl font-bold ${
                (question.totalMarks / question.maxMarks) >= 0.7 ? 'text-green-600' :
                (question.totalMarks / question.maxMarks) >= 0.5 ? 'text-orange-600' : 'text-red-600'
              }`}>
                {question.totalMarks}/{question.maxMarks}
              </p>
              <p className={`text-sm mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Keep practicing, and you'll improve!
              </p>
            </div>
            <div className="flex-1">
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full ${
                    (question.totalMarks / question.maxMarks) >= 0.7
                      ? 'bg-green-500'
                      : (question.totalMarks / question.maxMarks) >= 0.5
                      ? 'bg-orange-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${(question.totalMarks / question.maxMarks) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span>0</span>
                <span>{question.maxMarks}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Word Count */}
      <Card className={`${theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white"}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Word count:
              </p>
              <p className={`text-2xl font-bold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                {question.wordCount || 0}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-full border text-sm font-medium ${getWordCountStatusColor(getWordCountStatus())}`}>
              {getWordCountStatus()}
            </div>
          </div>
          {question.wordLimit && (
            <p className={`text-xs mt-2 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Word limit is considered while calculating your marks. Check word limit guide
            </p>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Action Buttons */}
      <Card className={`${theme === "dark" ? "bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-slate-700" : "bg-gradient-to-br from-blue-50/50 to-white border-blue-200"}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
              Actions
            </h3>
            <Sparkles className={`w-5 h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className={`flex items-center gap-2 h-12 ${theme === "dark" ? "border-slate-600 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"}`}
              onClick={() => {/* Download report functionality */}}
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Download Report</span>
            </Button>
            <Button
              variant="outline"
              className={`flex items-center gap-2 h-12 ${theme === "dark" ? "border-slate-600 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"}`}
              onClick={() => {/* Share results functionality */}}
            >
              <Share2 className="w-4 h-4" />
              <span className="text-sm">Share Results</span>
            </Button>
            <Button
              variant="outline"
              className={`flex items-center gap-2 h-12 ${theme === "dark" ? "border-slate-600 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"}`}
              onClick={() => {/* Save for later functionality */}}
            >
              <Save className="w-4 h-4" />
              <span className="text-sm">Save for Later</span>
            </Button>
            <Button
              variant="outline"
              className={`flex items-center gap-2 h-12 ${theme === "dark" ? "border-slate-600 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-50"}`}
              onClick={() => {/* Compare with previous functionality */}}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Compare</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card className={`${theme === "dark" ? "bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-slate-700" : "bg-gradient-to-br from-green-50/50 to-white border-green-200"}`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
            <BarChart3 className="w-5 h-5" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Breakdown */}
          <div>
            <h4 className={`text-sm font-medium mb-3 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              Score Distribution
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Introduction</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{width: '70%'}}></div>
                  </div>
                  <span className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>7/10</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Body Content</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{width: '60%'}}></div>
                  </div>
                  <span className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>6/10</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Conclusion</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{width: '40%'}}></div>
                  </div>
                  <span className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>4/10</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison with Average */}
          <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-slate-800/50 border-slate-600" : "bg-white border-slate-200"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Your Performance vs Average
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                question.totalMarks >= question.maxMarks * 0.6 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {question.totalMarks >= question.maxMarks * 0.6 ? 'Above Average' : 'Below Average'}
              </span>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <div className="text-center mb-1">
                  <div className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                    You
                  </div>
                  <div className="w-full bg-gray-200 rounded-t h-8 flex items-end justify-center">
                    <div
                      className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t text-xs text-white font-medium flex items-end justify-center pb-1"
                      style={{height: `${(question.totalMarks / question.maxMarks) * 100}%`, minHeight: '20px'}}
                    >
                      {question.totalMarks}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-center mb-1">
                  <div className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                    Average
                  </div>
                  <div className="w-full bg-gray-200 rounded-t h-8 flex items-end justify-center">
                    <div
                      className="bg-gradient-to-t from-gray-500 to-gray-400 rounded-t text-xs text-white font-medium flex items-end justify-center pb-1"
                      style={{height: '45%', minHeight: '20px'}}
                    >
                      4.5
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps & Recommendations */}
      <Card className={`${theme === "dark" ? "bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-slate-700" : "bg-gradient-to-br from-purple-50/50 to-white border-purple-200"}`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
            <Target className="w-5 h-5" />
            Next Steps & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Priority Improvements */}
          <div>
            <h4 className={`text-sm font-medium mb-3 flex items-center gap-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              <Lightbulb className="w-4 h-4" />
              Priority Improvements
            </h4>
            <div className="space-y-2">
              <div className={`p-3 rounded-lg border ${theme === "dark" ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200"}`}>
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className={`text-sm font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                      Strengthen Conclusion
                    </p>
                    <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                      Your conclusion lacks forward-looking perspective. Add balanced view and future implications.
                    </p>
                  </div>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${theme === "dark" ? "bg-orange-900/20 border-orange-800" : "bg-orange-50 border-orange-200"}`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className={`text-sm font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                      Add Case Studies
                    </p>
                    <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                      Include relevant case studies and current affairs examples to strengthen your arguments.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Study Recommendations */}
          <div>
            <h4 className={`text-sm font-medium mb-3 flex items-center gap-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
              <BookOpen className="w-4 h-4" />
              Recommended Study Materials
            </h4>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="ghost"
                className={`justify-start h-auto p-3 ${theme === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-50"}`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-blue-900/30" : "bg-blue-100"}`}>
                    <BookOpen className={`w-4 h-4 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                      UPSC Previous Year Questions
                    </p>
                    <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                      Practice similar questions from 2015-2023
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`} />
                </div>
              </Button>
              <Button
                variant="ghost"
                className={`justify-start h-auto p-3 ${theme === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-50"}`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-green-900/30" : "bg-green-100"}`}>
                    <Award className={`w-4 h-4 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                      Topper's Answer Copies
                    </p>
                    <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                      Study high-scoring answer structures
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`} />
                </div>
              </Button>
              <Button
                variant="ghost"
                className={`justify-start h-auto p-3 ${theme === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-50"}`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 text-left">
                    <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-purple-900/30" : "bg-purple-100"}`}>
                      <Clock className={`w-4 h-4 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                        Practice Timer Sessions
                      </p>
                      <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                        Time yourself for better exam preparation
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`} />
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

