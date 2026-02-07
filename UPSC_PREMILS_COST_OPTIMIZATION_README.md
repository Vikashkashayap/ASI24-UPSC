# UPSC Prelims Test Generator - Cost Optimization System

## 🎯 System Overview

A production-ready UPSC Prelims MCQ test generation system with strict data control and AI cost optimization. The system generates questions **only once per unique test configuration** and reuses them for multiple students, while maintaining the appearance of AI-generated content.

## 🏗️ Architecture

### Core Principle: Cost Optimization
- **AI called only once** per unique test configuration (subject + topic + difficulty + question_count)
- **Same questions served** to multiple students with randomization
- **Strict source control**: Questions generated only from admin-uploaded notes
- **Caching mechanism**: Test_key based question storage and retrieval

### Key Components

1. **Admin Panel**: Document upload with subject/topic categorization
2. **Student Portal**: Test generation with UX optimization
3. **Backend Services**: Cost-optimized AI generation and caching
4. **Database**: Optimized schema for question reuse
5. **Analytics**: Cost tracking and efficiency monitoring

## 📊 Database Schema

### PremilQuestion Collection
```javascript
{
  testKey: "history_ancientindia_medium_20", // Unique identifier
  subject: "History",
  topic: "Ancient India",
  difficulty: "medium",
  questionCount: 20,
  question: "Question text here",
  options: ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
  correctAnswer: "A) Option 1",
  explanation: "Explanation based on source material",
  questionIndex: 0, // Position in test
  sourceChunks: [{
    chunkId: ObjectId,
    vectorId: "vector_123",
    relevanceScore: 0.95
  }],
  generationCost: 5, // Cost in cents for this question
  aiModel: "gpt-4o-mini",
  generatedAt: Date
}
```

### PremilTestSession Collection
```javascript
{
  studentId: ObjectId,
  testKey: "history_ancientindia_medium_20",
  sessionId: "premil_1703123456789_abc123",
  subject: "History",
  topic: "Ancient India",
  difficulty: "medium",
  totalQuestions: 20,
  questionOrder: [{
    originalIndex: 0,
    shuffledIndex: 5, // Position shown to student
    questionId: ObjectId
  }],
  answers: [{
    questionIndex: 5, // Position shown to student
    selectedAnswer: "A) Option 1",
    isCorrect: true,
    timeSpent: 45 // seconds
  }],
  score: 18,
  percentage: 90,
  status: "completed",
  wasCached: true, // Cost optimization flag
  aiCost: 0, // No additional cost for cached tests
  startedAt: Date,
  submittedAt: Date
}
```

### DocumentChunk Collection (Existing)
```javascript
{
  documentId: ObjectId,
  chunkIndex: 0,
  text: "Chunk content (300-500 words)",
  wordCount: 350,
  vectorId: "chroma_doc_123",
  metadata: {
    subject: "History",
    topic: "Ancient India",
    difficulty: "medium"
  }
}
```

## 🔧 Backend API Design

### Admin Endpoints

#### POST /api/premil/admin/upload
Upload document for prelims preparation
```javascript
// Request: FormData with file, subject, topic
const formData = new FormData();
formData.append('document', file); // PDF/TXT/DOC/DOCX
formData.append('subject', 'History');
formData.append('topic', 'Ancient India');

// Response
{
  success: true,
  documentId: "...",
  chunksCreated: 15,
  embeddingsGenerated: 15
}
```

#### GET /api/premil/admin/documents
List uploaded documents
```javascript
// Response
{
  documents: [{
    _id: "...",
    filename: "history_notes.pdf",
    subject: "History",
    topic: "Ancient India",
    fileSize: 2048576,
    createdAt: "2024-01-01T00:00:00Z"
  }]
}
```

#### GET /api/premil/admin/stats
Cost optimization analytics
```javascript
// Response
{
  questions: {
    totalQuestions: 500,
    totalCost: 2500, // $25.00 in cents
    uniqueTestKeys: ["history_ancient_medium_20", ...],
    avgCostPerQuestion: 5 // $0.05
  },
  sessions: {
    totalSessions: 1000,
    cachedSessions: 850,
    totalAiCost: 7500, // $75.00
    avgScore: 78.5
  }
}
```

### Student Endpoints

