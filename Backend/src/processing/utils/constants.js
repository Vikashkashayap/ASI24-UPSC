/** Shared constants for the Knowledge Processing Engine. */

export const QUEUE_NAMES = {
  UPLOAD: "upload-processing",
  OCR: "ocr-processing",
  PDF: "pdf-processing",
  QUESTION: "question-processing",
  METADATA: "metadata-processing",
  CHUNK: "chunk-processing",
  EMBEDDING: "embedding-processing",
  FAILED: "failed-processing",
  RETRY: "retry-processing",
};

export const PIPELINE_STAGES = [
  "Queued",
  "Downloading",
  "OCR",
  "Parsing",
  "Cleaning",
  "Detecting Sections",
  "Extracting Questions",
  "Chunking",
  "Metadata",
  "Completed",
  "Failed",
  "Retry",
];

export const STAGE_PROGRESS = {
  Queued: 5,
  Downloading: 12,
  OCR: 25,
  Parsing: 40,
  Cleaning: 50,
  "Detecting Sections": 60,
  "Extracting Questions": 72,
  Chunking: 85,
  Metadata: 92,
  Completed: 100,
  Failed: 0,
  Retry: 5,
};

export const SECTION_TYPES = [
  "title",
  "heading",
  "subheading",
  "paragraph",
  "question",
  "options",
  "answer",
  "explanation",
  "table",
  "image_reference",
  "footnote",
  "reference",
];

export const DOC_KINDS = ["notes", "pyq", "mixed", "unknown"];
