# UPSC Prelims AI Test Generator - Cost Optimized System

## 🎯 System Overview

A production-ready UPSC Prelims MCQ test generator that uses **embedded ChromaDB** for local vector storage and implements **extreme cost optimization** by generating AI questions only once per unique test configuration.

### Key Features
- ✅ **Embedded ChromaDB**: No external servers, all data stored locally
- ✅ **Cost Optimization**: AI called only once per unique test configuration
- ✅ **Source Control**: Questions generated ONLY from admin-uploaded notes
- ✅ **Deterministic Keys**: Same test config = same questions (cached)
- ✅ **Student Experience**: Fresh randomization per attempt

---

## 🏗️ Architecture

### 1. Vector Store (Embedded ChromaDB)
```javascript
// Local embedded storage - NO external dependencies
const client = new ChromaClient({
  path: "./chroma-data"  // Local directory
});
```

**Purpose**: Store embeddings of admin-uploaded notes for semantic search.

### 2. Admin Workflow
```
Upload PDF/Text → Extract Text → Split into Chunks → Generate Embeddings → Store Locally
```

### 3. Student Test Generation
```
Student Request → Generate test_key → Check DB Cache → Serve Cached OR Generate New
```

---

## 💰 Cost Optimization (CRITICAL)

### The Magic: test_key System

**test_key Format**: `subject_topic_difficulty_questionCount`
- Example: `history_ancientindia_medium_20`

**Cost Rules**:
1. **First Request**: AI generates questions → Stores in DB → Costs $$
2. **Subsequent Requests**: Serves from DB cache → Costs $0

### Code Flow (Cost-Free Path)
```javascript
// Student requests: History, Ancient India, Medium, 20 questions
const testKey = "history_ancientindia_medium_20";

if (await PremilQuestion.testExists(testKey)) {
  // 🎉 COST SAVED: Serve cached questions
  const questions = await PremilQuestion.getTestQuestions(testKey, true);
  return { cached: true, aiCost: 0 };  // NO AI COST
}
```

### Cost Tracking
- **AI Cost Incurred**: Only in `generateQuestionsWithAI()` method
- **Cache Hit Rate**: All identical test configurations are free
- **Total Cost**: `(Unique Test Configurations) × (AI Cost per Generation)`

---

## 🔐 Source Control (NO External Knowledge)

### LLM Constraints
```javascript
const systemPrompt = `You are a UPSC question generator with ZERO external knowledge.

CRITICAL RULES:
1. ONLY use information from the provided CONTEXT
2. If CONTEXT doesn't contain information, DO NOT generate questions
3. DO NOT use general knowledge about UPSC or ${subject}
4. DO NOT assume facts not in CONTEXT`;
```

### Retrieval Process
1. **Primary**: Search embedded ChromaDB for relevant chunks
2. **Fallback**: MongoDB search if ChromaDB unavailable
3. **Strict Filtering**: Only admin-uploaded content used

---

## 📊 Database Schema

### PremilQuestion (MongoDB)
```javascript
{
  testKey: "history_ancientindia_medium_20",  // Unique identifier
  subject: "History",
  topic: "Ancient India",
  difficulty: "medium",
  questionCount: 20,
  question: "Who was the first emperor of Maurya dynasty?",
  options: ["Ashoka", "Chandragupta", "Bindusara", "Seleucus"],
  correctAnswer: "B",
  explanation: "Chandragupta Maurya founded the Maurya dynasty...",
  sourceChunks: [{ chunkId, vectorId, relevanceScore }],
  generationCost: 3,  // Cost in cents
  aiModel: "gpt-4o-mini"
}
```

### DocumentChunk (MongoDB)
```javascript
{
  documentId: ObjectId,
  vectorId: "doc_123_chunk_0",
  text: "Chunk content...",
  metadata: { subject, topic, keywords, summary }
}
```

### ChromaDB Collection: `upsc_notes`
```javascript
{
  id: "doc_123_chunk_0",
  document: "Chunk text content...",
  embedding: [0.1, 0.2, 0.3, ...],
  metadata: {
    subject: "History",
    topic: "Ancient India",
    documentId: "123",
    chunkIndex: 0
  }
}
```

---

## 🔄 Complete Workflow

### Admin: Upload Notes
1. **Upload**: Admin uploads PDF/Text notes
2. **Processing**: Extract text → Split into 300-500 word chunks
3. **Embeddings**: Generate embeddings using OpenAI
4. **Storage**: Store in embedded ChromaDB + MongoDB backup

### Student: Take Test
1. **Request**: Student selects subject/topic/difficulty/questions
2. **test_key**: Generate `subject_topic_difficulty_questionCount`
3. **Cache Check**: Query DB for existing questions
4. **Cache Hit** (99% of cases):
   - Fetch questions from DB
   - Randomize question order
   - Randomize option order
   - Create session
   - **NO AI COST**
5. **Cache Miss** (First time only):
   - Retrieve relevant chunks from ChromaDB
   - Call LLM with strict context-only prompt
   - Generate questions
   - Save to DB with test_key
   - **AI COST INCURRED**

