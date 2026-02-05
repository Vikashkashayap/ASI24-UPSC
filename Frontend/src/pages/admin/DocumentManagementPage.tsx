import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Upload, FileText, Trash2, Eye, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

interface Document {
  _id: string;
  filename: string;
  originalName: string;
  documentType: 'notes' | 'pyq' | 'current_affairs' | 'reference_material';
  subject: string;
  topic: string;
  fileSize: number;
  totalPages: number;
  totalChunks: number;
  processingStatus: 'uploaded' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  createdAt: string;
}

interface UploadStats {
  totalDocuments: number;
  totalPages: number;
  totalChunks: number;
  completedDocuments: number;
  failedDocuments: number;
}

const DOCUMENT_TYPES = [
  { value: 'notes', label: 'Notes' },
  { value: 'pyq', label: 'Previous Year Questions (PYQ)' },
  { value: 'current_affairs', label: 'Current Affairs' },
  { value: 'reference_material', label: 'Reference Material' }
];

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

const DocumentManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('notes');
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
      const response = await api.get('/api/rag/documents');
      setDocuments(response.data.documents);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/api/rag/documents/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setUploadError('Only PDF files are allowed');
        return;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB
        setUploadError('File size must be less than 50MB');
        return;
      }
      setSelectedFile(file);
      setUploadError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType || !subject || !topic) {
      setUploadError('Please fill all required fields');
      return;
    }

    try {
      setUploading(true);
      setUploadError('');
      setUploadMessage('');

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', documentType);
      formData.append('subject', subject);
      formData.append('topic', topic);

      const response = await api.post('/api/rag/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadMessage('Document uploaded successfully! Processing has started.');
      setSelectedFile(null);
      setDocumentType('notes');
      setSubject('');
      setTopic('');
      (document.getElementById('file-input') as HTMLInputElement).value = '';

      // Reload documents and stats
      loadDocuments();
      loadStats();

    } catch (error: any) {
      setUploadError(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await api.delete(`/api/rag/documents/${documentId}`);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      uploaded: 'bg-gray-100 text-gray-800'
    };
    return variants[status as keyof typeof variants] || variants.uploaded;
  };

  const getDocumentTypeBadge = (type: string) => {
    const variants = {
      notes: 'bg-purple-100 text-purple-800',
      pyq: 'bg-orange-100 text-orange-800',
      current_affairs: 'bg-blue-100 text-blue-800',
      reference_material: 'bg-gray-100 text-gray-800'
    };
    const labels = {
      notes: 'Notes',
      pyq: 'PYQ',
      current_affairs: 'Current Affairs',
      reference_material: 'Reference'
    };
    return { variant: variants[type as keyof typeof variants] || variants.notes, label: labels[type as keyof typeof labels] || 'Notes' };
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Document Management</h1>
        <p className="text-gray-600">Upload and manage PDF documents for RAG-based mock test generation</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.totalDocuments}</div>
              <div className="text-sm text-gray-600">Total Documents</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.completedDocuments}</div>
              <div className="text-sm text-gray-600">Processed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.totalPages}</div>
              <div className="text-sm text-gray-600">Total Pages</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.totalChunks}</div>
              <div className="text-sm text-gray-600">Vector Chunks</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload New Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="file-input">PDF File *</Label>
              <Input
                id="file-input"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {selectedFile && (
                <p className="text-sm text-gray-600 mt-1">
                  {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="document-type">Document Type *</Label>
              <Select value={documentType} onValueChange={setDocumentType} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="topic">Topic *</Label>
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

          <Button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !documentType || !subject || !topic}
            className="w-full md:w-auto"
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Uploaded Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No documents uploaded yet. Upload your first PDF to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(doc.processingStatus)}
                      <h3 className="font-semibold">{doc.originalName}</h3>
                      <Badge className={getStatusBadge(doc.processingStatus)}>
                        {doc.processingStatus}
                      </Badge>
                      <Badge className={getDocumentTypeBadge(doc.documentType).variant}>
                        {getDocumentTypeBadge(doc.documentType).label}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Type:</strong> {getDocumentTypeBadge(doc.documentType).label}</p>
                      <p><strong>Subject:</strong> {doc.subject}</p>
                      <p><strong>Topic:</strong> {doc.topic}</p>
                      <p><strong>Size:</strong> {formatFileSize(doc.fileSize)}</p>
                      <p><strong>Pages:</strong> {doc.totalPages || 'Processing...'}</p>
                      <p><strong>Chunks:</strong> {doc.totalChunks || 'Processing...'}</p>
                      <p><strong>Uploaded:</strong> {new Date(doc.createdAt).toLocaleDateString()}</p>
                      {doc.processingError && (
                        <p className="text-red-600"><strong>Error:</strong> {doc.processingError}</p>
                      )}
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

export default DocumentManagementPage;