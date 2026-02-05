import { ChromaClient } from 'chromadb';
import { OpenAIEmbeddings } from '@langchain/openai';
import DocumentChunk from '../models/DocumentChunk.js';

class VectorStoreService {
  constructor() {
    this.client = null;
    this.collection = null;
    this.embeddings = null;
    this.collectionName = 'upsc_prelims_chunks';
    this.isInitialized = false;
  }

  /**
   * Initialize ChromaDB client and collection
   */
  async initialize() {
    try {
      if (this.isInitialized) return;

      // Initialize ChromaDB client
      this.client = new ChromaClient({
        path: process.env.CHROMA_DB_URL || 'http://localhost:8000'
      });

      // Initialize OpenAI embeddings
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: 'text-embedding-3-small', // Cost-effective for large documents
        maxRetries: 3
      });

      // Create or get collection
      try {
        this.collection = await this.client.getCollection({
          name: this.collectionName
        });
      } catch (error) {
        // Collection doesn't exist, create it
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          metadata: {
            description: 'UPSC Prelims study material chunks with embeddings'
          }
        });
      }

      this.isInitialized = true;
      console.log('✅ Vector store initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize vector store:', error);
      throw new Error(`Vector store initialization failed: ${error.message}`);
    }
  }

  /**
   * Add document chunks to vector store
   */
  async addChunks(chunks, documentId) {
    try {
      const texts = chunks.map(chunk => chunk.text);
      const metadatas = chunks.map(chunk => ({
        documentId: documentId.toString(),
        chunkIndex: chunk.chunkIndex,
        subject: chunk.metadata.subject,
        topic: chunk.metadata.topic,
        wordCount: chunk.wordCount,
        filename: chunk.metadata.filename
      }));
      const ids = chunks.map(chunk => chunk.vectorId);

      let vectorStoreError = null;

      // Try to initialize Chroma and add embeddings, but don't fail the whole
      // pipeline if the vector store is unavailable. We can still rely on
      // MongoDB-backed retrieval as a fallback.
      try {
        await this.initialize();

        // Generate embeddings
        const embeddings = await this.embeddings.embedDocuments(texts);

        // Add to ChromaDB
        await this.collection.add({
          ids,
          embeddings,
          documents: texts,
          metadatas
        });

        console.log(`✅ Added ${chunks.length} chunks to ChromaDB collection "${this.collectionName}"`);
      } catch (error) {
        vectorStoreError = error;
        console.warn(
          '⚠️ Vector store unavailable, skipping ChromaDB add. Retrieval will fall back to MongoDB only:',
          error.message
        );
      }

      // Store chunk metadata in MongoDB
      const mongoChunks = chunks.map(chunk => ({
        documentId,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        wordCount: chunk.wordCount,
        startPosition: 0, // TODO: Calculate actual positions
        endPosition: chunk.text.length,
        vectorId: chunk.vectorId,
        metadata: {
          subject: chunk.metadata.subject,
          topic: chunk.metadata.topic,
          keywords: this.extractKeywords(chunk.text),
          summary: this.generateSummary(chunk.text)
        }
      }));

      await DocumentChunk.insertMany(mongoChunks);

      console.log(`✅ Stored ${chunks.length} chunks in MongoDB for document ${documentId}`);

      // If Chroma failed, we still treat the operation as successful from the
      // document-processing point of view, but surface the degraded state in
      // the return value for logging/diagnostics.
      if (vectorStoreError) {
        return {
          added: chunks.length,
          vectorStore: 'unavailable',
          error: vectorStoreError.message
        };
      }

      return { added: chunks.length, vectorStore: 'ok' };
    } catch (error) {
      console.error('❌ Failed to add chunks to vector store:', error);
      throw new Error(`Failed to add chunks: ${error.message}`);
    }
  }

  /**
   * Search for relevant chunks
   */
  async search(query, options = {}) {
    try {
      await this.initialize();

      const {
        limit = 10,
        subject = null,
        topic = null,
        difficulty = null,
        minScore = 0.7
      } = options;

      // Generate embedding for query
      const queryEmbedding = await this.embeddings.embedQuery(query);

      // Build where clause for filtering
      const where = {};
      if (subject) where.subject = subject;
      if (topic) where.topic = topic;
      if (difficulty) where.difficulty = difficulty;

      // Search in ChromaDB
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit * 2, // Get more results for filtering
        where: Object.keys(where).length > 0 ? where : undefined
      });

      // Filter by score and format results
      const filteredResults = results.ids[0]
        .map((id, index) => ({
          id,
          score: results.distances[0][index],
          document: results.documents[0][index],
          metadata: results.metadatas[0][index]
        }))
        .filter(result => result.score >= minScore)
        .slice(0, limit);

      return filteredResults;
    } catch (error) {
      console.error('❌ Failed to search vector store:', error);
      throw new Error(`Search failed: ${error.message}`);
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