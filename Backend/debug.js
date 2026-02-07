import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';

dotenv.config();

async function debugDatabase() {
  try {
    await connectDB();
    console.log('✅ Connected to database');

    const DocumentChunk = (await import('./src/models/DocumentChunk.js')).default;
    const count = await DocumentChunk.countDocuments();
    console.log('📊 Total chunks in database:', count);

    if (count > 0) {
      const sample = await DocumentChunk.findOne({}, 'text metadata').limit(1);
      console.log('📄 Sample chunk:', {
        subject: sample?.metadata?.subject,
        topic: sample?.metadata?.topic,
        wordCount: sample?.wordCount,
        textLength: sample?.text?.length,
        textPreview: sample?.text?.substring(0, 200) + '...'
      });

      // Show all available subjects/topics
      const stats = await DocumentChunk.aggregate([
        {
          $group: {
            _id: {
              subject: '$metadata.subject',
              topic: '$metadata.topic'
            },
            count: { $sum: 1 },
            totalWords: { $sum: '$wordCount' }
          }
        },
        { $sort: { '_id.subject': 1, '_id.topic': 1 } }
      ]);

      console.log('📋 Available content:');
      stats.forEach(stat => {
        console.log(`  - ${stat._id.subject} → ${stat._id.topic}: ${stat.count} chunks, ${stat.totalWords} words`);
      });

    } else {
      console.log('⚠️ No chunks found - need to upload documents first');
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    process.exit(0);
  }
}

debugDatabase();