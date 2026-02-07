import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';

dotenv.config();

async function addTestContent() {
  try {
    await connectDB();
    console.log('✅ Connected to database');

    const Document = (await import('./src/models/Document.js')).default;
    const DocumentChunk = (await import('./src/models/DocumentChunk.js')).default;

    // Clear existing chunks
    await DocumentChunk.deleteMany({});
    console.log('🧹 Cleared existing chunks');

    // Create a test document
    const testDoc = new Document({
      filename: 'indian-geography-manual.pdf',
      originalName: 'Indian Geography Manual.pdf',
      filePath: '/uploads/test.pdf',
      fileSize: 1024000,
      mimeType: 'application/pdf',
      subject: 'Geography',
      topic: 'Indian Geography',
      uploadedBy: '507f1f77bcf86cd799439011' // Valid ObjectId format
    });

    const savedDoc = await testDoc.save();
    console.log('📄 Created test document:', savedDoc._id);

    // Add high-quality test chunks
    const chunkTexts = [
      `India is a vast country located in South Asia. It is the seventh-largest country in the world by land area, covering approximately 3.3 million square kilometers. India shares its borders with Pakistan to the northwest, China and Nepal to the north, Bhutan to the northeast, Bangladesh and Myanmar to the east, and Sri Lanka to the south across the Palk Strait.`,
      `The geography of India is extremely diverse, with landscapes ranging from the snow-capped peaks of the Himalayas in the north to the tropical beaches of Kerala in the south. The country can be divided into several major geographical regions: the Northern Mountains, the Indo-Gangetic Plain, the Thar Desert, the Central Highlands, and the Coastal Plains.`,
      `India has 29 states and 7 union territories. Some of the major states include Maharashtra, Uttar Pradesh, Bihar, West Bengal, and Tamil Nadu. The capital of India is New Delhi, which is a union territory and serves as the seat of the central government. Other important cities include Mumbai, Kolkata, Chennai, Bangalore, and Hyderabad.`,
      `India's major rivers include the Ganges, Yamuna, Brahmaputra, Godavari, Krishna, and Kaveri. The Ganges River is considered sacred by Hindus and is one of the most important rivers in Indian culture and economy. The river systems of India play a crucial role in agriculture, transportation, and the livelihood of millions of people.`
    ];

    const testChunks = chunkTexts.map((text, index) => ({
      documentId: savedDoc._id,
      chunkIndex: index,
      text: text,
      wordCount: text.split(' ').length,
      startPosition: index * 1000, // Approximate positions
      endPosition: (index + 1) * 1000,
      vectorId: `doc_${savedDoc._id}_chunk_${index}`,
      metadata: {
        subject: 'Geography',
        topic: 'Indian Geography',
        keywords: index === 0 ? ['India', 'South Asia', 'land area', 'borders'] :
                 index === 1 ? ['Himalayas', 'geographical regions', 'diverse landscapes'] :
                 index === 2 ? ['states', 'union territories', 'capital', 'New Delhi'] :
                               ['rivers', 'Ganges', 'agriculture', 'economy'],
        summary: index === 0 ? 'Overview of India\'s geographical location and size' :
                index === 1 ? 'Description of India\'s diverse geographical features' :
                index === 2 ? 'Information about Indian states and major cities' :
                              'Overview of India\'s major river systems'
      }
    }));

    await DocumentChunk.insertMany(testChunks);
    console.log(`✅ Added ${testChunks.length} high-quality test chunks`);

    // Verify the content
    const count = await DocumentChunk.countDocuments();
    const sample = await DocumentChunk.findOne({}, 'text metadata').limit(1);

    console.log(`📊 Total chunks: ${count}`);
    console.log('📄 Sample chunk preview:', sample?.text?.substring(0, 100) + '...');

    console.log('🎉 Test content added successfully!');
    console.log('📝 You can now test question generation with: Geography - Indian Geography');

  } catch (error) {
    console.error('❌ Error adding test content:', error);
  } finally {
    process.exit(0);
  }
}

addTestContent();