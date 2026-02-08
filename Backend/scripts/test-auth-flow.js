import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const API_URL = 'http://localhost:5000';

async function testAuthFlow() {
  console.log('🚀 Starting Auth Flow Verification...');

  try {
    // 1. Admin Login
    console.log('\n1. Logging in as Admin...');
    const adminLoginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    const adminToken = adminLoginRes.data.token;
    console.log('✅ Admin logged in successfully');

    // 2. Create Student
    console.log('\n2. Creating a new student...');
    const studentEmail = `test_student_${Date.now()}@example.com`;
    const createStudentRes = await axios.post(
      `${API_URL}/api/admin/students`,
      { name: 'Test Student', email: studentEmail },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const tempPassword = createStudentRes.data.data.tempPassword;
    console.log(`✅ Student created: ${studentEmail} with temp password: ${tempPassword}`);

    // 3. Student Login (with temp password)
    console.log('\n3. Logging in as Student with temporary password...');
    const studentLoginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: studentEmail,
      password: tempPassword
    });
    const studentToken = studentLoginRes.data.token;
    const { mustChangePassword } = studentLoginRes.data.user;
    console.log(`✅ Student logged in. mustChangePassword: ${mustChangePassword}`);

    if (!mustChangePassword) {
      throw new Error('FAILED: student.mustChangePassword should be true');
    }

    // 4. Change Password
    console.log('\n4. Changing student password...');
    const newPassword = 'newSecurePassword123';
    await axios.post(
      `${API_URL}/api/auth/change-password`,
      { newPassword },
      { headers: { Authorization: `Bearer ${studentToken}` } }
    );
    console.log('✅ Password changed successfully');

    // 5. Verify Login with new password
    console.log('\n5. Verifying login with new password...');
    const finalLoginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: studentEmail,
      password: newPassword
    });
    console.log(`✅ Login successful with new password! mustChangePassword: ${finalLoginRes.data.user.mustChangePassword}`);

    console.log('\n✨ ALL TESTS PASSED! ✨');

  } catch (error) {
    if (error.response) {
      console.error('\n❌ TEST FAILED (Response Error):', error.response.status, error.response.data);
    } else {
      console.error('\n❌ TEST FAILED:', error.message);
    }
    process.exit(1);
  }
}

testAuthFlow();
