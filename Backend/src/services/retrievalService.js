import vectorStoreService from './vectorStoreService.js';
import DocumentChunk from '../models/DocumentChunk.js';

class RetrievalService {
  constructor() {
    this.vectorStore = vectorStoreService;
  }

  /**
   * Retrieve relevant chunks for a given query
   */
  async retrieveRelevantChunks(query, options = {}) {
    try {
      const {
        limit = 5,
        subject = null,
        topic = null,
        difficulty = 'medium',
        minScore = 0.75,
        includeMetadata = true
      } = options;

      // Try vector store search first
      let searchResults = [];
      try {
        searchResults = await this.vectorStore.search(query, {
          limit,
          subject,
          topic,
          difficulty,
          minScore
        });
      } catch (vectorError) {
        console.warn('Vector store search failed, falling back to MongoDB search:', vectorError.message);

        // Fallback: Search in MongoDB DocumentChunk collection
        const mongoQuery = {};
        if (subject) mongoQuery['metadata.subject'] = subject;
        if (topic) mongoQuery['metadata.topic'] = topic;

        const mongoChunks = await DocumentChunk.find(mongoQuery)
          .limit(limit * 2)
          .populate('documentId', 'filename subject topic');

        // Convert to similar format as vector search results
        searchResults = mongoChunks.map((chunk, index) => ({
          id: chunk.vectorId,
          document: chunk.text,
          score: 1.0 - (index * 0.1), // Decreasing score
          mongoData: chunk
        }));
      }

      if (searchResults.length === 0) {
        return {
          chunks: [],
          totalFound: 0,
          query,
          searchTime: 0
        };
      }

      // searchResults already contain either vector-store metadata or MongoDB data.
      // To avoid referencing undefined variables, we simply return them as-is.
      const enrichedResults = searchResults;

      return {
        chunks: enrichedResults,
        totalFound: enrichedResults.length,
        query,
        searchTime: Date.now()
      };
    } catch (error) {
      console.error('❌ Retrieval failed:', error);
      throw new Error(`Failed to retrieve chunks: ${error.message}`);
    }
  }

  /**
   * Retrieve chunks for mock test generation with enhanced filtering
   */
  async retrieveForMockTest(subject, topic, difficulty = 'medium', questionCount = 20) {
    try {
      // Create a comprehensive query for the subject/topic
      const baseQuery = `UPSC Prelims ${subject} ${topic} important concepts and facts`;

      // Retrieve more chunks than needed to allow for filtering
      const retrievalLimit = Math.max(questionCount * 3, 50);

      const results = await this.retrieveRelevantChunks(baseQuery, {
        limit: retrievalLimit,
        subject,
        topic,
        difficulty,
        minScore: 0.7,
        includeMetadata: true
      });

      // Filter and diversify chunks
      const diversifiedChunks = this.diversifyChunks(results.chunks, questionCount * 2);

      return {
        ...results,
        chunks: diversifiedChunks,
        totalFound: diversifiedChunks.length
      };
    } catch (error) {
      console.error('❌ Mock test retrieval failed:', error);
      throw new Error(`Mock test retrieval failed: ${error.message}`);
    }
  }

  /**
   * Diversify chunks to avoid redundancy and ensure coverage
   */
  diversifyChunks(chunks, targetCount) {
    if (chunks.length <= targetCount) return chunks;

    // Sort by relevance score (higher is better)
    const sortedChunks = chunks.sort((a, b) => b.score - a.score);

    const selected = [];
    const usedKeywords = new Set();

    for (const chunk of sortedChunks) {
      if (selected.length >= targetCount) break;

      // Extract keywords from this chunk
      const chunkKeywords = this.extractChunkKeywords(chunk.document);

      // Check if this chunk provides new information
      const overlap = this.calculateKeywordOverlap(chunkKeywords, usedKeywords);

      // Only include if overlap is less than 60%
      if (overlap < 0.6) {
        selected.push(chunk);
        chunkKeywords.forEach(keyword => usedKeywords.add(keyword));
      }
    }

    return selected;
  }

  /**
   * Extract keywords from chunk text
   */
  extractChunkKeywords(text) {
    // Simple keyword extraction - split by spaces and filter
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word))
      .slice(0, 20); // Top 20 keywords
  }

  /**
   * Calculate overlap between chunk keywords and used keywords
   */
  calculateKeywordOverlap(chunkKeywords, usedKeywords) {
    if (usedKeywords.size === 0) return 0;

    const overlap = chunkKeywords.filter(keyword => usedKeywords.has(keyword));
    return overlap.length / chunkKeywords.length;
  }

  /**
   * Check if word is a stop word
   */
  isStopWord(word) {
    const stopWords = new Set([
      'that', 'this', 'with', 'from', 'they', 'have', 'been', 'will', 'would', 'could',
      'should', 'there', 'their', 'about', 'which', 'after', 'before', 'during', 'through',
      'above', 'below', 'between', 'among', 'under', 'over', 'into', 'onto', 'upon',
      'these', 'those', 'such', 'only', 'some', 'many', 'most', 'much', 'each', 'every',
      'other', 'another', 'first', 'last', 'next', 'same', 'different', 'when', 'where',
      'what', 'how', 'why', 'who', 'all', 'any', 'both', 'each', 'few', 'more', 'most',
      'other', 'some', 'such', 'than', 'that', 'the', 'this', 'will', 'can', 'may',
      'might', 'must', 'shall', 'should', 'would', 'could', 'and', 'but', 'for', 'nor',
      'not', 'now', 'one', 'our', 'out', 'own', 'said', 'say', 'says', 'she', 'six',
      'the', 'then', 'them', 'too', 'two', 'use', 'was', 'way', 'who', 'yet', 'you'
    ]);

    return stopWords.has(word);
  }

  /**
   * Get retrieval statistics
   */
  async getRetrievalStats(subject = null, topic = null) {
    try {
      const matchQuery = {};
      if (subject) matchQuery['metadata.subject'] = subject;
      if (topic) matchQuery['metadata.topic'] = topic;

      const stats = await DocumentChunk.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              subject: '$metadata.subject',
              topic: '$metadata.topic'
            },
            count: { $sum: 1 },
            avgWordCount: { $avg: '$wordCount' },
            totalWords: { $sum: '$wordCount' }
          }
        },
        {
          $group: {
            _id: null,
            subjects: {
              $addToSet: {
                subject: '$_id.subject',
                topics: ['$_id.topic'],
                count: '$count'
              }
            },
            totalChunks: { $sum: '$count' },
            totalWords: { $sum: '$totalWords' },
            avgWordsPerChunk: { $avg: '$avgWordCount' }
          }
        }
      ]);

      return stats[0] || {
        subjects: [],
        totalChunks: 0,
        totalWords: 0,
        avgWordsPerChunk: 0
      };
    } catch (error) {
      console.error('❌ Failed to get retrieval stats:', error);
      throw new Error(`Stats retrieval failed: ${error.message}`);
    }
  }

  /**
   * Health check for retrieval service
   */
  async healthCheck() {
    try {
      const vectorHealth = await this.vectorStore.healthCheck();
      const stats = await this.getRetrievalStats();

      return {
        status: vectorHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        vectorStore: vectorHealth,
        retrievalStats: stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

export default new RetrievalService();