# Trending Current Affairs Research Agent

A LangChain-based AI agent system for UPSC current affairs research, featuring automated trending topic detection, news aggregation, and structured UPSC analysis generation.

## Architecture Overview

### Core Components

1. **CurrentAffairsResearchAgent** - Main orchestrator
2. **News Fetchers** - Data collection from multiple sources
3. **TrendingDetector** - Topic frequency and relevance analysis
4. **UPSC Structure Chain** - AI-powered structured output generation
5. **Scheduler Service** - Automated research runs
6. **REST API** - Frontend integration endpoints

### Data Flow

```
News Sources → Fetchers → Trending Analysis → AI Analysis → Database → API → Frontend
```

## Database Schema

### TrendingTopic Model
```javascript
{
  topic: String,           // Topic name
  frequency: Number,       // Mention frequency
  relevanceScore: Number,  // AI-calculated relevance (0-100)
  category: String,        // Politics, Economy, etc.
  gsPapers: [String],      // GS paper mappings
  sources: [{              // Source articles
    name: String,
    url: String,
    snippet: String
  }],
  researchData: {          // UPSC structured analysis
    whyInNews: String,
    background: String,
    prelimsFacts: [String],
    mainsPoints: {...},
    probableQuestions: {...}
  }
}
```

### NewsSource Model
```javascript
{
  name: String,            // Source name
  type: String,            // newsapi, thehindu, pib, etc.
  apiEndpoint: String,     // API endpoint URL
  apiKey: String,          // Encrypted API key
  reliabilityScore: Number,// Source reliability (0-100)
  rateLimit: {             // Rate limiting config
    requests: Number,
    period: Number
  }
}
```

## API Endpoints

### Research Execution
```http
POST /api/current-affairs/research
Content-Type: application/json

{
  "dateRange": {
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-01-07T23:59:59Z"
  },
  "minRelevanceScore": 30,
  "maxTopics": 10,
  "keywords": ["economy", "policy"],
  "sources": ["sourceId1", "sourceId2"],
  "generateAnalysis": true
}
```

### Get Trending Topics
```http
GET /api/current-affairs/topics?limit=20&minRelevanceScore=30&category=Economy
```

### Get Topic Analysis
```http
GET /api/current-affairs/topics/:topicId
```

### Research History
```http
GET /api/current-affairs/history?status=completed&limit=10
```

### Research Statistics
```http
GET /api/current-affairs/stats
```

## Sample API Responses

### Research Execution Response
```json
{
  "success": true,
  "message": "Research completed successfully",
  "data": {
    "runId": "uuid-v4-string",
    "summary": {
      "articlesFetched": 150,
      "trendingTopicsDetected": 8,
      "analysesGenerated": 8,
      "databaseUpdates": {
        "updated": 3,
        "created": 5
      },
      "duration": 45000
    },
    "data": {
      "trendingTopics": [...],
      "analyses": [...]
    }
  }
}
```

### Trending Topic Response
```json
{
  "success": true,
  "data": [
    {
      "topic": "Digital India Mission",
      "frequency": 15,
      "relevanceScore": 85,
      "category": "Governance",
      "gsPapers": ["GS-II"],
      "sourceCount": 8,
      "firstDetected": "2024-01-15T10:30:00Z",
      "lastUpdated": "2024-01-20T14:22:00Z",
      "sources": [
        {
          "name": "The Hindu",
          "url": "https://...",
          "snippet": "Government announces new initiatives...",
          "publishDate": "2024-01-20T08:00:00Z"
        }
      ]
    }
  ]
}
```

