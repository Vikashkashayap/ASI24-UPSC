import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import Document from '../models/Document.js';
import DocumentChunk from '../models/DocumentChunk.js';
import vectorStoreService from './vectorStoreService.js';

class DocumentProcessingService {
  constructor() {
    // Initialize text splitter with UPSC-specific chunk sizes
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1500, // ~300-500 words depending on content
      chunkOverlap: 200, // Overlap to maintain context
      separators: ['\n\n', '\n', '. ', ' ', ''] // Prioritize paragraph breaks
    });
  }

  /**
   * Extract text from PDF file
   */
  async extractTextFromPDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);

      return {
        text: data.text,
        pages: data.numpages,
        info: data.info
      };
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Clean and preprocess extracted text
   */
  cleanText(text) {
    return text
      // Remove excessive whitespace
      .replace(/\n\s*\n/g, '\n\n')
      // Remove page numbers and headers/footers (basic cleanup)
      .replace(/\n\s*\d+\s*\n/g, '\n')
      // Normalize spaces
      .replace(/[ \t]+/g, ' ')
      // Remove leading/trailing whitespace
      .trim();
  }

  /**
   * Split text into chunks suitable for embedding
   */
  async splitTextIntoChunks(text, metadata = {}) {
    try {
      const cleanedText = this.cleanText(text);
      const docs = await this.textSplitter.createDocuments([cleanedText], [metadata]);

      return docs.map((doc, index) => ({
        text: doc.pageContent,
        chunkIndex: index,
        wordCount: doc.pageContent.split(/\s+/).length,
        metadata: doc.metadata
      }));
    } catch (error) {
      console.error('Error splitting text into chunks:', error);
      throw new Error(`Failed to split text: ${error.message}`);
    }
  }

  /**
   * Process uploaded PDF document
   */
  async processDocument(documentId, filePath) {
    try {
      // Update document status to processing
      await Document.findByIdAndUpdate(documentId, {
        processingStatus: 'processing'
      });

      // Extract text from PDF
      const { text, pages } = await this.extractTextFromPDF(filePath);

      // Many coaching PDFs / scanned question papers are image-based with no
      // selectable text layer. In that case pdf-parse returns an empty string,
      // and there is nothing we can index for RAG. Detect this early and return
      // a clear, user-friendly error.
      if (!text || text.trim().length === 0) {
        throw new Error(
          'No text content found in PDF. This file appears to be scanned/image-only – please upload a PDF with selectable text.'
        );
      }

      // Get document metadata
      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Split text into chunks
      const chunks = await this.splitTextIntoChunks(text, {
        subject: document.subject,
        topic: document.topic,
        filename: document.filename,
        documentId: document._id.toString()
      });

      // Generate vector IDs for ChromaDB and prepare chunks for database
      const chunksWithVectorIds = chunks.map((chunk, index) => ({
        ...chunk,
        vectorId: `doc_${documentId}_chunk_${index}`,
        documentId,
        chunkIndex: index,
        startPosition: index * 1500, // Approximate character position
        endPosition: (index + 1) * 1500,
        metadata: {
          subject: document.subject,
          topic: document.topic,
          filename: document.filename,
          ...chunk.metadata
        }
      }));

      // Generate embeddings and store in vector database using addChunks method
      let embeddingsGenerated = 0;
      try {
        const vectorResult = await vectorStoreService.addChunks(chunksWithVectorIds, documentId);
        embeddingsGenerated = vectorResult.added || chunksWithVectorIds.length;
        console.log(`🔍 Generated embeddings for ${embeddingsGenerated} chunks`);
        if (vectorResult.vectorStore === 'unavailable') {
          console.warn('⚠️ Vector store unavailable, stored chunks in MongoDB only');
        }
      } catch (vectorError) {
        console.warn('⚠️ Vector store error (continuing with MongoDB only):', vectorError);
        // Continue processing even if vector store fails
        embeddingsGenerated = 0; // No embeddings generated
      }

      // Update document metadata
      await Document.findByIdAndUpdate(documentId, {
        totalPages: pages,
        totalChunks: chunksWithVectorIds.length,
        processingStatus: 'completed',
        metadata: {
          extractedText: text.substring(0, 1000) + '...', // Store preview
          textLength: text.length,
          wordCount: text.split(/\s+/).length
        }
      });

      // Clean up uploaded file after processing
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded file:', cleanupError);
      }

      return {
        documentId,
        chunksCreated: chunksWithVectorIds.length,
        embeddingsGenerated,
        totalWords: text.split(/\s+/).length
      };

    } catch (error) {
      console.error('Error processing document:', error);

      // Update document status to failed
      await Document.findByIdAndUpdate(documentId, {
        processingStatus: 'failed',
        processingError: error.message
      });

      throw error;
    }
  }

  /**
   * Validate PDF file
   */
  validatePDFFile(file) {
    const allowedTypes = ['application/pdf'];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Only PDF files are allowed');
    }

    if (file.size > maxSize) {
      throw new Error('File size exceeds 50MB limit');
    }

    return true;
  }

  /**
   * Get document processing statistics
   */
  async getDocumentStats(userId) {
    const stats = await Document.aggregate([
      { $match: { uploadedBy: userId } },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          totalPages: { $sum: '$totalPages' },
          totalChunks: { $sum: '$totalChunks' },
          completedDocuments: {
            $sum: { $cond: [{ $eq: ['$processingStatus', 'completed'] }, 1, 0] }
          },
          failedDocuments: {
            $sum: { $cond: [{ $eq: ['$processingStatus', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);

    return stats[0] || {
      totalDocuments: 0,
      totalPages: 0,
      totalChunks: 0,
      completedDocuments: 0,
      failedDocuments: 0
    };
  }
}

export default new DocumentProcessingService();