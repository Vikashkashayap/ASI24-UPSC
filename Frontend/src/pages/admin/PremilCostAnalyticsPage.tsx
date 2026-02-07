import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  FileText,
  Zap,
  Target,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

interface CostStats {
  questions: {
    totalQuestions: number;
    totalCost: number;
    uniqueTestKeys: string[];
    avgCostPerQuestion: number;
    subjects: string[];
  };
  sessions: {
    totalSessions: number;
    cachedSessions: number;
    totalAiCost: number;
    avgScore: number;
  };
  documents: {
    totalDocuments: number;
    totalChunks: number;
  };
}

const PremilCostAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<CostStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/premil/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCost = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const calculateSavings = () => {
    if (!stats) return 0;
    const totalSessions = stats.sessions.totalSessions;
    const cachedSessions = stats.sessions.cachedSessions;
    const costPerNewTest = stats.questions.avgCostPerQuestion * 20; // Assuming 20 questions per test
    const potentialCost = totalSessions * costPerNewTest;
    const actualCost = stats.sessions.totalAiCost;
    return potentialCost - actualCost;
  };

  const getEfficiencyPercentage = () => {
    if (!stats || stats.sessions.totalSessions === 0) return 0;
    return Math.round((stats.sessions.cachedSessions / stats.sessions.totalSessions) * 100);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Loading cost analytics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8 text-gray-500">
          Failed to load analytics data
        </div>
      </div>
    );
  }

  const savings = calculateSavings();
  const efficiency = getEfficiencyPercentage();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Cost Optimization Analytics</h1>
            <p className="text-gray-600">Monitor AI cost savings and system efficiency</p>
          </div>
          <Button onClick={loadStats} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-6 w-6 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total AI Cost</p>
                <p className="text-2xl font-bold text-green-600">{formatCost(stats.sessions.totalAiCost)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Actual AI API costs incurred</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Cost Saved</p>
                <p className="text-2xl font-bold text-blue-600">{formatCost(savings)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Potential vs actual costs</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-6 w-6 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Cache Efficiency</p>
                <p className="text-2xl font-bold text-purple-600">{efficiency}%</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Tests served from cache</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-6 w-6 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Score</p>
                <p className="text-2xl font-bold text-orange-600">{stats.sessions.avgScore.toFixed(1)}%</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Student performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Questions Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Questions Database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Questions</p>
                <p className="text-2xl font-bold">{stats.questions.totalQuestions.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Unique Test Keys</p>
                <p className="text-2xl font-bold">{stats.questions.uniqueTestKeys.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Cost/Question</p>
                <p className="text-lg font-semibold">{formatCost(stats.questions.avgCostPerQuestion)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total AI Cost</p>
                <p className="text-lg font-semibold">{formatCost(stats.questions.totalCost)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Subjects Covered</p>
              <div className="flex flex-wrap gap-1">
                {stats.questions.subjects.slice(0, 6).map((subject) => (
                  <Badge key={subject} variant="secondary" className="text-xs">
                    {subject}
                  </Badge>
                ))}
                {stats.questions.subjects.length > 6 && (
                  <Badge variant="outline" className="text-xs">
                    +{stats.questions.subjects.length - 6} more
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold">{stats.sessions.totalSessions.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cached Sessions</p>
                <p className="text-2xl font-bold text-green-600">{stats.sessions.cachedSessions.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">New AI Calls</p>
                <p className="text-2xl font-bold text-orange-600">
                  {(stats.sessions.totalSessions - stats.sessions.cachedSessions).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Performance</p>
                <p className="text-2xl font-bold">{stats.sessions.avgScore.toFixed(1)}%</p>
              </div>
            </div>

            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                <strong>Cost Efficiency:</strong> {efficiency}% of tests served from cache,
                saving {formatCost(savings)} compared to generating each test individually.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Documents Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Processing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.documents.totalDocuments}</p>
              <p className="text-sm text-gray-600">Documents Uploaded</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{stats.documents.totalChunks.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Chunks Generated</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {stats.documents.totalDocuments > 0 ? Math.round(stats.documents.totalChunks / stats.documents.totalDocuments) : 0}
              </p>
              <p className="text-sm text-gray-600">Avg Chunks/Doc</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Optimization Explanation */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How Cost Optimization Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-green-700 mb-2">✅ Cost Saving Features</h4>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• AI called only once per unique test configuration</li>
                <li>• Questions cached and reused for identical test requests</li>
                <li>• Strict source control ensures questions from admin notes only</li>
                <li>• Randomization maintains test freshness for students</li>
                <li>• Chunked document processing for efficient retrieval</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-700 mb-2">📊 Key Metrics Tracked</h4>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• Cache hit ratio (percentage of tests served from cache)</li>
                <li>• Total AI API costs vs potential costs</li>
                <li>• Cost per question and per test</li>
                <li>• Student performance analytics</li>
                <li>• Document processing efficiency</li>
              </ul>
            </div>
          </div>

          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              <strong>Scalability:</strong> As more students take tests, the cache hit ratio increases,
              driving down costs per test while maintaining consistent quality and source accuracy.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default PremilCostAnalyticsPage;