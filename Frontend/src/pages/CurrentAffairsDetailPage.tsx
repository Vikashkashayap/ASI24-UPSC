import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Separator } from '../components/ui/separator';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Newspaper,
  Target,
  FileText,
  Lightbulb,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';

interface TopicAnalysis {
  topic: string;
  metadata: {
    category: string;
    gsPapers: string[];
    relevanceScore: number;
    frequency: number;
    sourceCount: number;
    firstDetected: string;
    lastUpdated: string;
    generatedAt: string;
  };
  sources: Array<{
    name: string;
    url: string;
    publishDate: string;
    snippet: string;
  }>;
  analysis: {
    whyInNews: string;
    background: string;
    gsPaperMapping: {
      primary: string;
      secondary: string[];
      reasoning: string;
    };
    prelimsFacts: string[];
    mainsPoints: {
      introduction: string;
      body: {
        pros: string[];
        cons: string[];
        challenges: string[];
        wayForward: string[];
      };
      conclusion: string;
    };
    probableQuestions: {
      prelims: string[];
      mains: string[];
    };
  };
}

const CurrentAffairsDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [topicData, setTopicData] = useState<TopicAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchTopicDetails(id);
    }
  }, [id]);

  const fetchTopicDetails = async (topicId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/current-affairs/topics/${topicId}`);

      if (response.data.success) {
        setTopicData(response.data.data);
      } else {
        setError('Failed to load topic details');
      }
    } catch (err) {
      console.error('Error fetching topic details:', err);
      setError('Failed to load topic details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading topic analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !topicData) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Topic not found'}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/current-affairs')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Current Affairs
        </Button>
      </div>
    );
  }

  const { topic, metadata, sources, analysis } = topicData;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button onClick={() => navigate('/current-affairs')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Current Affairs
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Relevance: {metadata.relevanceScore}
          </Badge>
          <Badge variant="secondary">{metadata.category}</Badge>
        </div>
      </div>

      {/* Topic Title */}
      <div className="text-center py-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{topic}</h1>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            First detected: {formatDate(metadata.firstDetected)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Last updated: {formatDate(metadata.lastUpdated)}
          </span>
          <span className="flex items-center gap-1">
            <Newspaper className="h-4 w-4" />
            {metadata.sourceCount} sources
          </span>
        </div>
        <div className="flex items-center justify-center gap-2 mt-4">
          {metadata.gsPapers.map((paper) => (
            <Badge key={paper} variant="outline" className="bg-blue-50 text-blue-700">
              {paper}
            </Badge>
          ))}
        </div>
      </div>

      {/* Why in News */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Why in News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">{analysis.whyInNews}</p>
        </CardContent>
      </Card>

      {/* Background */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            Background & Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">{analysis.background}</p>
        </CardContent>
      </Card>

      {/* GS Paper Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-500" />
            UPSC GS Paper Mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-green-700 mb-2">Primary Paper: {analysis.gsPaperMapping.primary}</h4>
            {analysis.gsPaperMapping.secondary.length > 0 && (
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">Secondary Papers:</h4>
                <div className="flex gap-2">
                  {analysis.gsPaperMapping.secondary.map((paper) => (
                    <Badge key={paper} variant="outline">{paper}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold mb-2">Reasoning:</h4>
            <p className="text-gray-700">{analysis.gsPaperMapping.reasoning}</p>
          </div>
        </CardContent>
      </Card>

      {/* Prelims Facts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Key Facts for Prelims
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.prelimsFacts.map((fact, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-800 flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <p className="text-gray-700">{fact}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mains Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-500" />
            Mains Answer Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Introduction */}
          <div>
            <h4 className="font-semibold text-lg mb-3 text-purple-700">Introduction</h4>
            <p className="text-gray-700 leading-relaxed">{analysis.mainsPoints.introduction}</p>
          </div>

          <Separator />

          {/* Body */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pros */}
            <div>
              <h4 className="font-semibold mb-3 text-green-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Positive Aspects
              </h4>
              <ul className="space-y-2">
                {analysis.mainsPoints.body.pros.map((pro, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div>
              <h4 className="font-semibold mb-3 text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Challenges & Limitations
              </h4>
              <ul className="space-y-2">
                {analysis.mainsPoints.body.cons.map((con, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Additional Challenges */}
          <div>
            <h4 className="font-semibold mb-3 text-orange-700">Key Challenges</h4>
            <ul className="space-y-2">
              {analysis.mainsPoints.body.challenges.map((challenge, index) => (
                <li key={index} className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{challenge}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Way Forward */}
          <div>
            <h4 className="font-semibold mb-3 text-blue-700">Way Forward</h4>
            <ul className="space-y-2">
              {analysis.mainsPoints.body.wayForward.map((solution, index) => (
                <li key={index} className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{solution}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Conclusion */}
          <div>
            <h4 className="font-semibold text-lg mb-3 text-purple-700">Conclusion</h4>
            <p className="text-gray-700 leading-relaxed">{analysis.mainsPoints.conclusion}</p>
          </div>
        </CardContent>
      </Card>

      {/* Probable Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-500" />
            Probable Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prelims Questions */}
          <div>
            <h4 className="font-semibold mb-3 text-indigo-700">Prelims Questions</h4>
            <div className="space-y-3">
              {analysis.probableQuestions.prelims.map((question, index) => (
                <div key={index} className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-500">
                  <p className="text-gray-800 font-medium">{question}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mains Questions */}
          <div>
            <h4 className="font-semibold mb-3 text-purple-700">Mains Questions</h4>
            <div className="space-y-3">
              {analysis.probableQuestions.mains.map((question, index) => (
                <div key={index} className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                  <p className="text-gray-800 font-medium">{question}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sources */}
      {sources && sources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-gray-500" />
              Source Articles ({sources.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sources.map((source, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">{source.name}</h4>
                      <p className="text-gray-700 mb-2">{source.snippet}</p>
                      <p className="text-sm text-gray-500">
                        Published: {formatDate(source.publishDate)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(source.url, '_blank')}
                      className="ml-4"
                    >
                      Read More
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CurrentAffairsDetailPage;
