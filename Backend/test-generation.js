import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';

dotenv.config();

async function testGeneration() {
  try {
    await connectDB();
    console.log('✅ Connected to database');

    // Import service after DB connection
    const { default: premilTestGenerationService } = await import('./src/services/premilTestGenerationService.js');
    const PremilQuestion = (await import('./src/models/PremilQuestion.js')).default;

    console.log('🧪 Testing question generation...');

    const testParams = {
      subject: 'Geography',
      topic: 'Indian Geography',
      difficulty: 'easy',
      questionCount: 5, // Minimum required by schema
      studentId: '507f1f77bcf86cd799439011'
    };

    console.log('📋 Test parameters:', testParams);

    // Test generation
    const result = await premilTestGenerationService.generateOrRetrieveTest(testParams);

    console.log('\n✅ Generation Result:');
    console.log('  Success:', result.success);
    console.log('  Cached:', result.cached);
    console.log('  Total Questions:', result.totalQuestions);
    console.log('  AI Cost:', result.aiCost, 'cents');
    console.log('  Questions:', result.questions.length);

    if (result.questions && result.questions.length > 0) {
      console.log('\n📝 Sample Question:');
      const q = result.questions[0];
      console.log('  Question:', q.question);
      console.log('  Options:', q.options);
      console.log('  Index:', q.questionIndex);
    }

    // Verify questions are saved
    const testKey = PremilQuestion.generateTestKey(
      testParams.subject,
      testParams.topic,
      testParams.difficulty,
      testParams.questionCount
    );

    const savedCount = await PremilQuestion.countDocuments({ testKey });
    console.log(`\n💾 Questions saved in DB for test_key "${testKey}": ${savedCount}`);

    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testGeneration();