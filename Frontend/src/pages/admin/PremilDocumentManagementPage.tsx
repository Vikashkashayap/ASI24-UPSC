import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Upload, FileText, Trash2, Eye, AlertCircle, CheckCircle, Clock, DollarSign, BarChart3 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

interface PremilDocument {
  _id: string;
  filename: string;
  subject: string;
  topic: string;
  fileSize: number;
  uploadedBy: {
    name: string;
    email: string;
  } | null;
  createdAt: string;
}

interface PremilStats {
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

const PremilDocumentManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<PremilDocument[]>([]);
  const [stats, setStats] = useState<PremilStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    loadDocuments();
    loadStats();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/premil/admin/documents');
      setDocuments(response.data.documents);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/api/premil/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Invalid file type. Only PDF, TXT, DOC, and DOCX files are allowed.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        setUploadError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setUploadError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !subject || !topic) {
      setUploadError('Please fill all required fields');
      return;
    }

    try {
      setUploading(true);
      setUploadError('');
      setUploadMessage('');

      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('subject', subject);
      formData.append('topic', topic);

      const response = await api.post('/api/premil/admin/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadMessage(`Document uploaded successfully! ${response.data.chunksCreated} chunks created, ${response.data.embeddingsGenerated} embeddings generated.`);

      // Reset form
      setSelectedFile(null);
      setSubject('');
      setTopic('');
      (document.getElementById('premil-file-input') as HTMLInputElement).value = '';

      // Reload data
      loadDocuments();
      loadStats();

    } catch (error: any) {
      setUploadError(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This will affect all questions generated from it.')) return;

    try {
      // Note: Delete endpoint might not exist yet, adjust as needed
      await api.delete(`/api/premil/admin/documents/${documentId}`);
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatCost = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">UPSC Prelims Document Management</h1>
        <p className="text-gray-600">Upload subject-wise notes for cost-optimized MCQ generation</p>
      </div>

      {/* Cost Optimization Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">AI Cost Saved</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCost(stats.questions.totalCost)}
              </div>
              <div className="text-xs text-gray-500">
                {stats.sessions.cachedSessions}/{stats.sessions.totalSessions} cached tests
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">Unique Tests</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.questions.uniqueTestKeys.length}
              </div>
              <div className="text-xs text-gray-500">
                Test configurations
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium">Total Questions</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.questions.totalQuestions}
              </div>
              <div className="text-xs text-gray-500">
                Avg cost: {formatCost(stats.questions.avgCostPerQuestion)}/question
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium">Avg Score</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {stats.sessions.avgScore.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                Student performance
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Prelims Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="premil-file-input">Document File *</Label>
              <Input
                id="premil-file-input"
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {selectedFile && (
                <p className="text-sm text-gray-600 mt-1">
                  {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Supported: PDF, TXT, DOC, DOCX (max 10MB)
              </p>
            </div>

            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Select value={subject} onValueChange={setSubject} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((subj) => (
                    <SelectItem key={subj} value={subj}>
                      {subj}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="topic">Topic/Subtopic *</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Ancient History, Indian Constitution"
                disabled={uploading}
              />
            </div>
          </div>

          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {uploadMessage && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{uploadMessage}</AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Cost Optimization Features:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Documents are split into 300-500 word chunks</li>
              <li>• Embeddings generated for efficient retrieval</li>
              <li>• Questions generated once per unique test configuration</li>
              <li>• Same test served to multiple students (cost-free)</li>
            </ul>
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !subject || !topic}
            className="w-full md:w-auto"
          >
            {uploading ? 'Processing Document...' : 'Upload & Process Document'}
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Uploaded Prelims Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No prelims documents uploaded yet. Upload subject-wise notes to enable cost-optimized MCQ generation.
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <h3 className="font-semibold">{doc.filename}</h3>
                      <Badge className="bg-green-100 text-green-800">
                        Processed
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Subject:</strong> {doc.subject}</p>
                      <p><strong>Topic:</strong> {doc.topic}</p>
                      <p><strong>Size:</strong> {formatFileSize(doc.fileSize)}</p>
                      <p><strong>Uploaded:</strong> {new Date(doc.createdAt).toLocaleDateString()}</p>
                      <p><strong>By:</strong> {doc.uploadedBy ? `${doc.uploadedBy.name} (${doc.uploadedBy.email})` : 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(doc._id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PremilDocumentManagementPage;