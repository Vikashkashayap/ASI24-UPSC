import { OpenAIEmbeddings } from '@langchain/openai';
import DocumentChunk from '../models/DocumentChunk.js';

// Temporary: Using MongoDB-only approach until ChromaDB embedded mode is resolved
// TODO: Implement proper vector database when ChromaDB embedded mode works

class VectorStoreService {
  constructor() {
    this.isInitialized = false;
    this.embeddings = null;
  }

  /**
   * Initialize vector store service (MongoDB-only for now)
   */
  async initialize() {
    try {
      if (this.isInitialized) return;

      // Initialize OpenAI embeddings via OpenRouter (for future use)
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY,
        modelName: 'text-embedding-3-small',
        maxRetries: 3,
        configuration: {
          baseURL: process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : undefined
        }
      });

      this.isInitialized = true;
      console.log('✅ Vector store service initialized (MongoDB-only mode)');
    } catch (error) {
      console.error('❌ Failed to initialize vector store service:', error);
      // Don't throw error - allow system to work with MongoDB only
      this.isInitialized = false;
    }
  }

  /**
   * Add document chunks to MongoDB storage (ChromaDB temporarily disabled)
   * CRITICAL: Admin uploads notes -> stores in MongoDB for retrieval
   */
  async addChunks(chunks, documentId) {
    try {
      console.log(`📄 Processing ${chunks.length} chunks for document ${documentId}`);

      // Store chunks in MongoDB only (ChromaDB disabled for now)
      const mongoChunks = chunks.map(chunk => ({
        documentId,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        wordCount: chunk.wordCount,
        startPosition: chunk.startPosition || 0,
        endPosition: chunk.endPosition || chunk.text.length,
        vectorId: chunk.vectorId,
        metadata: {
          subject: chunk.metadata.subject,
          topic: chunk.metadata.topic,
          keywords: this.extractKeywords(chunk.text),
          summary: this.generateSummary(chunk.text)
        }
      }));

      await DocumentChunk.insertMany(mongoChunks);
      console.log(`💾 Stored ${chunks.length} chunks in MongoDB for document ${documentId}`);

      return {
        added: chunks.length,
        embeddingsGenerated: 0, // No embeddings generated (ChromaDB disabled)
        vectorStore: 'mongodb-only',
        message: 'Chunks stored in MongoDB (vector search temporarily disabled)'
      };
    } catch (error) {
      console.error('❌ Failed to add chunks to storage:', error);
      throw new Error(`Failed to add chunks: ${error.message}`);
    }
  }

  /**
   * Search MongoDB for relevant UPSC notes chunks (ChromaDB temporarily disabled)
   * CRITICAL: Students get questions ONLY from admin-uploaded notes
   */
  async search(query, options = {}) {
    try {
      const {
        limit = 10,
        subject = null,
        topic = null,
        difficulty = null,
        minScore = 0.75
      } = options;

      console.log(`🔍 Searching MongoDB for chunks: subject=${subject}, topic=${topic}, query="${query.substring(0, 50)}..."`);

      // Build MongoDB query
      const mongoQuery = {};
      if (subject) mongoQuery['metadata.subject'] = subject;
      if (topic) mongoQuery['metadata.topic'] = topic;

      // Use text search on the chunk content
      if (query && query.trim()) {
        // Simple text matching for now (can be enhanced with better search)
        mongoQuery.$or = [
          { text: { $regex: query, $options: 'i' } },
          { 'metadata.keywords': { $in: query.toLowerCase().split(' ') } },
          { 'metadata.summary': { $regex: query, $options: 'i' } }
        ];
      }

      const chunks = await DocumentChunk.find(mongoQuery)
        .limit(limit * 2)
        .populate('documentId', 'filename subject topic')
        .sort({ createdAt: -1 });

      // Convert to consistent format and score based on relevance
      const results = chunks.map((chunk, index) => ({
        id: chunk.vectorId,
        score: Math.max(0.1, 1.0 - (index * 0.1)), // Decreasing score
        document: chunk.text,
        metadata: {
          subject: chunk.metadata.subject,
          topic: chunk.metadata.topic,
          filename: chunk.metadata.filename,
          documentId: chunk.documentId._id.toString(),
          chunkIndex: chunk.chunkIndex,
          keywords: chunk.metadata.keywords,
          summary: chunk.metadata.summary
        },
        mongoData: chunk
      }));

      console.log(`📄 Found ${results.length} chunks in MongoDB search`);
      return results;

    } catch (error) {
      console.error('❌ Failed to search MongoDB:', error);
      return []; // Return empty results instead of throwing
    }
  }

  /**
   * Delete chunks by document ID
   */
  async deleteDocumentChunks(documentId) {
    try {
      await this.initialize();

      // Get all chunk IDs for this document
      const chunks = await DocumentChunk.find({ documentId }, { vectorId: 1 });
      const vectorIds = chunks.map(chunk => chunk.vectorId);

      if (vectorIds.length > 0) {
        // Delete from ChromaDB
        await this.collection.delete({
          ids: vectorIds
        });

        // Delete from MongoDB
        await DocumentChunk.deleteMany({ documentId });
      }

      console.log(`🗑️ Deleted ${vectorIds.length} chunks for document ${documentId}`);
      return { deleted: vectorIds.length };
    } catch (error) {
      console.error('❌ Failed to delete document chunks:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Get collection statistics
   */
  async getStats() {
    try {
      await this.initialize();

      const count = await this.collection.count();
      const mongoCount = await DocumentChunk.countDocuments();

      return {
        chromaCount: count,
        mongoCount,
        isConsistent: count === mongoCount
      };
    } catch (error) {
      console.error('❌ Failed to get stats:', error);
      throw new Error(`Stats retrieval failed: ${error.message}`);
    }
  }

  /**
   * Extract keywords from text (simple implementation)
   */
  extractKeywords(text) {
    // Simple keyword extraction - can be enhanced with NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Generate simple summary from text
   */
  generateSummary(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length === 0) return text.substring(0, 100) + '...';

    // Return first sentence as summary
    return sentences[0].trim() + '.';
  }

  /**
   * Health check for vector store
   */
  async healthCheck() {
    try {
      await this.initialize();
      const stats = await this.getStats();
      return {
        status: 'healthy',
        collection: this.collectionName,
        ...stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

export default new VectorStoreService();