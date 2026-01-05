/**
 * Test Script for Student Profiler Agent
 * 
 * Usage:
 * 1. Make sure backend server is running on http://localhost:5000
 * 2. Update EMAIL and PASSWORD below
 * 3. Run: node test-student-profiler.js
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';
const EMAIL = 'test@example.com'; // ⚠️ UPDATE THIS
const PASSWORD = 'password123';   // ⚠️ UPDATE THIS

async function testStudentProfiler() {
  try {
    console.log('='.repeat(60));
    console.log('🧪 Testing Student Profiler Agent');
    console.log('='.repeat(60));
    console.log('');

    // Step 1: Login
    console.log('🔐 Step 1: Logging in...');
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    
    if (!loginRes.ok) {
      const errorData = await loginRes.json();
      throw new Error(`Login failed: ${errorData.message || loginRes.statusText}`);
    }
    
    const loginData = await loginRes.json();
    if (!loginData.token) {
      throw new Error('No token received from login');
    }
    
    const token = loginData.token;
    console.log('✅ Login successful');
    console.log('');

    // Step 2: Generate Study Plan
    console.log('📋 Step 2: Generating study plan...');
    const requestBody = {
      targetYear: '2026',
      dailyHours: 6,
      weakSubjects: ['Polity', 'Economy'],
      examStage: 'Prelims',
      currentDate: new Date().toISOString().split('T')[0], // Today's date
    };

    console.log('📤 Request:', JSON.stringify(requestBody, null, 2));
    console.log('');

    const planRes = await fetch(`${API_URL}/api/agents/student-profiler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const planData = await planRes.json();
    
    if (!planRes.ok) {
      console.error('❌ Request failed:', planRes.status, planRes.statusText);
      console.error('Response:', JSON.stringify(planData, null, 2));
      return;
    }

    if (planData.success) {
      console.log('✅ Study plan generated successfully!');
      console.log('');
      console.log('📊 Summary:');
      console.log('  Strategy:', planData.data.summary.strategy);
      console.log('  Focus Subjects:', planData.data.summary.focusSubjects.join(', '));
      console.log('  Daily Load:', planData.data.summary.dailyLoadType);
      console.log('');
      
      console.log('📅 Daily Plan (7 days):');
      planData.data.dailyPlan.forEach((day, idx) => {
        console.log(`  ${idx + 1}. ${day.day}: ${day.subject} - ${day.topic} (${day.durationHours}h) [${day.activity}]`);
      });
      console.log('');

      console.log('📆 Weekly Plan:');
      planData.data.weeklyPlan.forEach((week) => {
        console.log(`  ${week.week}: Focus on ${week.primaryFocus.join(', ')}, Revision: ${week.revisionDays.join(', ')}, Test: ${week.testDay}`);
      });
      console.log('');

      console.log('🔄 Revision Schedule (first 3 topics):');
      planData.data.revisionSchedule.slice(0, 3).forEach((rev) => {
        console.log(`  ${rev.topic}: Revise after ${rev.revisionDaysAfter.join(', ')} days`);
      });
      console.log('');

      console.log('⚙️  Dynamic Rules:');
      planData.data.dynamicRules.forEach((rule, idx) => {
        console.log(`  ${idx + 1}. ${rule}`);
      });
      console.log('');

      if (planData.metadata) {
        console.log('📈 Metadata:');
        console.log('  Model:', planData.metadata.model);
        console.log('  Tokens Used:', planData.metadata.usage?.total_tokens || 'N/A');
        console.log('  Generated At:', planData.metadata.generatedAt);
      }
    } else {
      console.error('❌ Error:', planData.message);
      console.error('Details:', JSON.stringify(planData, null, 2));
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Test completed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ Test failed!');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testStudentProfiler();

