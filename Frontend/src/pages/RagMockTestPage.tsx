import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Brain, FileText, Target, Clock, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

interface Subject {
  name: string;
  topics: string[];
  totalChunks: number;
}

interface MockTest {
  _id: string;
  title: string;
  subject: string;
  topic: string;
  difficulty: string;
  totalQuestions: number;
  status: 'generating' | 'completed' | 'failed';
  questions?: Question[];
  createdAt: string;
}

interface Question {
  subject: string;
  topic: string;
  question: string;
  options: string[];
  correct_option: string;
  difficulty: string;
  explanation: string;
}

const SUBJECTS = [
  'History',
  'Geography',
  'Polity',
  'Economy',
  'Environment',
  'Science & Technology',
  'General Studies',
  'Current Affairs'
];

const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Easy', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'hard', label: 'Hard', color: 'bg-red-100 text-red-800' }
];

const RagMockTestPage: React.FC = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(20);
  const [generating, setGenerating] = useState(false);
  const [currentTest, setCurrentTest] = useState<MockTest | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSubjects();
    loadMockTests();
  }, []);

  const loadSubjects = async () => {
    try {
      const response = await api.get('/api/rag/subjects');
      setSubjects(response.data.subjects);
    } catch (error) {
      console.error('Failed to load subjects:', error);
    }
  };

  const loadMockTests = async () => {
    try {
      const response = await api.get('/api/rag/mock-tests');
      setMockTests(response.data.mockTests);
    } catch (error) {
      console.error('Failed to load mock tests:', error);
    }
  };

  const handleGenerateTest = async () => {
    if (!selectedSubject || !selectedTopic) {
      alert('Please select both subject and topic');
      return;
    }

    try {
      setGenerating(true);
      const response = await api.post('/api/rag/mock-tests/generate', {
        subject: selectedSubject,
        topic: selectedTopic,
        difficulty,
        questionCount
      });

      // Poll for test completion
      pollTestStatus(response.data.mockTestId);

    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to generate test');
      setGenerating(false);
    }
  };
  

  const pollTestStatus = async (testId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await api.get(`/api/rag/mock-tests/${testId}`);
        const test = response.data;

        if (test.status === 'completed') {
          clearInterval(pollInterval);
          setGenerating(false);
          setCurrentTest(test);
          setAnswers(new Array(test.questions.length).fill(''));
          loadMockTests();
        } else if (test.status === 'failed') {
          clearInterval(pollInterval);
          setGenerating(false);
          alert('Test generation failed. Please try again.');
        }
      } catch (error) {
        clearInterval(pollInterval);
        setGenerating(false);
        console.error('Failed to poll test status:', error);
      }
    }, 2000);

    // Timeout after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setGenerating(false);
      alert('Test generation timed out. Please try again.');
    }, 120000);
  };

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answer;
    setAnswers(newAnswers);
  };

  const handleSubmitTest = async () => {
    if (!currentTest) return;

    const unanswered = answers.filter(answer => !answer).length;
    if (unanswered > 0) {
      alert(`Please answer all questions. ${unanswered} questions remaining.`);
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(`/api/rag/mock-tests/${currentTest._id}/submit`, {
        answers
      });

      setResults(response.data);
      setShowResults(true);
    } catch (error) {
      console.error('Failed to submit test:', error);
    } finally {
      setLoading(false);
    }
  };

  const availableTopics = subjects.find(s => s.name === selectedSubject)?.topics || [];

  const renderTestGeneration = () => (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Generate Mock Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Subject *</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.name} value={subject.name}>
                    {subject.name} ({subject.totalChunks} chunks)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Topic *</Label>
            <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Select topic" />
              </SelectTrigger>
              <SelectContent>
                {availableTopics.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Number of Questions</Label>
            <Select value={questionCount.toString()} onValueChange={(value) => setQuestionCount(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 Questions</SelectItem>
                <SelectItem value="15">15 Questions</SelectItem>
                <SelectItem value="20">20 Questions</SelectItem>
                <SelectItem value="25">25 Questions</SelectItem>
                <SelectItem value="30">30 Questions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleGenerateTest}
          disabled={generating || !selectedSubject || !selectedTopic}
          className="w-full"
        >
          {generating ? 'Generating Test...' : 'Generate Mock Test'}
        </Button>

        {generating && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>AI is generating your personalized test...</span>
            </div>
            <Progress value={undefined} className="w-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderTestTaking = () => {
    if (!currentTest || !currentTest.questions) return null;

    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{currentTest.title}</span>
            <Badge className={DIFFICULTY_LEVELS.find(d => d.value === currentTest.difficulty)?.color}>
              {DIFFICULTY_LEVELS.find(d => d.value === currentTest.difficulty)?.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentTest.questions.map((question, index) => (
            <div key={index} className="border-b pb-6 last:border-b-0">
              <div className="flex items-start gap-2 mb-4">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                  Q{index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium mb-3">{question.question}</p>
                  <RadioGroup
                    value={answers[index]}
                    onValueChange={(value) => handleAnswerChange(index, value)}
                  >
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`q${index}-o${optionIndex}`} />
                        <Label htmlFor={`q${index}-o${optionIndex}`} className="text-sm">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-gray-600">
              Answered: {answers.filter(a => a).length} / {currentTest.questions.length}
            </div>
            <Button
              onClick={handleSubmitTest}
              disabled={loading || answers.filter(a => a).length !== currentTest.questions.length}
            >
              {loading ? 'Submitting...' : 'Submit Test'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderResults = () => {
    if (!results || !currentTest) return null;

    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Test Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-blue-600 mb-2">{results.score}%</div>
            <p className="text-gray-600">You scored {results.correct} out of {results.total} questions</p>
          </div>

          <div className="space-y-4">
            {results.results.map((result: any, index: number) => {
              const question = currentTest.questions[index];
              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {result.isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-semibold">Question {index + 1}</span>
                  </div>
                  <p className="mb-2">{question.question}</p>

                  <div className="space-y-1 text-sm">
                    <p><strong>Your answer:</strong> {result.userAnswer}</p>
                    <p className="text-green-600"><strong>Correct answer:</strong> {result.correctAnswer}</p>
                    {question.explanation && (
                      <p className="text-gray-600 mt-2"><strong>Explanation:</strong> {question.explanation}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center mt-6">
            <Button onClick={() => {
              setCurrentTest(null);
              setShowResults(false);
              setResults(null);
              setAnswers([]);
            }}>
              Generate New Test
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPreviousTests = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Previous Tests
        </CardTitle>
      </CardHeader>
      <CardContent>
        {mockTests.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No tests generated yet.</p>
        ) : (
          <div className="space-y-4">
            {mockTests.map((test) => (
              <div key={test._id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{test.title}</h3>
                  <div className="text-sm text-gray-600 space-x-2">
                    <span>{test.subject}</span>
                    <span>•</span>
                    <span>{test.topic}</span>
                    <span>•</span>
                    <Badge className={DIFFICULTY_LEVELS.find(d => d.value === test.difficulty)?.color}>
                      {test.difficulty}
                    </Badge>
                    <span>•</span>
                    <span>{test.totalQuestions} questions</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(test.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={test.status === 'completed' ? 'default' : 'secondary'}>
                  {test.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">RAG Mock Tests</h1>
        <p className="text-gray-600">Generate AI-powered UPSC Prelims mock tests from uploaded study materials</p>
      </div>

      {!showResults && !currentTest && renderTestGeneration()}
      {!showResults && currentTest && renderTestTaking()}
      {showResults && renderResults()}

      {!currentTest && !showResults && renderPreviousTests()}
    </div>
  );
};

export default RagMockTestPage;