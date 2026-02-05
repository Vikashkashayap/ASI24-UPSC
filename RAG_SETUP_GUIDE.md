# RAG System Setup Guide

## 🎯 Pure RAG Implementation (No External AI)

Your RAG system now generates questions directly from your uploaded documents without using external AI models. This ensures questions come purely from your content.

### Current Setup:

1. **Upload Documents** → PDFs are processed and stored in MongoDB + Vector DB
2. **RAG Retrieval** → Relevant chunks retrieved using semantic search
3. **Question Generation** → Questions created directly from retrieved content
4. **No External AI** → Pure rule-based extraction from your documents

## 🔧 Environment Setup

### 1. Required Environment Variables

Update your `Backend/.env` file:

```env
# Database
DATABASE_URL=mongodb+srv://vikashkashyap756_db_user:IMk69ghfCL9u2DUX@cluster0.m4mp4qp.mongodb.net/asi24?retryWrites=true&w=majority

# RAG Configuration
OPENAI_API_KEY=your_actual_openai_api_key_here  # Required for embeddings
CHROMA_DB_URL=http://localhost:8000

# Control RAG behavior
USE_EXTERNAL_LLM=false  # Set to false for pure RAG (no AI generation)

# Other settings
JWT_SECRET=mysupersecretkey123!@#
CLIENT_ORIGIN=http://localhost:5173
```

### 2. Install and Start ChromaDB

```bash
# Install ChromaDB
pip install chromadb

# Start ChromaDB server
chroma run --host localhost --port 8000
```

### 3. Start the Application

```bash
# Terminal 1: Backend
cd Backend
npm run dev

# Terminal 2: Frontend
cd Frontend
npm run dev
```

## 📚 How Pure RAG Works

### 1. Document Upload Process:
```
PDF Upload → Text Extraction → Chunking (1500 chars) → Vector Embeddings → ChromaDB Storage
```

### 2. Question Generation Process:
```
User Request → Semantic Search → Retrieve Chunks → Extract Facts → Generate Questions → MongoDB Storage
```

### 3. Question Types Generated:

- **Constitution Questions**: Article-based questions
- **Historical Questions**: Year/date-based questions
- **Geographical Questions**: Location/data-based questions
- **General Knowledge**: Factual statement questions
- **True/False**: Binary choice questions

## 🧪 Testing the RAG System

### Step 1: Upload Documents
1. Go to Admin Panel → Document Management
2. Upload PDF files with proper Subject/Topic categorization
3. Wait for processing to complete (check status in document list)

### Step 2: Generate Mock Test
1. Go to RAG Mock Test page
2. Select Subject and Topic (must match uploaded documents)
3. Choose difficulty and question count
4. Click "Generate Test"
5. Questions will be generated from your uploaded content only

### Step 3: Verify RAG Working
- Check browser console for "RAG-based mock test generation" logs
- Verify questions contain information from your uploaded PDFs
- Check generation method shows "Pure-RAG-from-uploaded-content"

## 🔍 System Architecture

### Database Schema:
```javascript
// Documents Collection
{
  filename: String,
  originalName: String,
  subject: String,
  topic: String,
  documentType: 'notes' | 'pyq' | 'current_affairs' | 'reference_material',
  processingStatus: 'uploaded' | 'processing' | 'completed' | 'failed',
  totalPages: Number,
  totalChunks: Number
}

// Chunks Collection (for retrieval)
{
  documentId: ObjectId,
  text: String,
  vectorId: String, // ChromaDB reference
  metadata: {
    subject: String,
    topic: String,
    keywords: [String]
  }
}

// Mock Tests Collection
{
  title: String,
  subject: String,
  topic: String,
  questions: [{
    question: String,
    options: [String],
    correctAnswer: Number,
    explanation: String,
    sourceChunks: [Object] // References to source content
  }],
  generationParams: {
    method: 'Pure-RAG-from-uploaded-content',
    retrievedChunks: Number
  }
}
```

## 🚀 API Endpoints

### Document Management:
```http
POST   /api/rag/documents/upload     # Upload & process PDF
GET    /api/rag/documents           # List processed documents
DELETE /api/rag/documents/:id       # Delete document & chunks
GET    /api/rag/documents/stats     # Processing statistics
```

### Mock Test Generation:
```http
POST   /api/rag/mock-tests/generate  # Generate test from uploaded content
GET    /api/rag/mock-tests          # List generated tests
GET    /api/rag/mock-tests/:id      # Get specific test
POST   /api/rag/mock-tests/:id/submit # Submit answers
GET    /api/rag/subjects            # Get available subjects/topics
```

## 🎯 Key Features

✅ **Pure RAG**: Questions generated only from uploaded documents
✅ **No External AI**: Rule-based question extraction
✅ **Semantic Search**: Vector similarity for relevant content retrieval
✅ **Multi-format Support**: Notes, PYQ, Current Affairs, Reference Material
✅ **Real-time Processing**: Async document processing
✅ **Quality Assurance**: Factual accuracy from source material

## 🔧 Troubleshooting

### Issue: ChromaDB Connection Failed
```
Solution: Make sure ChromaDB is running on localhost:8000
Command: chroma run --host localhost --port 8000
```

### Issue: No Questions Generated
```
Check:
1. Documents uploaded and processed (status: 'completed')
2. Subject/Topic matches uploaded content
3. ChromaDB has embeddings stored
4. Check server logs for retrieval errors
```

### Issue: Questions Not Relevant
```
Solution:
1. Ensure uploaded PDFs contain factual information
2. Check chunking quality (1500 char chunks)
3. Verify subject/topic categorization
4. Review vector embeddings quality
```

## 📈 Performance Optimization

- **Chunk Size**: 1500 characters (optimal for UPSC content)
- **Overlap**: 200 characters for context preservation
- **Embedding Model**: text-embedding-3-small (cost-effective)
- **Similarity Threshold**: 0.75 minimum score for retrieval
- **Diversification**: Ensures question variety from different chunks

---

**🎉 Your RAG system is now ready to generate questions purely from your uploaded study materials!**