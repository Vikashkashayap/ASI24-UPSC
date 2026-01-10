// Quick test script to verify routes are working
import axios from 'axios';

const baseURL = 'http://localhost:5000';

async function testRoutes() {
  console.log('🧪 Testing API routes...\n');

  try {
    // Test health endpoint
    console.log('Testing /api/health...');
    const healthRes = await axios.get(`${baseURL}/api/health`);
    console.log('✅ Health check passed:', healthRes.data);

    // Test test routes connection
    console.log('\nTesting /api/tests/test-connection...');
    const testRes = await axios.get(`${baseURL}/api/tests/test-connection`);
    console.log('✅ Test routes working:', testRes.data);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testRoutes();
