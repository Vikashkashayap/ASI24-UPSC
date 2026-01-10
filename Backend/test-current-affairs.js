import mongoose from 'mongoose';
import { CurrentAffairsResearchAgent } from './src/agents/currentAffairsResearchAgent.js';

// Test script for current affairs functionality
async function testCurrentAffairs() {
  try {
    console.log('Testing Current Affairs Research Agent...');

    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/upsc-mentor', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to database');

    // Create agent instance
    const agent = new CurrentAffairsResearchAgent();

    // Test research execution
    console.log('Starting research...');
    const result = await agent.executeResearch({
      dateRange: {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date()
      },
      minRelevanceScore: 30,
      maxTopics: 5,
      generateAnalysis: false // Skip AI analysis for this test
    });

    console.log('Research completed successfully!');
    console.log('Summary:', result.summary);
    console.log('Topics found:', result.data.trendingTopics.length);

    // Test getting trending topics
    console.log('Testing getTrendingTopics...');
    const topics = await agent.getTrendingTopics({ limit: 5 });
    console.log('Retrieved topics:', topics.length);

    await mongoose.disconnect();
    console.log('Test completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testCurrentAffairs();
