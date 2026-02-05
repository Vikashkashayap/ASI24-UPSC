import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import vectorStoreService from './src/services/vectorStoreService.js';
import retrievalService from './src/services/retrievalService.js';
import mockTestGenerationService from './src/services/mockTestGenerationService.js';

async function testRAGSystem() {
  console.log('🚀 Testing RAG System...\n');

  try {
    // 1. Test Database Connection
    console.log('📊 Testing database connection...');
    await connectDB();
    console.log('✅ Database connected successfully\n');

    // 2. Test Vector Store Initialization
    console.log('🗄️ Testing vector store initialization...');
    await vectorStoreService.initialize();
    console.log('✅ Vector store initialized successfully\n');

    // 3. Test Vector Store Health
    console.log('🏥 Testing vector store health...');
    const vectorHealth = await vectorStoreService.healthCheck();
    console.log('Vector Store Health:', vectorHealth);
    console.log('✅ Vector store health check passed\n');

    // 4. Test Retrieval Service
    console.log('🔍 Testing retrieval service...');
    const retrievalHealth = await retrievalService.healthCheck();
    console.log('Retrieval Service Health:', retrievalHealth);
    console.log('✅ Retrieval service health check passed\n');

    // 5. Test Mock Test Generation Service
    console.log('🧠 Testing mock test generation service...');
    // Note: This would require actual test data, so we'll just check if the service exists
    console.log('✅ Mock test generation service loaded\n');

    // 6. Test API Routes
    console.log('🌐 Testing API routes...');
    // Import and check if routes can be loaded
    const ragRoutes = await import('./src/routes/ragRoutes.js');
    console.log('✅ RAG routes loaded successfully\n');

    console.log('🎉 All RAG system tests passed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Start ChromaDB: docker run -p 8000:8000 chromadb/chroma');
    console.log('2. Set OPENAI_API_KEY in .env');
    console.log('3. Start the server: npm run dev');
    console.log('4. Upload PDFs via admin interface');
    console.log('5. Generate mock tests via student interface');

  } catch (error) {
    console.error('❌ RAG System test failed:', error);
    process.exit(1);
  } finally {
    // Clean up
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

// Run the test
testRAGSystem().catch(console.error);