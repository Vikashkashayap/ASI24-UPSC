import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const ADMIN_TOKEN = 'YOUR_ADMIN_TOKEN'; // Replace with actual admin token

async function testStudentDetailAPI() {
  try {
    console.log('🧪 Testing Student Detail API...');

    // First get list of students
    console.log('\n1. Fetching students list...');
    const studentsResponse = await fetch(`${BASE_URL}/api/admin/students`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!studentsResponse.ok) {
      console.log('❌ Failed to fetch students list. Status:', studentsResponse.status);
      return;
    }

    const studentsData = await studentsResponse.json();
    console.log('✅ Students list fetched successfully');
    console.log(`📊 Found ${studentsData.data?.students?.length || 0} students`);

    if (studentsData.data?.students?.length > 0) {
      const firstStudent = studentsData.data.students[0];
      console.log(`\n👤 Testing with student: ${firstStudent.name} (${firstStudent._id})`);

      // Test student detail API
      console.log('\n2. Testing student detail API...');
      const detailResponse = await fetch(`${BASE_URL}/api/admin/students/${firstStudent._id}`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        console.log('✅ Student detail API working');
        console.log('📈 Performance Summary:', detailData.data?.performanceSummary);
      } else {
        console.log('❌ Student detail API failed:', detailResponse.status);
      }

      // Test prelims API
      console.log('\n3. Testing prelims API...');
      const prelimsResponse = await fetch(`${BASE_URL}/api/admin/students/${firstStudent._id}/prelims`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (prelimsResponse.ok) {
        const prelimsData = await prelimsResponse.json();
        console.log('✅ Prelims API working');
        console.log(`📝 Total prelims tests: ${prelimsData.data?.statistics?.totalTests || 0}`);
      } else {
        console.log('❌ Prelims API failed:', prelimsResponse.status);
      }

      // Test mains API
      console.log('\n4. Testing mains API...');
      const mainsResponse = await fetch(`${BASE_URL}/api/admin/students/${firstStudent._id}/mains`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (mainsResponse.ok) {
        const mainsData = await mainsResponse.json();
        console.log('✅ Mains API working');
        console.log(`📋 Total mains evaluations: ${mainsData.data?.statistics?.totalEvaluations || 0}`);
      } else {
        console.log('❌ Mains API failed:', mainsResponse.status);
      }

      // Test activity API
      console.log('\n5. Testing activity API...');
      const activityResponse = await fetch(`${BASE_URL}/api/admin/students/${firstStudent._id}/activity`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        console.log('✅ Activity API working');
        console.log(`📅 Total activities: ${activityData.data?.totalActivities || 0}`);
      } else {
        console.log('❌ Activity API failed:', activityResponse.status);
      }
    }

    console.log('\n🎉 API testing completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testStudentDetailAPI();