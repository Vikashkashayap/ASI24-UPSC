import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import {
  TrendingUp,
  Newspaper,
  BookOpen,
  Calendar,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { api } from '../services/api';

interface TrendingTopic {
  _id: string;
  topic: string;
  frequency: number;
  relevanceScore: number;
  category: string;
  gsPapers: string[];
  sourceCount: number;
  firstDetected: string;
  lastUpdated: string;
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
    topicsFound: number;
    topicsProcessed: number;
    topicsUpdated: number;
    newTopics: number;
  };
  progress: {
    totalSteps: number;
    completedSteps: number;
    percentage: number;
  };
}

interface ResearchStats {
  topics: {
    totalTopics: number;
    activeTopics: number;
    avgRelevanceScore: number;
    avgFrequency: number;
    categories: string[];
  };
  researchRuns: { [key: string]: number };
  recentActivity: {
    runsLast30Days: number;
    topicsLast30Days: number;
  };
}

const CurrentAffairsDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [researchRuns, setResearchRuns] = useState<ResearchRun[]>([]);
  const [stats, setStats] = useState<ResearchStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('topics');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [topicsRes, historyRes, statsRes] = await Promise.all([
        api.get('/api/current-affairs/topics?limit=20'),
        api.get('/api/current-affairs/history?limit=10'),
        api.get('/api/current-affairs/stats')
      ]);

      setTrendingTopics(topicsRes.data.data || []);
      setResearchRuns(historyRes.data.data || []);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Daily Current Affairs</h1>
          <p className="text-gray-600 mt-2">
            AI-powered trending topic detection and UPSC-structured analysis (updated daily at 6 AM)
          </p>
        </div>
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
              <div className="text-2xl font-bold">{stats.topics.totalTopics}</div>
              <p className="text-xs text-muted-foreground">
                {stats.topics.activeTopics} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Relevance</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(stats.topics.avgRelevanceScore)}
              </div>
              <p className="text-xs text-muted-foreground">out of 100</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Runs</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.recentActivity.runsLast30Days}
              </div>
              <p className="text-xs text-muted-foreground">last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Topics</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.recentActivity.topicsLast30Days}
              </div>
              <p className="text-xs text-muted-foreground">last 30 days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('topics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'topics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Trending Topics
            </button>
            <button
              onClick={() => setActiveTab('research')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'research'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Research Runs
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sources'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              News Sources
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'topics' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading trending topics...</div>
            ) : trendingTopics.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No trending topics found. Research runs daily at 6 AM.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4">
                {trendingTopics.map((topic) => (
                  <Card
                    key={topic._id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/current-affairs/${topic._id}`)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-lg hover:text-blue-600 transition-colors">{topic.topic}</CardTitle>
                          <CardDescription className="flex items-center gap-4">
                            <span>Category: {topic.category}</span>
                            <span>Sources: {topic.sourceCount}</span>
                            <span>Frequency: {topic.frequency}</span>
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            Relevance: {topic.relevanceScore}
                          </Badge>
                          {topic.gsPapers.map((paper) => (
                            <Badge key={paper} variant="secondary">{paper}</Badge>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>First detected: {formatDate(topic.firstDetected)}</span>
                        <span>Last updated: {formatDate(topic.lastUpdated)}</span>
                      </div>
                      <div className="mt-3 text-sm text-blue-600 font-medium">
                        Click to read detailed analysis →
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'research' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading research history...</div>
            ) : researchRuns.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No research runs found. Research runs automatically daily at 6 AM.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4">
                {researchRuns.map((run) => (
                  <Card key={run._id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center gap-2">
                            {getStatusIcon(run.status)}
                            <span className={getStatusColor(run.status)}>
                              Research Run {run.runId.slice(-8)}
                            </span>
                          </CardTitle>
                          <CardDescription>
                            Type: {run.type} • Started: {formatDate(run.startTime)}
                            {run.endTime && ` • Duration: ${formatDuration(run.duration || 0)}`}
                          </CardDescription>
                        </div>
                        <Badge variant={run.status === 'completed' ? 'default' : 'secondary'}>
                          {run.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {run.status === 'running' && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{run.progress.percentage}%</span>
                            </div>
                            <Progress value={run.progress.percentage} />
                          </div>
                        )}

                        {run.results && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Topics Found:</span> {run.results.topicsFound}
                            </div>
                            <div>
                              <span className="font-medium">Processed:</span> {run.results.topicsProcessed}
                            </div>
                            <div>
                              <span className="font-medium">Updated:</span> {run.results.topicsUpdated}
                            </div>
                            <div>
                              <span className="font-medium">New:</span> {run.results.newTopics}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="space-y-4">
            <Alert>
              <Newspaper className="h-4 w-4" />
              <AlertDescription>
                News sources management will be available here. Configure API keys and reliability settings.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentAffairsDashboardPage;