### UPSC Analysis Response
```json
{
  "success": true,
  "data": {
    "topic": "Digital India Mission",
    "metadata": {
      "category": "Governance",
      "gsPapers": ["GS-II"],
      "relevanceScore": 85,
      "frequency": 15,
      "sourceCount": 8,
      "generatedAt": "2024-01-20T15:00:00Z"
    },
    "analysis": {
      "whyInNews": "The Digital India Mission has gained prominence with recent announcements of new digital infrastructure projects and e-governance initiatives.",
      "background": "Launched in 2015, the Digital India Mission aims to transform India into a digitally empowered society...",
      "gsPaperMapping": {
        "primary": "GS-II",
        "secondary": ["GS-III"],
        "reasoning": "Focuses on governance, administration, and technology implementation"
      },
      "prelimsFacts": [
        "Digital India Mission was launched in: 2015",
        "Key components include: Infrastructure, Services, Digital Empowerment",
        "Budget allocation for Phase II: ₹7,000 crore",
        "Target for internet connectivity: Every citizen by 2022"
      ],
      "mainsPoints": {
        "introduction": "The Digital India Mission represents a comprehensive approach to digital transformation...",
        "body": {
          "pros": [
            "Enhanced service delivery through e-governance platforms",
            "Improved transparency and reduced corruption",
            "Economic growth through digital entrepreneurship"
          ],
          "cons": [
            "Digital divide affecting rural and elderly populations",
            "Cybersecurity concerns and data privacy issues",
            "Implementation challenges in diverse geographical regions"
          ],
          "challenges": [
            "Infrastructure limitations in rural areas",
            "Digital literacy gaps",
            "Funding constraints"
          ],
          "wayForward": [
            "Strengthen digital infrastructure in rural areas",
            "Implement comprehensive digital literacy programs",
            "Develop robust cybersecurity frameworks"
          ]
        },
        "conclusion": "While challenges exist, the Digital India Mission holds significant potential..."
      },
      "probableQuestions": {
        "prelims": [
          "With reference to the Digital India Mission, consider the following statements:",
          "Which of the following is not a component of Digital India Mission?",
          "The Digital India Mission was launched in the year:"
        ],
        "mains": [
          "GS-II: Discuss the role of Digital India Mission in achieving good governance. (250 words)",
          "GS-III: Analyze the challenges in implementing digital transformation in rural India. (300 words)",
          "GS-II: Evaluate the impact of digital initiatives on administrative reforms in India. (250 words)"
        ]
      }
    }
  }
}
```

## LangChain Integration

### Agent Architecture
```javascript
// Main Research Agent
const researchAgent = new CurrentAffairsResearchAgent();

// Tool Integration
- NewsAPIFetcher: Fetches from NewsAPI.org
- TheHinduFetcher: RSS-based article fetching
- PIBFetcher: Government press releases
- IndianExpressFetcher: Editorial content

// Chain Integration
- TrendingDetector: Frequency + AI relevance scoring
- UPSCStructureChain: Structured analysis generation
```

### Tool Interfaces
```javascript
// News Fetcher Interface
class BaseNewsFetcher {
  async fetchCurrentAffairs(dateFrom, dateTo, keywords) {
    // Implementation
  }
}

// Trending Detection
class TrendingDetector {
  async detectTrendingTopics(articles, options) {
    // Frequency analysis + AI scoring
  }
}
```

## Scheduler Configuration

### Automated Runs
- **Daily Research**: 6:00 AM IST (12:30 AM UTC)
  - Analyzes last 24 hours
  - Minimum relevance score: 25
  - Max topics: 15

- **Weekly Deep-dive**: Sunday 8:00 AM IST (2:30 AM UTC)
  - Analyzes last 7 days
  - Minimum relevance score: 35
  - Max topics: 20

### Manual Triggers
```javascript
// Trigger immediate research
await schedulerService.triggerManualResearch({
  dateRange: { from, to },
  minRelevanceScore: 30,
  maxTopics: 10
});
```

## Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=mongodb://localhost:27017/upsc-mentor

# AI Service
OPENROUTER_API_KEY=your-api-key
OPENROUTER_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct

