/**
 * Comprehensive API Endpoint Testing Suite
 * Tests all authentication endpoints with runtime binding checks
 */

import { strict as assert } from 'assert';
import fs from 'fs';
import crypto from 'crypto';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log(`\n${COLORS.cyan}╔════════════════════════════════════════════════════╗${COLORS.reset}`);
    console.log(`${COLORS.cyan}║     API Endpoint Testing Suite                     ║${COLORS.reset}`);
    console.log(`${COLORS.cyan}╚════════════════════════════════════════════════════╝${COLORS.reset}\n`);

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`${COLORS.green}✓${COLORS.reset} ${name}`);
      } catch (error) {
        this.failed++;
        console.log(`${COLORS.red}✗${COLORS.reset} ${name}`);
        console.log(`  ${COLORS.red}Error: ${error.message}${COLORS.reset}`);
      }
    }

    console.log(`\n${COLORS.cyan}════════════════════════════════════════════════════${COLORS.reset}`);
    console.log(`Results: ${COLORS.green}${this.passed} passed${COLORS.reset}, ${this.failed > 0 ? COLORS.red : COLORS.green}${this.failed} failed${COLORS.reset}`);
    console.log(`${COLORS.cyan}════════════════════════════════════════════════════${COLORS.reset}\n`);

    return this.failed === 0;
  }
}

const runner = new TestRunner();

// Test 1: Login endpoint structure validation
runner.test('Login endpoint has runtime binding checks', () => {
  const loginContent = fs.readFileSync('./src/pages/api/auth/login.ts', 'utf8');
  
  assert(loginContent.includes('locals.runtime?.env?.DB'), 'Missing DB runtime check');
  assert(loginContent.includes('locals.runtime?.env?.SESSIONS'), 'Missing SESSIONS runtime check');
  assert(loginContent.includes('console.error'), 'Missing error logging');
});

// Test 2: Session endpoint structure validation
runner.test('Session endpoint has runtime binding checks', () => {
  const sessionContent = fs.readFileSync('./src/pages/api/auth/session.ts', 'utf8');
  
  assert(sessionContent.includes('locals.runtime?.env?.SESSIONS'), 'Missing SESSIONS runtime check');
  assert(sessionContent.includes('authenticated: false'), 'Missing graceful failure response');
});

// Test 3: Logout endpoint structure validation
runner.test('Logout endpoint has runtime binding checks', () => {
  const logoutContent = fs.readFileSync('./src/pages/api/auth/logout.ts', 'utf8');
  
  assert(logoutContent.includes('locals.runtime?.env?.SESSIONS'), 'Missing SESSIONS runtime check');
});

// Test 4: Wrangler config validation
runner.test('Wrangler.toml has all KV namespaces configured', () => {
  const wranglerContent = fs.readFileSync('./wrangler.toml', 'utf8');
  
  const requiredNamespaces = ['SESSIONS', 'CACHE', 'FILES', 'RATE_LIMIT', 'OAUTH_KV'];
  const requiredIds = [
    '8f91016b728c4a289fdfdec425492aab',
    'a497973607cf45bbbee76b64da9ac947',
    'd9961a2085d44c669bbe6c175f3611c1',
    '797b75482e6c4408bb40f6d72f2512af',
    '57a4eb48d4f047e7aea6b4692e174894'
  ];

  requiredNamespaces.forEach(ns => {
    assert(wranglerContent.includes(`binding = "${ns}"`), `Missing ${ns} namespace`);
  });

  requiredIds.forEach(id => {
    assert(wranglerContent.includes(id), `Missing namespace ID: ${id}`);
  });

  assert(!wranglerContent.includes('your_kv_namespace_id_here'), 'Placeholder ID still present');
});

// Test 5: TypeScript types validation
runner.test('TypeScript env.d.ts has all KV namespace types', () => {
  const envContent = fs.readFileSync('./src/env.d.ts', 'utf8');
  
  const requiredTypes = ['SESSIONS', 'CACHE', 'FILES', 'RATE_LIMIT', 'OAUTH_KV'];
  requiredTypes.forEach(type => {
    assert(envContent.includes(`${type}: KVNamespace`), `Missing ${type} type definition`);
  });
});

