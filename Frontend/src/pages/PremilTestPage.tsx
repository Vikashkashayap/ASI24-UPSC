import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Progress } from '../components/ui/progress';
import {
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Zap,
  Target,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface SubjectTopic {
  subject: string;
  topics: string[];
  documentCount: number;
}

interface TestConfig {
  difficulties: string[];
  questionCounts: number[];
  timeLimits: { [key: number]: number };
  subjects: string[];
}

interface TestQuestion {
  id: string;
  question: string;
  options: string[];
  questionIndex: number;
}

interface TestSession {
  sessionId: string;
  questions: TestQuestion[];
  totalQuestions: number;
  cached: boolean;
  aiCost: number;
  generationTime: number;
  subject: string;
  topic: string;
  difficulty: string;
}

interface TestResult {
  sessionId: string;
  score: number;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number;
  status: string;
}

interface DetailedAnalysis {
  questionIndex: number;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  explanation?: string;
  options?: string[];
}

const PremilTestPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Test generation state
  const [subjects, setSubjects] = useState<SubjectTopic[]>([]);
  const [config, setConfig] = useState<TestConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Test parameters
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(20);

  // Test taking state
  const [testSession, setTestSession] = useState<TestSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [timeSpent, setTimeSpent] = useState(0); // Time elapsed in seconds
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [detailedAnalysis, setDetailedAnalysis] = useState<DetailedAnalysis[]>([]);

  // Timer & Auto-submit
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (testSession && startTime && !testResult) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
        setTimeSpent(elapsed);

        // Auto-submit if time limit reached
        if (config?.timeLimits && testSession.totalQuestions) {
          const limit = config.timeLimits[testSession.totalQuestions] || 7200;
          if (elapsed >= limit) {
            clearInterval(interval);
            handleSubmitTest(true); // true = force submit
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [testSession, startTime, testResult, config]);

  useEffect(() => {
    loadSubjectsAndConfig();
  }, []);

  const loadSubjectsAndConfig = async () => {
    try {
      setLoading(true);
      const [subjectsResponse, configResponse] = await Promise.all([
        api.get('/api/premil/subjects'),
        api.get('/api/premil/config')
      ]);

      setSubjects(subjectsResponse.data.subjects);
      setConfig(configResponse.data.config);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTest = async () => {
    if (!selectedSubject || !selectedTopic || !difficulty || !questionCount) {
      alert('Please fill all test parameters');
      return;
    }

    try {
      setGenerating(true);

      const response = await api.post('/api/premil/generate', {
        subject: selectedSubject,
        topic: selectedTopic,
        difficulty,
        questionCount
      });

      const session: TestSession = {
        sessionId: response.data.sessionId,
        questions: response.data.questions,
        totalQuestions: response.data.totalQuestions,
        cached: response.data.cached,
        aiCost: response.data.aiCost,
        generationTime: response.data.generationTime,
        subject: selectedSubject,
        topic: selectedTopic,
        difficulty
      };

      setTestSession(session);
      setStartTime(new Date());
      setCurrentQuestionIndex(0);
      setAnswers({});
      setTimeSpent(0);

    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to generate test');
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < (testSession?.totalQuestions || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitTest = async (forceString: boolean = false) => {
    if (!testSession) return;

    // Check if all questions are answered (unless forced)
    if (!forceString) {
      const unansweredCount = testSession.totalQuestions - Object.keys(answers).length;
      if (unansweredCount > 0) {
        if (!confirm(`You have ${unansweredCount} unanswered questions. Submit anyway?`)) {
          return;
        }
      }
    }

    try {
      const answersArray = Object.entries(answers).map(([questionIndex, selectedAnswer]) => ({
        questionIndex: parseInt(questionIndex),
        selectedAnswer,
        timeSpent: 30 // Simplified tracking
      }));

      const response = await api.post('/api/premil/submit', {
        sessionId: testSession.sessionId,
        answers: answersArray,
        timeSpent
      });

      setTestResult(response.data.result);
      fetchDetailedAnalysis(testSession.sessionId);

    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit test');
    }
  };

  const fetchDetailedAnalysis = async (sessionId: string) => {
    try {
      setLoadingAnalysis(true);
      const response = await api.get(`/api/premil/session/${sessionId}`);
      if (response.data.success && response.data.session.detailedResults) {
        setDetailedAnalysis(response.data.session.detailedResults);
      }
    } catch (error) {
      console.error("Failed to load detailed analysis", error);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleStartNewTest = () => {
    setTestSession(null);
    setTestResult(null);
    setDetailedAnalysis([]);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeSpent(0);
    setStartTime(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCost = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getProgressPercentage = () => {
    if (!testSession) return 0;
    return ((Object.keys(answers).length) / testSession.totalQuestions) * 100;
  };

  // Show results page
  if (testResult) {
    const totalMarks = testResult.totalQuestions * 2;

    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle className="h-8 w-8 text-green-600" />
              Test Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-blue-50 p-6 rounded-xl text-center border border-blue-100">
                <div className="text-sm text-blue-600 font-medium mb-1">SCORE</div>
                <div className="text-4xl font-bold text-blue-700">{testResult.score} <span className="text-lg text-blue-400">/ {totalMarks}</span></div>
                <div className="text-xs text-blue-500 mt-2">{testResult.percentage}% Accuracy</div>
              </div>

              <div className="bg-green-50 p-6 rounded-xl text-center border border-green-100">
                <div className="text-sm text-green-600 font-medium mb-1">CORRECT</div>
                <div className="text-4xl font-bold text-green-700">{testResult.correctAnswers}</div>
                <div className="text-xs text-green-500 mt-2">Questions</div>
              </div>

              <div className="bg-red-50 p-6 rounded-xl text-center border border-red-100">
                <div className="text-sm text-red-600 font-medium mb-1">INCORRECT</div>
                <div className="text-4xl font-bold text-red-700">{testResult.totalQuestions - testResult.correctAnswers - (testSession?.totalQuestions! - Object.keys(answers).length)}</div>
                <div className="text-xs text-red-500 mt-2">Negative Marking: -0.66</div>
              </div>

              <div className="bg-purple-50 p-6 rounded-xl text-center border border-purple-100">
                <div className="text-sm text-purple-600 font-medium mb-1">TIME TAKEN</div>
                <div className="text-4xl font-bold text-purple-700">{formatTime(testResult.timeSpent)}</div>
                <div className="text-xs text-purple-500 mt-2">Avg {Math.round(testResult.timeSpent / testResult.totalQuestions)}s / q</div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleStartNewTest} className="flex-1 h-12 text-lg">
                <RotateCcw className="h-5 w-5 mr-2" />
                Take Another Test
              </Button>
              <Button variant="outline" onClick={() => navigate('/premil/history')} className="flex-1 h-12 text-lg">
                View History
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Analysis */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> Detailed Solutions
          </h2>

          {loadingAnalysis ? (
            <div className="text-center p-8">Loading detailed analysis...</div>
          ) : (
            detailedAnalysis.map((item, idx) => (
              <Card key={idx} className={`border-l-4 ${item.isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3">
                      <span className="font-bold text-gray-500">Q{idx + 1}.</span>
                      <h3 className="font-medium text-lg text-gray-900">{item.question}</h3>
                    </div>
                    <Badge variant={item.isCorrect ? "default" : "destructive"} className={item.isCorrect ? "bg-green-600" : "bg-red-600"}>
                      {item.isCorrect ? "Correct (+2)" : item.selectedAnswer ? "Incorrect (-0.66)" : "Unattempted (0)"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Your Answer</span>
                      <span className={`font-bold ${item.isCorrect ? "text-green-700" : "text-red-700"}`}>
                        {item.selectedAnswer || "Not Answered"}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Correct Answer</span>
                      <span className="font-bold text-green-700">{item.correctAnswer}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4" /> Explanation
                    </h4>
                    <p className="text-blue-800 text-sm leading-relaxed whitespace-pre-wrap">
                      {item.explanation || "No explanation provided."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // Show test taking interface
  if (testSession) {
    const currentQuestion = testSession.questions[currentQuestionIndex];

    return (
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{testSession.subject} - {testSession.topic}</h1>
            <p className="text-gray-600">Difficulty: {testSession.difficulty} | Question {currentQuestionIndex + 1} of {testSession.totalQuestions}</p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-mono font-bold ${config?.timeLimits && testSession.totalQuestions &&
                config.timeLimits[testSession.totalQuestions] - timeSpent < 300
                ? "text-red-600 animate-pulse"
                : "text-blue-600"
              }`}>
              {config?.timeLimits && testSession.totalQuestions
                ? formatTime(Math.max(0, config.timeLimits[testSession.totalQuestions] - timeSpent))
                : formatTime(timeSpent)
              }
            </div>
            <div className="text-sm text-gray-600">Time Remaining</div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Object.keys(answers).length}/{testSession.totalQuestions} answered</span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
        </div>

        {/* Cost optimization indicator */}
        {testSession.cached && (
          <Alert className="mb-6">
            <DollarSign className="h-4 w-4" />
            <AlertDescription>
              💰 Cost optimized: This test was served from cache, saving {formatCost(testSession.aiCost)}!
            </AlertDescription>
          </Alert>
        )}

        {/* Question */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">{currentQuestion.question}</h2>

              <RadioGroup
                value={answers[currentQuestionIndex] || ''}
                onValueChange={(value) => handleAnswerSelect(currentQuestionIndex, value)}
                className="space-y-3"
              >
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>

              {currentQuestionIndex === testSession.totalQuestions - 1 ? (
                <Button
                  onClick={() => handleSubmitTest(false)}
                  disabled={Object.keys(answers).length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Submit Test
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Next
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question navigation */}
        <div className="grid grid-cols-10 gap-2">
          {testSession.questions.map((_, index) => (
            <Button
              key={index}
              variant={answers[index] ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentQuestionIndex(index)}
              className={`h-10 w-10 p-0 ${index === currentQuestionIndex ? 'ring-2 ring-blue-500' : ''}`}
            >
              {index + 1}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Show test generation interface
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">UPSC Prelims Test Generator</h1>
        <p className="text-gray-600">Generate cost-optimized MCQ tests from admin-uploaded notes</p>
      </div>

      {/* Cost Optimization Banner */}
      <Card className="mb-8 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-green-900">Cost Optimization Active</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-600" />
              <span>AI called only once per unique test configuration</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span>Same test served to multiple students</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span>Questions generated strictly from uploaded notes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Generate Your Prelims Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Subject Selection */}
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subj) => (
                    <SelectItem key={subj.subject} value={subj.subject}>
                      {subj.subject} ({subj.documentCount} docs)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Topic Selection */}
            <div>
              <Label htmlFor="topic">Topic *</Label>
              <Select
                value={selectedTopic}
                onValueChange={setSelectedTopic}
                disabled={!selectedSubject}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  {subjects
                    .find(s => s.subject === selectedSubject)
                    ?.topics.map((topic) => (
                      <SelectItem key={topic} value={topic}>
                        {topic}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty Selection */}
            <div>
              <Label htmlFor="difficulty">Difficulty *</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {config?.difficulties.map((diff) => (
                    <SelectItem key={diff} value={diff}>
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Question Count Selection */}
            <div>
              <Label htmlFor="questionCount">Questions *</Label>
              <Select value={questionCount.toString()} onValueChange={(value) => setQuestionCount(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select count" />
                </SelectTrigger>
                <SelectContent>
                  {config?.questionCounts.map((count) => (
                    <SelectItem key={count} value={count.toString()}>
                      {count} questions ({Math.floor((config.timeLimits[count] || 120) / 60)} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Test Configuration Summary */}
          {selectedSubject && selectedTopic && difficulty && questionCount && (
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">Test Configuration:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Subject:</span>
                    <div className="font-medium">{selectedSubject}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Topic:</span>
                    <div className="font-medium">{selectedTopic}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Difficulty:</span>
                    <div className="font-medium">{difficulty}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Questions:</span>
                    <div className="font-medium">{questionCount}</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Test Key: {selectedSubject.toLowerCase().replace(/\s+/g, '')}_{selectedTopic.toLowerCase().replace(/\s+/g, '')}_{difficulty}_{questionCount}
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handleGenerateTest}
            disabled={generating || !selectedSubject || !selectedTopic || !difficulty || !questionCount}
            className="w-full md:w-auto"
            size="lg"
          >
            {generating ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Generating Test...
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4 mr-2" />
                Generate Test
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PremilTestPage;