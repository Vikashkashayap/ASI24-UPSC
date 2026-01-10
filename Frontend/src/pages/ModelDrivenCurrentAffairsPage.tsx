import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { X } from 'lucide-react';
import {
  TrendingUp,
  Newspaper,
  BookOpen,
  Calendar,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  Brain,
  Shield,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';

interface ModelDrivenTopic {
  _id: string;
  topicTitle: string;
  category: string;
  gsPaperMapping: {
    primary: string;
    secondary: string[];
  };
  importanceScore: number;
  trendReasoning: string;
  tags: string[];
  generatedAt: string;
  lastUpdated: string;
  isModelDriven: boolean;
  ethicalValidation: {
    disclaimer: string;
  };
  analysis?: {
    whyInNews: string;
    background: string;
    gsPaperMapping: any;
    prelimsFacts: string[];
    mainsPoints: {
      introduction: string;
      body: {
        significance: string[];
        challenges: string[];
        criticism: string[];
        wayForward: string[];
      };
      conclusion: string;
    };
    probableQuestions: string[];
  };
}

interface ResearchRun {
  _id: string;
  runId: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  type: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  results: {
    topicsGenerated: number;
    topicsSaved: number;
    newTopics: number;
    updatedTopics: number;
  };
  progress: {
    totalSteps: number;
    completedSteps: number;
    percentage: number;
  };
}

interface ModelDrivenStats {
  totalTopics: number;
  recentTopics: number;
  averageImportanceScore: number;
  categoryDistribution: { [key: string]: number };
  topTopics: Array<{
    title: string;
    importanceScore: number;
    category: string;
  }>;
}

const ModelDrivenCurrentAffairsPage: React.FC = () => {
  const navigate = useNavigate();
  const [trendingTopics, setTrendingTopics] = useState<ModelDrivenTopic[]>([]);
  const [researchRuns, setResearchRuns] = useState<ResearchRun[]>([]);
  const [stats, setStats] = useState<ModelDrivenStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<ModelDrivenTopic | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [topicsRes, historyRes, statsRes] = await Promise.all([
        api.get('/api/model-driven/trending-topics?limit=20'),
        api.get('/api/model-driven/research-history?limit=10'),
        api.get('/api/model-driven/stats')
      ]);

      setTrendingTopics(topicsRes.data.data || []);
      setResearchRuns(historyRes.data.data || []);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Failed to fetch model-driven data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'running': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      case 'scheduled': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'running': return <Clock className="h-4 w-4 animate-spin" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      case 'scheduled': return <Clock className="h-4 w-4" />;
      default: return null;
    }
  };

  const getImportanceColor = (score: number) => {
    if (score >= 80) return 'bg-red-100 text-red-800';
    if (score >= 70) return 'bg-orange-100 text-orange-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
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

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Economy': return '💰';
      case 'Polity': return '🏛️';
      case 'IR': return '🌍';
      case 'Environment': return '🌱';
      case 'S&T': return '🔬';
      case 'Security': return '🛡️';
      case 'Society': return '👥';
      default: return '📋';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Ethical Disclaimer */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="h-8 w-8 text-blue-600" />
              Model-Driven Current Affairs
            </h1>
            <p className="text-gray-600 mt-2">
              AI-generated trending topics using analytical reasoning (updated daily at 7 AM IST)
            </p>
          </div>
          <Button onClick={fetchData} disabled={loading}>
            {loading ? <Clock className="h-4 w-4 animate-spin mr-2" /> : <TrendingUp className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>

        {/* Critical Ethical Disclaimer */}
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-blue-800">
            <strong>Important Disclaimer:</strong> These topics are AI-generated based on analytical reasoning and general knowledge.
            They do not represent real-time news, specific current events, or external data sources. Content focuses on conceptual trends
            and policy frameworks suitable for UPSC preparation.
          </AlertDescription>
        </Alert>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Topics</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTopics}</div>
              <p className="text-xs text-muted-foreground">
                {stats.recentTopics} in last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Importance</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageImportanceScore.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Out of 100
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(stats.categoryDistribution).length}</div>
              <p className="text-xs text-muted-foreground">
                Policy domains covered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Generation Type</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-blue-600">AI-Driven</div>
              <p className="text-xs text-muted-foreground">
                LLM-based reasoning
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Trending Topics</h2>
        <div className="text-sm text-gray-600">
          Click any topic to view detailed analysis
        </div>
      </div>

      {/* Topics Grid */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Trending Topics</h2>
            <div className="text-sm text-gray-600">
              Sorted by importance score
            </div>
          </div>

          {trendingTopics.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Topics Generated Yet</h3>
                <p className="text-gray-600 text-center mb-4">
                  Model-driven topics are generated daily at 7 AM IST. Check back later or contact admin if issues persist.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {trendingTopics.map((topic) => (
                <div key={topic._id}>
                  <Card
                    className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] border-l-4 border-l-blue-500"
                    onClick={() => {
                      setSelectedTopic(topic);
                    }}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2 hover:text-blue-600 transition-colors">
                            <span className="text-2xl">{getCategoryIcon(topic.category)}</span>
                            {topic.topicTitle}
                          </CardTitle>
                          <CardDescription className="mt-2 line-clamp-2">
                            {topic.trendReasoning}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={getImportanceColor(topic.importanceScore)}>
                            {topic.importanceScore}/100
                          </Badge>
                          <Badge variant="outline">
                            {topic.category}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-3">
                        {/* GS Paper Mapping */}
                        <div>
                          <div className="flex gap-2">
                            <Badge variant="secondary">{topic.gsPaperMapping.primary}</Badge>
                            {topic.gsPaperMapping.secondary.map((paper) => (
                              <Badge key={paper} variant="outline">{paper}</Badge>
                            ))}
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1">
                          {topic.tags.slice(0, 4).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {topic.tags.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{topic.tags.length - 4} more
                            </Badge>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between items-center pt-2 border-t">
                          <div className="text-sm text-gray-500">
                            Generated: {formatDate(topic.generatedAt)}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-blue-600 font-medium">
                            <BookOpen className="h-4 w-4" />
                            Click to read analysis
                            <ExternalLink className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

          )}
        </div>

      {/* Modal Dialog - positioned outside main container for proper overlay */}
      <Dialog
        open={!!selectedTopic}
        onOpenChange={(open) => {
          if (!open) setSelectedTopic(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTopic && (
            <>
              <DialogHeader className="relative">
                <DialogTitle className="flex items-center gap-3 text-xl pr-8">
                  <span className="text-3xl">{getCategoryIcon(selectedTopic.category)}</span>
                  {selectedTopic.topicTitle}
                  <Badge className={`${getImportanceColor(selectedTopic.importanceScore)} ml-2`}>
                    {selectedTopic.importanceScore}/100
                  </Badge>
                </DialogTitle>
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="absolute right-6 top-6 p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Ethical Disclaimer */}
                <Alert className="border-blue-200 bg-blue-50">
                  <Shield className="h-4 w-4" />
                  <AlertDescription className="text-blue-800">
                    <strong>AI-Generated Content:</strong> {selectedTopic.ethicalValidation?.disclaimer}
                  </AlertDescription>
                </Alert>

                {/* Quick Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Category</div>
                    <div className="font-medium">{selectedTopic.category}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">GS Papers</div>
                    <div className="font-medium">{selectedTopic.gsPaperMapping.primary}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Importance</div>
                    <div className="font-medium">{selectedTopic.importanceScore}/100</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Generated</div>
                    <div className="font-medium">{formatDate(selectedTopic.generatedAt)}</div>
                  </div>
                </div>

                {selectedTopic.analysis ? (
                  <div className="space-y-6">
                    {/* Why in News */}
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Newspaper className="h-5 w-5" />
                        Why in News
                      </h3>
                      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                        <p className="text-gray-700 leading-relaxed">{selectedTopic.analysis.whyInNews}</p>
                      </div>
                    </div>

                    {/* Background */}
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-gray-900">Background</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-700 leading-relaxed">{selectedTopic.analysis.background}</p>
                      </div>
                    </div>

                    {/* Prelims Facts */}
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Prelims Key Facts
                      </h3>
                      <div className="grid gap-2">
                        {selectedTopic.analysis.prelimsFacts.map((fact, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <span className="text-green-600 font-bold text-lg">{index + 1}.</span>
                            <span className="text-gray-700">{fact}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mains Analysis */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Mains Answer Structure
                      </h3>

                      {/* Introduction */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-lg text-green-700">Introduction</h4>
                        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                          <p className="text-gray-700 leading-relaxed">{selectedTopic.analysis.mainsPoints.introduction}</p>
                        </div>
                      </div>

                      {/* Significance */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-lg text-blue-700">Significance / Pros</h4>
                        <div className="space-y-2">
                          {selectedTopic.analysis.mainsPoints.body.significance.map((point, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                              <span className="text-blue-600 font-medium">•</span>
                              <span className="text-gray-700">{point}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Challenges */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-lg text-orange-700">Challenges / Cons</h4>
                        <div className="space-y-2">
                          {selectedTopic.analysis.mainsPoints.body.challenges.map((point, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                              <span className="text-orange-600 font-medium">•</span>
                              <span className="text-gray-700">{point}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Criticism */}
                      {selectedTopic.analysis.mainsPoints.body.criticism.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-lg text-red-700">Criticism</h4>
                          <div className="space-y-2">
                            {selectedTopic.analysis.mainsPoints.body.criticism.map((point, index) => (
                              <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                                <span className="text-red-600 font-medium">•</span>
                                <span className="text-gray-700">{point}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Way Forward */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-lg text-purple-700">Way Forward</h4>
                        <div className="space-y-2">
                          {selectedTopic.analysis.mainsPoints.body.wayForward.map((point, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                              <span className="text-purple-600 font-medium">•</span>
                              <span className="text-gray-700">{point}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Conclusion */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-lg text-green-700">Conclusion</h4>
                        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                          <p className="text-gray-700 leading-relaxed">{selectedTopic.analysis.mainsPoints.conclusion}</p>
                        </div>
                      </div>
                    </div>

                    {/* Probable Questions */}
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Probable UPSC Questions
                      </h3>
                      <div className="space-y-3">
                        {selectedTopic.analysis.probableQuestions.map((question, index) => (
                          <div key={index} className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                            <p className="text-gray-800 font-medium">{question}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Analysis not yet generated for this topic.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ModelDrivenCurrentAffairsPage;