#### POST /api/premil/generate
Generate or retrieve prelims test
```javascript
// Request
{
  subject: "History",
  topic: "Ancient India",
  difficulty: "medium",
  questionCount: 20
}

// Response
{
  success: true,
  sessionId: "premil_1703123456789_abc123",
  cached: true, // Cost optimization indicator
  questions: [{
    id: "...",
    question: "Question text",
    options: ["A) Opt1", "B) Opt2", "C) Opt3", "D) Opt4"],
    questionIndex: 0
  }],
  totalQuestions: 20,
  aiCost: 0 // No cost for cached tests
}
```

#### POST /api/premil/submit
Submit test answers
```javascript
// Request
{
  sessionId: "premil_1703123456789_abc123",
  answers: [{
    questionIndex: 0,
    selectedAnswer: "A) Option 1",
    timeSpent: 45
  }],
  timeSpent: 1800 // Total seconds
}

// Response
{
  success: true,
  result: {
    sessionId: "...",
    score: 18,
    percentage: 90,
    correctAnswers: 18,
    totalQuestions: 20,
    timeSpent: 1800
  }
}
```

#### GET /api/premil/history
Student's test history
```javascript
// Response
{
  success: true,
  history: {
    sessions: [{
      sessionId: "...",
      testKey: "history_ancient_medium_20",
      score: 18,
      percentage: 90,
      status: "completed",
      createdAt: "2024-01-01T00:00:00Z"
    }],
    pagination: { page: 1, limit: 10, total: 50 }
  }
}
```

## 🧠 Pseudocode for Test Generation Logic

### Cost-Optimized Test Generation Flow
```javascript
function generateOrRetrieveTest(params):
    # Generate unique test key
    testKey = generateTestKey(params.subject, params.topic, params.difficulty, params.questionCount)

    # COST OPTIMIZATION: Check if test exists
    if testExistsInDatabase(testKey):
        print("💰 COST SAVED: Serving cached test")
        questions = getQuestionsFromDatabase(testKey, randomizeOrder=true)
        session = createStudentSession(params.studentId, testKey, questions, cached=true)
        return { success: true, cached: true, questions, aiCost: 0 }

    # AI CALL REQUIRED: Generate new test
    print("🤖 AI CALL: Generating new test")
    questions = generateNewTestWithAI(params, testKey)
    session = createStudentSession(params.studentId, testKey, questions, cached=false)
    return { success: true, cached: false, questions, aiCost: totalCost }

function generateNewTestWithAI(params, testKey):
    # Retrieve relevant chunks from vector database
    chunks = retrieveRelevantChunks(params.subject, params.topic, params.difficulty)

    # Build context from chunks (limit to 8K tokens)
    context = buildContextFromChunks(chunks, maxLength=8000)

    # Generate questions using AI with strict prompt
    aiResult = callAIWithStrictPrompt(context, params)

    # Save questions to database with test_key
    savedQuestions = saveQuestionsToDatabase(aiResult.questions, testKey, params, chunks, aiResult.cost)

    return savedQuestions

function generateTestKey(subject, topic, difficulty, questionCount):
    # Normalize strings to avoid duplicates
    normalizedSubject = subject.toLowerCase().replace(/\s+/g, '')
    normalizedTopic = topic.toLowerCase().replace(/\s+/g, '')
    normalizedDifficulty = difficulty.toLowerCase()

    return `${normalizedSubject}_${normalizedTopic}_${normalizedDifficulty}_${questionCount}`
```

### Question Randomization for UX
```javascript
function getQuestionsFromDatabase(testKey, randomizeOrder=true):
    questions = database.find({ testKey }).sortBy('questionIndex')

    if randomizeOrder:
        # Shuffle question order
        questions = shuffleArray(questions)

        # Shuffle options for each question
        for each question in questions:
            originalOptions = question.options
            correctAnswer = question.correctAnswer

            # Create shuffled options
            shuffledOptions = shuffleArray(originalOptions)

            # Update correct answer to new position
            correctIndex = shuffledOptions.indexOf(correctAnswer)
            question.correctAnswer = ['A', 'B', 'C', 'D'][correctIndex]
            question.options = shuffledOptions

    return questions
```

## 🎭 Sample LLM Prompt for MCQ Generation

