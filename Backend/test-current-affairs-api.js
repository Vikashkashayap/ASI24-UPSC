import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'adminai@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminai@#123';

console.log('🔍 Testing Current Affairs Pipeline...\n');

async function testGNewsAPI() {
  console.log('1️⃣  Testing GNews API directly...');
  
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    console.error('❌ GNEWS_API_KEY is not set in .env');
    return false;
  }

  try {
    const params = new URLSearchParams({
      country: 'in',
      lang: 'en',
      max: '5',
      apikey: apiKey,
    });

    const url = `https://gnews.io/api/v4/top-headlines?${params.toString()}`;
    console.log(`   Calling: ${url.split('apikey=')[0]}apikey=***`);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error('❌ GNews API Error:', response.status, response.statusText);
      console.error('   Response:', data);
      return false;
    }

    console.log(`✅ GNews API working! Got ${data.articles?.length || 0} articles`);
    if (data.articles?.length > 0) {
      console.log('   Sample:', data.articles[0].title.substring(0, 60) + '...');
    }
    return true;
  } catch (err) {
    console.error('❌ GNews API Error:', err.message);
    return false;
  }
}

async function getAdminToken() {
  console.log('\n2️⃣  Getting admin login token...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Login failed:', data.message);
      return null;
    }

    console.log('✅ Admin login successful');
    return data.token;
  } catch (err) {
    console.error('❌ Login Error:', err.message);
    return null;
  }
}

async function triggerPipeline(token) {
  console.log('\n3️⃣  Triggering current affairs pipeline...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/current-affairs/run-now`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Pipeline trigger failed:', data.message);
      return false;
    }

    console.log('✅ Pipeline triggered successfully!');
    console.log(`   ${data.message}`);
    console.log(`   Created: ${data.data?.created}, Skipped: ${data.data?.skipped}, Fetched: ${data.data?.totalFetched}`);
    return true;
  } catch (err) {
    console.error('❌ Pipeline Error:', err.message);
    return false;
  }
}

async function checkCurrentAffairs() {
  console.log('\n4️⃣  Checking current affairs in database...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/current-affairs?limit=5`);
    const data = await response.json();

    if (data.data?.items?.length > 0) {
      console.log(`✅ Found ${data.data.total} current affairs`);
      console.log('   Recent items:');
      data.data.items.slice(0, 3).forEach((item, i) => {
        console.log(`   ${i+1}. ${item.title.substring(0, 55)}...`);
      });
    } else {
      console.log('⚠️  No current affairs found in database');
    }
  } catch (err) {
    console.error('❌ Check Error:', err.message);
  }
}

async function main() {
  const gnewsOk = await testGNewsAPI();
  
  if (!gnewsOk) {
    console.error('\n❌ GNews API is not working. Check your GNEWS_API_KEY in .env');
    process.exit(1);
  }

  const token = await getAdminToken();
  if (!token) {
    console.error('\n❌ Could not get admin token. Check ADMIN_EMAIL and ADMIN_PASSWORD in .env');
    process.exit(1);
  }

  await triggerPipeline(token);
  await checkCurrentAffairs();

  console.log('\n✨ Test completed! Check the frontend at http://localhost:5173/current-affairs\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
