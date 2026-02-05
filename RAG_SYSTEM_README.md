# RAG-Based UPSC Prelims Mock Test Generator

## Overview

This system implements a Retrieval-Augmented Generation (RAG) pipeline for generating UPSC Prelims-style mock tests from uploaded study materials. The system ensures that all questions are generated strictly from the provided content, maintaining UPSC-level ambiguity and quality.

## Architecture

### Backend (Node.js + Express)
- **Database**: MongoDB for metadata storage
- **Vector Database**: ChromaDB for embeddings
- **LLM**: OpenAI GPT-4o-mini via OpenRouter
- **Text Processing**: LangChain for chunking and embeddings

### Frontend (React + TypeScript)
- **UI Framework**: React with Tailwind CSS
- **Components**: Shadcn/ui component library
- **State Management**: React hooks

## Key Components

### 1. Document Processing Pipeline
- **PDF Upload**: Multer for file handling
- **Text Extraction**: pdf-parse library
- **Text Chunking**: LangChain RecursiveCharacterTextSplitter (300-500 words)
- **Embeddings**: OpenAI text-embedding-3-small
- **Vector Storage**: ChromaDB with metadata

### 2. RAG Pipeline
- **Retrieval**: Semantic search with relevance scoring
- **Generation**: GPT-4o-mini with strict UPSC-style prompts
- **Validation**: Automated quality checks for question format
- **Deduplication**: Keyword overlap analysis to ensure diversity

### 3. Question Generation Rules
- **Source Material Only**: Questions generated exclusively from uploaded content
- **UPSC Standards**: Maintains ambiguity, elimination-friendly options
- **Single Correct Answer**: One definitive correct option per question
- **Structured Output**: Consistent JSON format with metadata

## API Endpoints

### Document Management (Admin Only)
```http
POST   /api/rag/documents/upload     # Upload PDF
GET    /api/rag/documents           # List documents
GET    /api/rag/documents/:id       # Get document details
DELETE /api/rag/documents/:id       # Delete document
GET    /api/rag/documents/stats     # Processing statistics
```

### Mock Test Generation (Students)
```http
POST /api/rag/mock-tests/generate    # Generate new test
GET  /api/rag/mock-tests           # List user's tests
GET  /api/rag/mock-tests/:id       # Get test details
POST /api/rag/mock-tests/:id/submit # Submit answers
GET  /api/rag/subjects             # Get available subjects/topics
```

## Database Models

### Document
```javascript
{
  filename: String,
  originalName: String,
  subject: String, // History, Polity, etc.
  topic: String,
  fileSize: Number,
  totalPages: Number,
  totalChunks: Number,
  processingStatus: String, // uploaded/processing/completed/failed
  uploadedBy: ObjectId
}
```

### DocumentChunk
```javascript
{
  documentId: ObjectId,
  text: String,
  wordCount: Number,
  vectorId: String, // ChromaDB reference
  metadata: {
    subject: String,
    topic: String,
    keywords: [String],
    summary: String
  }
}
```

### MockTest
```javascript
{
  title: String,
  subject: String,
  topic: String,
  difficulty: String,
  questions: [{
    subject: String,
    topic: String,
    question: String,
    options: [String],
    correct_option: String,
    difficulty: String,
    sourceChunks: [{
      chunkId: ObjectId,
      vectorId: String,
      relevanceScore: Number
    }]
  }]
}
```

## Setup Instructions

### Prerequisites
1. **Node.js** 18+
2. **MongoDB** running locally or Atlas
3. **ChromaDB** via Docker
4. **OpenAI API Key**

### Environment Variables
```env
# Database
DATABASE_URL=mongodb://localhost:27017/upsc-rag

# AI Services
OPENAI_API_KEY=your_openai_api_key
CHROMA_DB_URL=http://localhost:8000

# Server
PORT=5000
JWT_SECRET=your_jwt_secret
```

### Installation

1. **Start ChromaDB**:
```bash
docker run -p 8000:8000 chromadb/chroma
```

2. **Install Dependencies**:
```bash
cd Backend
npm install
cd ../Frontend
npm install
```

3. **Environment Setup**:
```bash
cp Backend/.env.example Backend/.env
# Edit .env with your API keys
```

4. **Start Services**:
```bash
# Backend
cd Backend && npm run dev

# Frontend (new terminal)
cd Frontend && npm run dev
```

### Testing
```bash
cd Backend
node test-rag-system.js
```

## Usage Flow

### For Admins
1. **Upload PDFs**: Go to `/admin/documents`
2. **Select Subject & Topic**: Categorize materials properly
3. **Monitor Processing**: Track chunk generation and embedding creation
4. **View Statistics**: Check document processing stats

