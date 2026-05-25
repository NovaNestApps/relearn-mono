// test-auth.ts
// Run this with: npx tsx test-auth.ts

import axios from 'axios';

const API_URL = 'http://localhost:3001/api/auth';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  accessToken: string;
  refreshToken: string;
}

async function testAuth() {
  console.log('=== Authentication Test ===\n');

  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
  };

  try {
    // Test 1: Register (or skip if user exists)
    console.log('1. Testing Registration...');
    try {
      const registerResponse = await axios.post<AuthResponse>(
        `${API_URL}/register`,
        testUser
      );
      console.log('✅ Registration successful');
      console.log('User ID:', registerResponse.data.user.id);
      console.log('Access Token:', registerResponse.data.accessToken.substring(0, 30) + '...');
      console.log('');
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.error === 'User already exists') {
        console.log('ℹ️  User already exists, proceeding to login test\n');
      } else {
        console.error('❌ Registration failed:', error.response?.data || error.message);
        console.log('');
      }
    }

    // Test 2: Login
    console.log('2. Testing Login...');
    try {
      const loginResponse = await axios.post<AuthResponse>(
        `${API_URL}/login`,
        {
          email: testUser.email,
          password: testUser.password,
        }
      );
      console.log('✅ Login successful');
      console.log('User ID:', loginResponse.data.user.id);
      console.log('User Email:', loginResponse.data.user.email);
      console.log('Access Token:', loginResponse.data.accessToken.substring(0, 30) + '...');
      console.log('Refresh Token:', loginResponse.data.refreshToken.substring(0, 30) + '...');
      console.log('');

      // Test 3: Get current user (authenticated request)
      console.log('3. Testing /me endpoint (authenticated)...');
      const meResponse = await axios.get(`${API_URL}/me`, {
        headers: {
          Authorization: `Bearer ${loginResponse.data.accessToken}`,
        },
      });
      console.log('✅ /me endpoint successful');
      console.log('User:', meResponse.data.user);
      console.log('');

      // Test 4: Refresh token
      console.log('4. Testing token refresh...');
      const refreshResponse = await axios.post<AuthResponse>(
        `${API_URL}/refresh`,
        {
          refreshToken: loginResponse.data.refreshToken,
        }
      );
      console.log('✅ Token refresh successful');
      console.log('New Access Token:', refreshResponse.data.accessToken.substring(0, 30) + '...');
      console.log('');

      console.log('=== All Tests Passed! ===');
    } catch (error: any) {
      console.error('❌ Login failed');
      console.error('Status:', error.response?.status);
      console.error('Error:', error.response?.data || error.message);
      console.log('');
      
      // Additional debugging
      console.log('Debug Information:');
      console.log('- Request URL:', `${API_URL}/login`);
      console.log('- Request body:', { email: testUser.email, password: '***' });
      console.log('');
      console.log('Please check:');
      console.log('1. Is the server running on port 3001?');
      console.log('2. Check server logs for detailed error messages');
      console.log('3. Verify .env file has JWT_SECRET and JWT_REFRESH_SECRET set');
      console.log('4. Ensure PostgreSQL database is accessible');
    }
  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run tests
testAuth();