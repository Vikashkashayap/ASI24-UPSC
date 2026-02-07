import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// OpenRouter client for Claude models
class OpenRouterChat {
  constructor(options) {
    this.apiKey = options.apiKey;
    this.modelName = options.modelName || 'anthropic/claude-3.5-sonnet';
    this.temperature = options.temperature || 0.3;
    this.maxTokens = options.maxTokens || 4000;
    this.baseURL = 'https://openrouter.ai/api/v1';
  }

  async invoke(messages) {
    try {
      const requestBody = {
        model: this.modelName,
        messages: messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens
      };

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://studentportal.mentorsdaily.com',
          'X-Title': 'UPSC AI Test Generator'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content
      };
    } catch (error) {
      console.error('❌ OpenRouter API call failed:', error.message);
      throw error;
    }
  }
}

async function testAI() {
  try {
    console.log('🤖 Testing OpenRouter AI integration...');

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      console.error('❌ OPENROUTER_API_KEY not found in environment');
      console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('ROUTER') || k.includes('AI')));
      return;
    }

    // Create OpenRouter client
    const client = new OpenRouterChat({
      apiKey: openRouterKey,
      modelName: 'anthropic/claude-3.5-sonnet',
      temperature: 0.3,
      maxTokens: 1000
    });

    // Test with simple educational content
    const testContext = `
Geography is the study of Earth's landscapes, peoples, places and environments.
India is located in South Asia and is the seventh-largest country by land area.
The capital of India is New Delhi.
India has 29 states and 7 union territories.
The major rivers in India include Ganges, Yamuna, and Brahmaputra.
The Himalayas form the northern boundary of India.
`;

    const prompt = `# TEST QUESTION GENERATION

Generate 2 simple multiple choice questions about Indian geography using this context:

${testContext}

Return JSON format:
{
  "questions": [
    {
      "question": "Question here?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A",
      "explanation": "Brief explanation"
    }
  ]
}`;

    const messages = [
      {
        role: 'system',
        content: 'You are a question generator. Generate clear, factual questions.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    console.log('📡 Sending test request to OpenRouter...');
    const response = await client.invoke(messages);

    console.log('✅ AI Response received');
    console.log('📝 Raw response:', response.content);

    // Try to parse JSON
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('📋 Parsed questions:', parsed.questions?.length || 0);

        if (parsed.questions && parsed.questions.length > 0) {
          console.log('🎉 SUCCESS: AI generated valid questions!');
          parsed.questions.forEach((q, i) => {
            console.log(`${i+1}. ${q.question}`);
            console.log(`   Answer: ${q.correctAnswer}`);
          });
        } else {
          console.log('❌ No questions generated');
        }
      } else {
        console.log('❌ No JSON found in response');
      }
    } catch (parseError) {
      console.log('❌ Failed to parse JSON:', parseError.message);
    }

  } catch (error) {
    console.error('❌ AI Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testAI();