### For Students
1. **Select Parameters**: Choose subject, topic, difficulty, question count
2. **Generate Test**: AI creates personalized questions from relevant chunks
3. **Take Test**: Answer questions with proper timing
4. **View Results**: Get detailed analysis and explanations
5. **Track Progress**: Review previous test performance

## Technical Details

### Text Chunking Strategy
- **Chunk Size**: 1500 characters (~300-500 words)
- **Overlap**: 200 characters for context preservation
- **Separators**: Prioritizes paragraph breaks, then sentences, then spaces

### Embedding Configuration
- **Model**: text-embedding-3-small (cost-effective)
- **Dimensions**: 1536
- **Similarity**: Cosine similarity for retrieval

### Retrieval Strategy
- **Query Expansion**: Adds contextual keywords to queries
- **Relevance Filtering**: Minimum 0.75 similarity score
- **Diversity**: Prevents redundant chunks in results
- **Limit**: 5-10 chunks per question generation

### Quality Assurance
- **Format Validation**: Ensures proper JSON structure
- **Content Verification**: Checks for required fields
- **Length Constraints**: Validates question/option lengths
- **Uniqueness**: Prevents duplicate correct answers

## Performance Optimization

### Vector Database
- **Batch Processing**: Embeds chunks in batches
- **Metadata Filtering**: Subject/topic pre-filtering
- **Index Optimization**: Efficient similarity search

### Caching Strategies
- **Chunk Reuse**: Avoids reprocessing existing documents
- **Result Caching**: Caches frequent retrieval queries
- **Embedding Cache**: Stores computed embeddings

### Scalability Considerations
- **Horizontal Scaling**: ChromaDB supports distributed deployment
- **Batch Generation**: Processes multiple questions concurrently
- **Async Processing**: Non-blocking document ingestion

## Security & Privacy

### Data Protection
- **Access Control**: Role-based permissions (admin/student)
- **File Validation**: PDF-only uploads with size limits
- **Input Sanitization**: Prevents malicious content injection

### API Security
- **Authentication**: JWT-based user verification
- **Rate Limiting**: Prevents abuse of generation endpoints
- **Validation**: Input validation on all endpoints

## Monitoring & Analytics

### System Health
- **Health Checks**: Automated service availability monitoring
- **Performance Metrics**: Response times and throughput
- **Error Tracking**: Comprehensive error logging

### Usage Analytics
- **Generation Stats**: Track test creation patterns
- **Retrieval Metrics**: Monitor chunk usage and relevance
- **User Engagement**: Analyze test completion rates

## Future Enhancements

### Advanced Features
- **Multi-modal Support**: Images, diagrams, charts
- **Question Types**: Match the following, assertion-reason
- **Difficulty Calibration**: Adaptive difficulty based on performance
- **Collaborative Filtering**: Learn from user performance patterns

### Performance Improvements
- **Hybrid Search**: Combine semantic and keyword search
- **Model Fine-tuning**: Custom model training on UPSC content
- **Edge Caching**: Reduce latency with CDN integration
- **Batch Optimization**: Parallel processing improvements

### Analytics & Insights
- **Performance Prediction**: ML-based score prediction
- **Weak Area Detection**: Automated topic difficulty analysis
- **Progress Tracking**: Long-term learning analytics
- **Comparative Analysis**: Benchmark against peer performance

## Troubleshooting

### Common Issues

**ChromaDB Connection Failed**
```bash
# Ensure Docker is running
docker ps | grep chroma

# Check ChromaDB logs
docker logs <chroma-container-id>

# Verify port availability
netstat -an | grep 8000
```

**PDF Processing Errors**
- Check file size (max 50MB)
- Verify PDF is not password-protected
- Ensure text content is selectable (not image-only)

**Embedding Generation Failed**
- Verify OpenAI API key is valid
- Check API rate limits and credits
- Ensure network connectivity to OpenAI

**Question Generation Issues**
- Confirm sufficient content chunks available
- Check subject/topic has adequate material
- Verify LLM API connectivity

### Debug Commands
```bash
# Check system health
curl http://localhost:5000/api/rag/health

# View ChromaDB collections
curl http://localhost:8000/api/v1/collections

# Check MongoDB documents
mongosh --eval "db.documents.count()"
```

## Contributing

### Code Standards
- **TypeScript**: Strict typing for all components
- **ESLint**: Code quality enforcement
- **Prettier**: Consistent code formatting
- **Jest**: Unit and integration testing

### Development Workflow
1. **Feature Branch**: Create from `main`
2. **Code Review**: Required for all changes
3. **Testing**: Unit tests for new features
4. **Documentation**: Update README for API changes

### Testing Strategy
- **Unit Tests**: Service layer functionality
- **Integration Tests**: API endpoint validation
- **E2E Tests**: Full user workflow testing
- **Performance Tests**: Load testing for scaling

---

## License

This project is proprietary software developed for UPSC preparation assistance.