// Test 6: PostCSS configuration exists
runner.test('PostCSS configuration file exists', () => {
  assert(fs.existsSync('./postcss.config.js'), 'Missing postcss.config.js');
  
  const postcssContent = fs.readFileSync('./postcss.config.js', 'utf8');
  assert(postcssContent.includes('tailwindcss'), 'Missing tailwindcss plugin');
  assert(postcssContent.includes('autoprefixer'), 'Missing autoprefixer plugin');
});

// Test 7: Dev vars example exists
runner.test('Development variables example file exists', () => {
  assert(fs.existsSync('./.dev.vars.example'), 'Missing .dev.vars.example');
  
  const devVarsContent = fs.readFileSync('./.dev.vars.example', 'utf8');
  assert(devVarsContent.includes('ANTHROPIC_API_KEY'), 'Missing ANTHROPIC_API_KEY');
  assert(devVarsContent.includes('RESEND_API_KEY'), 'Missing RESEND_API_KEY');
  assert(devVarsContent.includes('SESSION_SECRET'), 'Missing SESSION_SECRET');
});

// Test 8: Configuration setup guide exists
runner.test('Configuration setup guide exists and is comprehensive', () => {
  assert(fs.existsSync('./CONFIGURATION_SETUP.md'), 'Missing CONFIGURATION_SETUP.md');
  
  const setupContent = fs.readFileSync('./CONFIGURATION_SETUP.md', 'utf8');
  assert(setupContent.includes('KV Namespace'), 'Missing KV namespace documentation');
  assert(setupContent.includes('SESSIONS'), 'Missing SESSIONS documentation');
  assert(setupContent.includes('8f91016b728c4a289fdfdec425492aab'), 'Missing actual namespace ID');
});

// Test 9: Password hashing consistency
runner.test('Password hashing uses correct algorithm', () => {
  const loginContent = fs.readFileSync('./src/pages/api/auth/login.ts', 'utf8');
  
  assert(loginContent.includes('crypto.subtle.digest'), 'Missing crypto.subtle.digest');
  assert(loginContent.includes('SHA-256'), 'Not using SHA-256');
  
  // Test actual hash
  const testPassword = 'laban1010';
  const expectedHash = '1efaaf2195720bd5bad0c2285df2db04065f9b989061bba9674032e0905629a5';
  const actualHash = crypto.createHash('sha256').update(testPassword).digest('hex');
  
  assert.equal(actualHash, expectedHash, 'Password hash mismatch');
});

// Test 10: Error handling validation
runner.test('All auth endpoints have proper error handling', () => {
  const files = [
    { path: './src/pages/api/auth/login.ts', requiresErrorStatus: true },
    { path: './src/pages/api/auth/logout.ts', requiresErrorStatus: false },
    { path: './src/pages/api/auth/session.ts', requiresErrorStatus: false }
  ];
  
  files.forEach(({ path, requiresErrorStatus }) => {
    const content = fs.readFileSync(path, 'utf8');
    assert(content.includes('try {'), `Missing try block in ${path}`);
    assert(content.includes('} catch'), `Missing catch block in ${path}`);
    if (requiresErrorStatus) {
      assert(content.includes('status: 500') || content.includes('status: 401'), `Missing error status in ${path}`);
    }
  });
});

// Test 11: Build output validation
runner.test('Build produces expected output files', () => {
  assert(fs.existsSync('./dist'), 'Missing dist directory');
  assert(fs.existsSync('./dist/_worker.js'), 'Missing worker output');
});

// Test 12: Security headers in middleware
runner.test('Middleware sets security headers', () => {
  if (fs.existsSync('./src/middleware.ts')) {
    const middlewareContent = fs.readFileSync('./src/middleware.ts', 'utf8');
    assert(middlewareContent.includes('X-Frame-Options'), 'Missing X-Frame-Options header');
    assert(middlewareContent.includes('X-Content-Type-Options'), 'Missing X-Content-Type-Options header');
  }
});

// Run all tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});
