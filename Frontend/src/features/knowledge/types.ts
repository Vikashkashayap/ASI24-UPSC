export type ProcessingStatus =
  | "Pending"
  | "Queued"
  | "Uploading"
  | "Uploaded"
  | "Processing"
  | "Completed"
  | "Failed";

export type KnowledgeDocument = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  subjectId?: { _id: string; name: string; slug: string } | string | null;
  chapterId?: { _id: string; name: string; slug: string } | string | null;
  topicId?: { _id: string; name: string; slug: string } | string | null;
  categoryId?: { _id: string; name: string; slug: string; color?: string } | string | null;
  sourceId?: { _id: string; name: string; publication?: string } | string | null;
  tags?: string[];
  language?: string;
  year?: number | null;
  publication?: string;
  sourceLabel?: string;
  difficulty?: string;
  contentType?: "Static" | "Dynamic";
  priority?: string;
  status?: string;
  processingStatus: ProcessingStatus;
  processingError?: string | null;
  storageUrl?: string;
  storageKey?: string;
  thumbnail?: string;
  originalFileName?: string;
  fileSize?: number;
  mimeType?: string;
  extension?: string;
  checksum?: string;
  uploadedBy?: { _id: string; name: string; email?: string } | string | null;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type KbSubject = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  gsPaper?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type KbChapter = {
  _id: string;
  name: string;
  slug: string;
  subjectId: string;
  description?: string;
  sortOrder?: number;
};

export type KbTopic = {
  _id: string;
  name: string;
  slug: string;
  subjectId: string;
  chapterId: string;
  description?: string;
  sortOrder?: number;
};

export type KbCategory = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  isSystem?: boolean;
};

export type KnowledgeDashboard = {
  totalDocuments: number;
  totalPdfs: number;
  totalNotes: number;
  totalPyqs: number;
  processingDocuments: number;
  completedDocuments: number;
  failedDocuments: number;
  pendingDocuments: number;
  storageUsed: number;
  recentUploads: KnowledgeDocument[];
  s3?: {
    ok?: boolean;
    configured?: boolean;
    bucket?: string;
    region?: string;
    message?: string;
  };
};

export type KnowledgeListResponse = {
  items: KnowledgeDocument[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type UploadMetadata = {
  title?: string;
  description?: string;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  categoryId?: string;
  source?: string;
  publication?: string;
  year?: number | "";
  language?: string;
  tags?: string;
  difficulty?: string;
  contentType?: "Static" | "Dynamic";
  priority?: string;
};

export type UploadQueueItem = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "paused" | "uploaded" | "failed" | "cancelled";
  error?: string;
  abortController?: AbortController;
};
