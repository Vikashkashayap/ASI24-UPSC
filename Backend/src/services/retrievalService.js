import vectorStoreService from './vectorStoreService.js';
import DocumentChunk from '../models/DocumentChunk.js';

class RetrievalService {
  constructor() {
    this.vectorStore = vectorStoreService;
  }

  /**
   * Retrieve relevant chunks for UPSC Prelims questions
   * PRIMARY: Embedded ChromaDB search (admin-uploaded notes only)
   * FALLBACK: MongoDB search if ChromaDB unavailable
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

      console.log(`📚 Retrieving chunks for UPSC query: "${query.substring(0, 50)}..." (${subject} - ${topic})`);

      // PRIMARY: Search MongoDB (ChromaDB temporarily disabled)
      let searchResults = [];
      try {
        searchResults = await this.vectorStore.search(query, {
          limit,
          subject,
          topic,
          minScore
        });

        if (searchResults.length > 0) {
          console.log(`✅ Found ${searchResults.length} chunks in MongoDB search`);
        } else {
          console.log('⚠️ No chunks found in primary search, trying broader search...');

      // Try broader search without subject/topic filters
      searchResults = await this.vectorStore.search(query, {
        limit,
        subject: null,
        topic: null,
        minScore: minScore * 0.5 // Much lower threshold for broader search
      });

      // If still no results, get any chunks from the requested subject
      if (searchResults.length === 0 && subject) {
        console.log(`🔄 Getting any chunks from subject: ${subject}`);
        const DocumentChunk = (await import('../models/DocumentChunk.js')).default;
        const subjectChunks = await DocumentChunk.find({
          'metadata.subject': subject
        }).limit(limit).sort({ createdAt: -1 });

        searchResults = subjectChunks.map((chunk, index) => ({
          id: chunk.vectorId,
          document: chunk.text,
          score: 0.3 - (index * 0.05), // Low but decreasing score
          metadata: {
            subject: chunk.metadata.subject,
            topic: chunk.metadata.topic,
            filename: chunk.metadata.filename,
            documentId: chunk.documentId.toString(),
            chunkIndex: chunk.chunkIndex
          },
          mongoData: chunk
        }));
      }

          if (searchResults.length > 0) {
            console.log(`✅ Found ${searchResults.length} chunks in broad MongoDB search`);
          }
        }
      } catch (vectorError) {
        console.warn('⚠️ MongoDB search failed:', vectorError.message);
      }

      // If still no results, try MongoDB directly with broader criteria
      if (searchResults.length === 0) {
        console.log('🔄 Trying direct MongoDB query for chunks');

        const mongoQuery = {};
        if (subject) mongoQuery['metadata.subject'] = subject;
        if (topic) mongoQuery['metadata.topic'] = topic;

        // If no specific filters, get recent chunks
        if (!subject && !topic) {
          // Get all chunks, sorted by recency
          console.log('📄 Getting recent chunks from all subjects/topics');
        }

        const mongoChunks = await DocumentChunk.find(mongoQuery)
          .limit(limit * 2)
          .populate('documentId', 'filename subject topic')
          .sort({ createdAt: -1 }); // Prefer newer chunks

        // Convert MongoDB results to consistent format
        searchResults = mongoChunks.map((chunk, index) => ({
          id: chunk.vectorId,
          document: chunk.text,
          score: 0.8 - (index * 0.1), // Decreasing score for fallback
          metadata: {
            subject: chunk.metadata.subject,
            topic: chunk.metadata.topic,
            filename: chunk.metadata.filename,
            documentId: chunk.documentId._id.toString(),
            chunkIndex: chunk.chunkIndex
          },
          mongoData: chunk
        }));

        console.log(`📄 Found ${searchResults.length} chunks in MongoDB fallback`);
      }

      if (searchResults.length === 0) {
        console.warn('❌ No relevant chunks found in either ChromaDB or MongoDB');
        return {
          chunks: [],
          totalFound: 0,
          query,
          searchTime: Date.now(),
          source: 'none'
        };
      }

      // Ensure we have the required metadata for UPSC question generation
      const enrichedResults = searchResults.map(result => ({
        ...result,
        metadata: {
          subject: result.metadata?.subject || subject,
          topic: result.metadata?.topic || topic,
          filename: result.metadata?.filename || 'Unknown',
          chunk_id: result.id,
          ...result.metadata
        }
      }));

      return {
        chunks: enrichedResults,
        totalFound: enrichedResults.length,
        query,
        searchTime: Date.now(),
        source: searchResults[0]?.mongoData ? 'mongodb' : 'chromadb'
      };
    } catch (error) {
      console.error('❌ Retrieval failed:', error);
      throw new Error(`Failed to retrieve chunks: ${error.message}`);
    }
  }

  /**
   * Retrieve chunks for UPSC Prelims test generation
   * CRITICAL: Ensures questions are generated ONLY from admin-uploaded notes
   */
  async retrieveForMockTest(subject, topic, difficulty = 'medium', questionCount = 20) {
    try {
      // Create UPSC-specific query that matches admin-uploaded content
      const baseQuery = `${subject} ${topic} UPSC Prelims important concepts facts MCQs`;

      // Retrieve sufficient chunks for question generation (more than needed for diversity)
      const retrievalLimit = Math.max(questionCount * 4, 60); // More chunks for better coverage

      console.log(`🎯 Retrieving chunks for UPSC test: ${subject} - ${topic} (${difficulty}, ${questionCount} questions)`);

      const results = await this.retrieveRelevantChunks(baseQuery, {
        limit: retrievalLimit,
        subject,
        topic,
        minScore: 0.7, // Higher threshold for UPSC accuracy
        includeMetadata: true
      });

      if (results.chunks.length === 0) {
        // Check if any documents exist at all
        const Document = (await import('../models/Document.js')).default;
        const DocumentChunk = (await import('../models/DocumentChunk.js')).default;

        const totalDocs = await Document.countDocuments();
        const totalChunks = await DocumentChunk.countDocuments();

        console.log(`📊 Database status: ${totalDocs} documents, ${totalChunks} chunks`);

        if (totalDocs === 0) {
          throw new Error('No documents have been uploaded yet. Please ask the admin to upload study materials first.');
        } else if (totalChunks === 0) {
          throw new Error('Documents exist but no chunks found. Please re-upload documents or contact admin.');
        } else {
          // Show what content is actually available
          const availableContent = await DocumentChunk.aggregate([
            {
              $group: {
                _id: {
                  subject: '$metadata.subject',
                  topic: '$metadata.topic'
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.subject': 1, '_id.topic': 1 } }
          ]);

          console.log('📋 Available content:', availableContent);
          throw new Error(`No relevant content found for ${subject} - ${topic}. Available: ${availableContent.map(c => `${c._id.subject}-${c._id.topic}(${c.count})`).join(', ')}`);
        }
      }

      // Diversify and filter chunks to ensure broad coverage
      const diversifiedChunks = this.diversifyChunks(results.chunks, questionCount * 2);

      // Ensure we have enough high-quality chunks
      if (diversifiedChunks.length < questionCount) {
        console.warn(`⚠️ Limited chunks available (${diversifiedChunks.length}) for ${questionCount} questions`);
      }

      console.log(`📋 Retrieved ${diversifiedChunks.length} diversified chunks from ${results.source} for test generation`);

      return {
        ...results,
        chunks: diversifiedChunks,
        totalFound: diversifiedChunks.length,
        subject,
        topic,
        difficulty,
        questionCount
      };
    } catch (error) {
      console.error('❌ UPSC mock test retrieval failed:', error);
      throw new Error(`Failed to retrieve content for test generation: ${error.message}`);
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