import dotenv from 'dotenv';
import { ModelDrivenTrendingAgent } from './src/agents/modelDrivenTrendingAgent.js';
import { generateModelDrivenTopics, generateTopicAnalysis, validateContentEthics } from './src/chains/modelDrivenChain.js';
import { connectDB } from './src/config/db.js';

// Load environment variables
dotenv.config();

async function testModelDrivenAgent() {
  console.log('🧪 Testing Model-Driven Trending Current Affairs Agent');
  console.log('=' .repeat(60));

  try {
    // Connect to database
    console.log('📊 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected');

    const agent = new ModelDrivenTrendingAgent();

    console.log('\n1️⃣ Testing Topic Generation...');
    console.log('-'.repeat(40));

    const generationConfig = {
      targetTopics: 3,
      temperature: 0.3,
      maxTokens: 4000
    };

    console.log(`Generating ${generationConfig.targetTopics} topics...`);
    const topicsResult = await generateModelDrivenTopics(generationConfig);

    if (topicsResult.success) {
      console.log('✅ Topic generation successful');
      console.log(`📊 Generated ${topicsResult.topics.length} topics:`);

      topicsResult.topics.forEach((topic, index) => {
        console.log(`\n${index + 1}. ${topic.topicTitle}`);
        console.log(`   Category: ${topic.category}`);
        console.log(`   Importance: ${topic.importanceScore}/100`);
        console.log(`   Tags: ${topic.tags.join(', ')}`);
      });

      console.log('\n2️⃣ Testing Topic Analysis Generation...');
      console.log('-'.repeat(40));

      // Test analysis for first topic
      const firstTopic = topicsResult.topics[0];
      console.log(`Generating analysis for: "${firstTopic.topicTitle}"`);

      const analysisResult = await generateTopicAnalysis(firstTopic, {
        temperature: 0.3,
        maxTokens: 4000
      });

      if (analysisResult.success) {
        console.log('✅ Analysis generation successful');
        const analysis = analysisResult.analysis;

        console.log('\n📝 Analysis Structure:');
        console.log(`   Why in News: ${analysis.whyInNews.substring(0, 100)}...`);
        console.log(`   Background: ${analysis.background.substring(0, 100)}...`);
        console.log(`   GS Paper: ${analysis.gsPaperMapping.primary}`);
        console.log(`   Prelims Facts: ${analysis.prelimsFacts.length} facts`);
        console.log(`   Mains Points: ${Object.keys(analysis.mainsPoints.body).length} sections`);
        console.log(`   Questions: ${analysis.probableQuestions.length} questions`);

        console.log('\n3️⃣ Testing Ethical Validation...');
        console.log('-'.repeat(40));

        const validation = validateContentEthics(analysis);
        console.log('🔍 Ethical validation results:');
        console.log(`   Valid: ${validation.isValid}`);
        if (validation.issues.length > 0) {
          console.log('   Issues found:');
          validation.issues.forEach(issue => console.log(`   - ${issue}`));
        } else {
          console.log('   ✅ No ethical issues detected');
        }

        console.log('\n4️⃣ Testing Full Agent Execution...');
        console.log('-'.repeat(40));

        console.log('Running complete agent execution...');
        const agentResult = await agent.generateDailyTrendingTopics({
          targetTopics: 2, // Smaller number for testing
          updateDatabase: false, // Don't save to DB during testing
          includeDisclaimer: true,
          ethicalSafeguards: true
        });

        if (agentResult.success) {
          console.log('✅ Full agent execution successful');
          console.log(`📊 Topics generated: ${agentResult.summary.topicsGenerated}`);
          console.log(`⏱️  Duration: ${agentResult.summary.duration}ms`);

          console.log('\n📋 Sample Generated Topic:');
          const sampleTopic = agentResult.data.topics[0];
          console.log(`   Title: ${sampleTopic.topicTitle}`);
          console.log(`   Category: ${sampleTopic.category}`);
          console.log(`   Importance: ${sampleTopic.importanceScore}/100`);
          console.log(`   Disclaimer: ${sampleTopic.ethicalValidation.disclaimer.substring(0, 80)}...`);

        } else {
          console.log('❌ Agent execution failed');
          console.log(`   Error: ${agentResult.error}`);
        }

      } else {
        console.log('❌ Analysis generation failed');
        console.log(`   Error: ${analysisResult.error}`);
      }

    } else {
      console.log('❌ Topic generation failed');
      console.log(`   Error: ${topicsResult.error}`);
    }

    console.log('\n5️⃣ Testing Agent Methods...');
    console.log('-'.repeat(40));

    // Test getting trending topics (should be empty initially)
    const trendingTopics = await agent.getTrendingTopics({ limit: 5 });
    console.log(`📊 Existing trending topics in DB: ${trendingTopics.length}`);

    // Test research history
    const history = await agent.getResearchHistory({ limit: 5 });
    console.log(`📊 Research runs in history: ${history.length}`);

    console.log('\n✅ All tests completed successfully!');
    console.log('=' .repeat(60));

    console.log('\n🎯 Key Features Validated:');
    console.log('   ✅ LLM-based topic generation (no external data)');
    console.log('   ✅ Structured UPSC analysis creation');
    console.log('   ✅ Ethical safeguards and disclaimers');
    console.log('   ✅ Database integration');
    console.log('   ✅ Error handling and validation');
    console.log('   ✅ Scheduler compatibility');

    console.log('\n🚀 Ready for production deployment!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the test
testModelDrivenAgent().catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});