---

## 🎨 Student Experience

### AI-Generated Feel (Even When Cached)
- **Question Order**: Randomized per attempt
- **Option Order**: Shuffled per question
- **Session Tracking**: Fresh attempt_id each time
- **Timer**: Reset for each attempt

### Cost Transparency
- **Cached Tests**: "Test served from cache (cost optimized!)"
- **New Tests**: "New test generated using AI"

---

## 🛠️ Technical Implementation

### Services Architecture

#### 1. vectorStoreService.js
```javascript
class VectorStoreService {
  constructor() {
    this.client = new ChromaClient({ path: "./chroma-data" }); // EMBEDDED
    this.collection = null;
  }

  async addChunks(chunks, documentId) {
    // Generate embeddings → Store in ChromaDB → Backup to MongoDB
  }

  async search(query, options) {
    // Semantic search in embedded ChromaDB
  }
}
```

#### 2. retrievalService.js
```javascript
class RetrievalService {
  async retrieveForMockTest(subject, topic, difficulty, questionCount) {
    // Primary: ChromaDB search
    // Fallback: MongoDB search
    // Return: Diversified chunks for question generation
  }
}
```

#### 3. premilTestGenerationService.js
```javascript
class PremilTestGenerationService {
  async generateOrRetrieveTest(params) {
    const testKey = generateTestKey(subject, topic, difficulty, questionCount);

    if (await testExists(testKey)) {
      // COST SAVED: Serve from cache
      return { cached: true, aiCost: 0 };
    } else {
      // AI CALL: Generate once, cache forever
      return { cached: false, aiCost: X };
    }
  }

  async generateQuestionsWithAI(context, subject, topic, difficulty, questionCount) {
    // THIS IS THE ONLY PLACE AI COST IS INCURRED
    const prompt = buildStrictPrompt(subject, topic, difficulty, questionCount);
    // LLM called with: context-only instructions
  }
}
```

---

## 📈 Performance & Cost Metrics

### Typical Usage Patterns
- **Students per Test Config**: 100-1000 students
- **Unique Test Configs**: 50-200 (varies by content uploaded)
- **Cache Hit Rate**: 95-99%
- **Cost Reduction**: 95-99% compared to per-student generation

### Example Cost Calculation
```
Scenario: 1000 students, 50 unique test configurations

Without Optimization:
- 1000 AI calls × $0.15 = $150

With Optimization:
- 50 AI calls × $0.15 = $7.50
- 950 cached calls × $0 = $0
- Total: $7.50 (95% savings)
```

---

## 🚀 Deployment & Setup

### Prerequisites
```bash
npm install chromadb @langchain/openai mongoose
```

### Environment Variables
```env
OPENAI_API_KEY=your_openai_key
CHROMA_DATA_PATH=./chroma-data  # Local storage path
```

### Directory Structure
```
/app
├── chroma-data/          # Embedded ChromaDB storage
├── Backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── vectorStoreService.js
│   │   │   ├── retrievalService.js
│   │   │   └── premilTestGenerationService.js
│   │   └── models/
│   └── server.js
└── Frontend/
    └── src/
```

### Startup Process
1. **ChromaDB**: Auto-initializes embedded instance
2. **Collections**: Auto-creates `upsc_notes` collection
3. **Data**: Persists locally in `./chroma-data/`

---

## 🔧 Maintenance & Monitoring

### Health Checks
```javascript
// Vector store health
await vectorStoreService.healthCheck();

// Retrieval stats
await retrievalService.getRetrievalStats();

// Generation stats
await premilTestGenerationService.getGenerationStats();
```

### Cost Monitoring
```javascript
const stats = await premilTestGenerationService.getGenerationStats();
// Shows: totalCost, cachedSessions, aiCost savings
```

### Data Management
```javascript
// Delete document chunks
await vectorStoreService.deleteDocumentChunks(documentId);

// Rebuild embeddings (if needed)
await vectorStoreService.addChunks(chunks, documentId);
```

---

## 🎯 Key Success Metrics

1. **Cost Efficiency**: >95% reduction in AI costs
2. **Content Control**: 100% questions from uploaded notes
3. **Performance**: <2s response time for cached tests
4. **Reliability**: Embedded storage, no external dependencies
5. **Scalability**: Supports thousands of students per test config

---

## 🚨 Critical Implementation Notes

### Cost Optimization
- **test_key MUST NOT include studentId** (breaks caching)
- **AI called ONLY in generateQuestionsWithAI()**
- **Cache check happens BEFORE any expensive operations**

### Source Control
- **LLM gets ZERO external knowledge**
- **Context-only prompts with strict warnings**
- **Fallback to fewer questions rather than hallucination**

### Student Experience
- **Randomization happens at DB query level**
- **Fresh session created for each attempt**
- **Timer and progress tracked per session**

This system delivers enterprise-grade UPSC test generation with consumer-grade costs through intelligent caching and source control. 🎓💰