# News APIs
NEWSAPI_KEY=your-newsapi-key
THE_HINDU_API_KEY=your-thehindu-key
PIB_API_KEY=your-pib-key
INDIAN_EXPRESS_API_KEY=your-ie-key

# Research Settings
RESEARCH_MAX_RETRIES=3
RESEARCH_TIMEOUT=30000
RESEARCH_CONCURRENCY=2
```

### News Sources Setup
```javascript
// Add news sources via API
POST /api/current-affairs/sources
{
  "name": "NewsAPI.org",
  "type": "newsapi",
  "apiEndpoint": "https://newsapi.org/v2/everything",
  "apiKey": "your-api-key",
  "reliabilityScore": 85,
  "rateLimit": {
    "requests": 100,
    "period": 60
  }
}
```

## Error Handling & Resilience

### Retry Mechanisms
- API call retries with exponential backoff
- Database operation retries
- Failed research run retry functionality

### Logging
- Comprehensive request/response logging
- Performance metrics tracking
- Error categorization and alerting

### Rate Limiting
- Per-source rate limiting
- Global concurrency controls
- Automatic backoff on API limits

## Scalability Features

### Performance Optimizations
- Concurrent API calls with limits
- Batch processing for AI analysis
- Database indexing for fast queries
- Memory-efficient data processing

### Monitoring
- Real-time progress tracking
- Performance metrics collection
- Automated cleanup of stuck jobs
- Alert system for failures

## Usage Examples

### Frontend Integration
```javascript
// Fetch trending topics
const topics = await api.get('/api/current-affairs/topics?limit=10');

// Get detailed analysis
const analysis = await api.get(`/api/current-affairs/topics/${topicId}`);

// Trigger research
const result = await api.post('/api/current-affairs/research', {
  dateRange: { from: '2024-01-01', to: '2024-01-07' },
  minRelevanceScore: 40
});
```

### Direct Agent Usage
```javascript
import CurrentAffairsResearchAgent from './agents/currentAffairsResearchAgent.js';

const agent = new CurrentAffairsResearchAgent();

// Execute research
const result = await agent.executeResearch({
  dateRange: {
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date()
  },
  generateAnalysis: true
});

console.log(`Found ${result.summary.trendingTopicsDetected} topics`);
```

## Testing & Validation

### Test Coverage
- Unit tests for individual tools
- Integration tests for agent workflows
- API endpoint testing
- Scheduler functionality tests

### Sample Test Data
```javascript
// Mock news articles for testing
const mockArticles = [
  {
    title: "Government announces new economic policy",
    description: "Ministry of Finance unveils comprehensive economic reform package...",
    source: "The Hindu",
    publishedAt: new Date(),
    url: "https://example.com/article1"
  }
];
```

## Future Enhancements

### Planned Features
- Real-time news monitoring
- Custom news source integration
- Advanced ML-based topic clustering
- Multi-language support
- Integration with social media trends
- Historical trend analysis
- Custom research templates

### API Expansions
- Webhook notifications for research completion
- Bulk analysis exports
- Research comparison tools
- Collaborative filtering for topic relevance

## Troubleshooting

### Common Issues
1. **API Key Errors**: Verify environment variables are set correctly
2. **Rate Limiting**: Check source-specific rate limits and backoff strategies
3. **Database Connection**: Ensure MongoDB is running and accessible
4. **Memory Issues**: Monitor heap usage during large research runs

### Debug Mode
```bash
# Enable detailed logging
DEBUG=current-affairs:* npm run dev
```

### Health Checks
```http
GET /api/health
GET /api/current-affairs/stats
```

## Contributing

### Development Setup
1. Clone repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run database migrations if needed
5. Start development server: `npm run dev`

### Code Standards
- ES6+ syntax with async/await
- Comprehensive error handling
- Detailed JSDoc comments
- Unit test coverage for critical functions
- Clean, modular architecture

## License

This project is part of the UPSC Mentor system and follows the same licensing terms.
