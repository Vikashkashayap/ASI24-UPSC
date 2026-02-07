import fetch from 'node-fetch';

async function testAPI() {
  try {
    console.log('🧪 Testing UPSC AI Test Generation API...');

    const response = await fetch('http://localhost:5000/api/premil/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail auth but we can see the flow
      },
      body: JSON.stringify({
        subject: 'Geography',
        topic: 'Indian Geography',
        difficulty: 'easy',
        questionCount: 2
      })
    });

    const data = await response.json();
    console.log('📥 API Response Status:', response.status);
    console.log('📄 API Response:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ API Test failed:', error.message);
  }
}

testAPI();