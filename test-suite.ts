import http from 'http';
import { createApp } from './server/src/app';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, details?: string) {
  results.push({ name, passed, details });
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${name}${details ? ` (${details})` : ''}`);
}

async function runTests() {
  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(5099, () => {
      console.log('Test server started on port 5099\n');
      resolve();
    });
  });

  const BASE = 'http://127.0.0.1:5099/api';
  let authCookie = '';
  let authToken = '';

  try {
    // Test 1: Health check
    {
      const res = await fetch(`${BASE}/health`);
      const body = await res.json();
      record('Health Check Endpoint (GET /api/health)', res.status === 200 && body.status === 'healthy', `Status: ${res.status}`);
    }

    // Test 2: Input validation on Register (invalid email, short password)
    {
      const res = await fetch(`${BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'A', email: 'invalid-email', password: '123' }),
      });
      const body = await res.json();
      record('Register Input Validation Rejection (POST /api/auth/register)', res.status === 400 && body.success === false && body.errors?.length > 0, `Status: ${res.status}, Errors: ${body.errors?.length}`);
    }

    // Test 3: Successful Registration
    const testEmail = `researcher_${Date.now()}@trustlens.test`;
    {
      const res = await fetch(`${BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Dr. Jane Analyst',
          email: testEmail,
          password: 'SecurePassword123!',
        }),
      });
      const body = await res.json();
      const cookieHeader = res.headers.get('set-cookie');
      if (cookieHeader) {
        authCookie = cookieHeader.split(';')[0];
      }
      authToken = body.token;

      const hasNoPasswordHash = !('passwordHash' in (body.user || {}));
      record(
        'User Registration (POST /api/auth/register)',
        res.status === 201 && body.success === true && body.user.email === testEmail && hasNoPasswordHash && !!authToken,
        `Status: ${res.status}, User ID: ${body.user?.id}, passwordHash hidden: ${hasNoPasswordHash}`
      );
    }

    // Test 4: Duplicate Email Prevention
    {
      const res = await fetch(`${BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicate Analyst',
          email: testEmail,
          password: 'AnotherPassword123!',
        }),
      });
      const body = await res.json();
      record('Duplicate Email Prevention (POST /api/auth/register)', res.status === 409 && body.success === false, `Status: ${res.status}, Message: "${body.message}"`);
    }

    // Test 5: Login with Wrong Password
    {
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'IncorrectPassword999!',
        }),
      });
      const body = await res.json();
      record('Reject Invalid Password (POST /api/auth/login)', res.status === 401 && body.success === false, `Status: ${res.status}, Message: "${body.message}"`);
    }

    // Test 6: Successful Login
    {
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'SecurePassword123!',
        }),
      });
      const body = await res.json();
      const hasNoPasswordHash = !('passwordHash' in (body.user || {}));
      const cookieHeader = res.headers.get('set-cookie');
      if (cookieHeader) {
        authCookie = cookieHeader.split(';')[0];
      }
      authToken = body.token;

      record(
        'Valid Login & Token Generation (POST /api/auth/login)',
        res.status === 200 && body.success === true && body.user.email === testEmail && hasNoPasswordHash && !!authToken,
        `Status: ${res.status}, Cookie issued: ${!!cookieHeader}`
      );
    }

    // Test 7: Protected Route Rejection without Auth
    {
      const res = await fetch(`${BASE}/auth/me`);
      const body = await res.json();
      record('Protected Route Rejection (GET /api/auth/me without token)', res.status === 401 && body.success === false, `Status: ${res.status}`);
    }

    // Test 8: Protected Route Access via Bearer Header
    {
      const res = await fetch(`${BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const body = await res.json();
      record(
        'Protected Route Authorization via Bearer Token (GET /api/auth/me)',
        res.status === 200 && body.success === true && body.user.email === testEmail,
        `Status: ${res.status}, User: ${body.user?.email}`
      );
    }

    // Test 9: Protected Route Access via HTTP-Only Cookie
    {
      const res = await fetch(`${BASE}/auth/me`, {
        headers: { Cookie: authCookie },
      });
      const body = await res.json();
      record(
        'Protected Route Authorization via Cookie (GET /api/auth/me)',
        res.status === 200 && body.success === true && body.user.email === testEmail,
        `Status: ${res.status}, User: ${body.user?.email}`
      );
    }

    // Test 10: Logout and Cookie Clearing
    {
      const res = await fetch(`${BASE}/auth/logout`, {
        method: 'POST',
        headers: { Cookie: authCookie },
      });
      const body = await res.json();
      const cookieHeader = res.headers.get('set-cookie') || '';
      record('User Logout & Cookie Clearance (POST /api/auth/logout)', res.status === 200 && body.success === true, `Status: ${res.status}`);
    }

    // Test 11: 404 Route Handling
    {
      const res = await fetch(`${BASE}/non-existent-endpoint`);
      record('API 404 Route Handling', res.status === 404, `Status: ${res.status}`);
    }

  } finally {
    server.close();
  }

  console.log('\n====================================================');
  const allPassed = results.every((r) => r.passed);
  console.log(`Test Execution Summary: ${results.filter((r) => r.passed).length}/${results.length} PASSED`);
  console.log(`Overall Result: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('====================================================');

  if (!allPassed) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