```
CRITICAL: Generate EXACTLY 20 UPSC Prelims MCQs ONLY from the provided context.

REQUIREMENTS:
1. Use ONLY information from the CONTEXT provided
2. Do NOT use external knowledge or assume missing facts
3. Do NOT add information not present in the context
4. If context doesn't have enough information, generate fewer questions but maintain quality

QUESTION FORMAT:
- UPSC Prelims standard MCQs with 4 options (A, B, C, D)
- One clearly correct answer
- Brief explanation based ONLY on context
- Difficulty level: medium
- Subject: History - Topic: Ancient India

OUTPUT FORMAT (STRICT JSON):
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A) Option 1",
      "explanation": "Explanation based only on context"
    }
  ]
}

CONTEXT:
[300-500 word chunks from admin-uploaded notes about Ancient India]
```
```

## 💰 Cost Optimization Features

### 1. Unique Test Key System
- **Format**: `subject_topic_difficulty_questionCount`
- **Example**: `history_ancientindia_medium_20`
- **Benefit**: Eliminates duplicate AI calls for identical configurations

### 2. Intelligent Caching
- **Database Check**: Before AI call, check if test_key exists
- **Cache Hit Ratio**: Tracks percentage of tests served from cache
- **Cost Tracking**: Monitors actual vs potential costs

### 3. Strict Source Control
- **Vector Search**: Retrieves only from admin-uploaded documents
- **Chunk Validation**: 300-500 word chunks with embeddings
- **Source Attribution**: Each question links to source chunks

### 4. UX Optimization
- **Randomization**: Question and option order shuffled for each student
- **Fresh Experience**: Timer, unique session IDs, progress tracking
- **Performance Analytics**: Student scores and improvement tracking

### 5. Scalability Features
- **Horizontal Scaling**: Stateless services, database optimization
- **Batch Processing**: Document chunking and embedding generation
- **Monitoring**: Real-time cost and performance analytics

## 📈 Cost Analysis Example

### Scenario: 1000 Students Taking Same Test

**Without Optimization:**
- Each student triggers AI call
- Cost: 1000 × $0.15 = **$150.00**

**With Optimization:**
- AI called once for unique test configuration
- 999 tests served from cache
- Cost: 1 × $0.15 = **$0.15**
- **Savings: $149.85 (99.9% cost reduction)**

### Key Metrics Tracked:
- **Cache Hit Ratio**: 99.9% efficiency
- **Cost per Question**: $0.05 average
- **Student Experience**: Identical (randomized presentation)
- **Source Accuracy**: 100% (questions from admin notes only)

## 🚀 Production Deployment Checklist

### Backend Setup
- [ ] MongoDB database with indexes
- [ ] Vector database (ChromaDB/Pinecone)
- [ ] Redis for session caching (optional)
- [ ] Environment variables configured
- [ ] API rate limiting implemented

### Frontend Setup
- [ ] Admin routes protected with middleware
- [ ] File upload size limits configured
- [ ] Error handling and loading states
- [ ] Responsive design for mobile/desktop

### Security Measures
- [ ] Input validation and sanitization
- [ ] Rate limiting on API endpoints
- [ ] Authentication for admin operations
- [ ] File type validation for uploads

### Monitoring & Analytics
- [ ] Cost tracking dashboard
- [ ] Performance monitoring
- [ ] Error logging and alerting
- [ ] Student usage analytics

## 🔧 Technical Implementation Notes

### Vector Database Integration
```javascript
// Document processing pipeline
1. Upload PDF/TXT → Extract text
2. Split into 300-500 word chunks
3. Generate embeddings (OpenAI/ Sentence Transformers)
4. Store in vector database with metadata
5. Create MongoDB references for tracking
```

### AI Cost Tracking
```javascript
// Per-request cost calculation
const promptTokens = estimateTokens(prompt + context);
const completionTokens = estimateTokens(response);
const totalTokens = promptTokens + completionTokens;
const costPerThousand = 15; // cents for GPT-4o-mini
const cost = Math.ceil((totalTokens / 1000) * costPerThousand);
```

### Test Key Generation
```javascript
// Deterministic key generation
function generateTestKey(subject, topic, difficulty, count) {
  return `${subject.toLowerCase().replace(/\s+/g, '')}_${topic.toLowerCase().replace(/\s+/g, '')}_${difficulty}_${count}`;
}
```

This system provides **enterprise-grade cost optimization** while maintaining **UPSC-level question quality** and **strict academic integrity** through source-controlled AI generation.