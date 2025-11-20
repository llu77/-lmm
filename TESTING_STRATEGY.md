# SymbolAI Worker - Comprehensive Testing Strategy

## Executive Summary

This document outlines a complete testing strategy for the SymbolAI Worker application, an Astro 5 application deployed on Cloudflare Workers with critical security features including Argon2id password hashing, session management, and security headers.

## Table of Contents

1. [Testing Framework Selection](#1-testing-framework-selection)
2. [File Structure](#2-file-structure)
3. [Configuration Files](#3-configuration-files)
4. [Test Categories](#4-test-categories)
5. [Cloudflare Bindings Mocking Strategy](#5-cloudflare-bindings-mocking-strategy)
6. [GitHub Actions Integration](#6-github-actions-integration)
7. [Implementation Priority](#7-implementation-priority)
8. [Code Coverage Targets](#8-code-coverage-targets)
9. [Performance Benchmarks](#9-performance-benchmarks)

---

## 1. Testing Framework Selection

### Recommended: Vitest

**Rationale:**
- **Native ESM support**: Perfect for Astro 5 and modern TypeScript
- **Cloudflare Workers compatibility**: Better support than Jest for Workers runtime
- **Fast**: 10-100x faster than Jest (powered by Vite)
- **TypeScript first**: No extra configuration needed
- **Snapshot testing**: Built-in UI testing capabilities
- **Watch mode**: Excellent DX with instant feedback
- **Coverage**: Built-in c8/v8 coverage (no Istanbul needed)

**Alternatives Considered:**
- **Jest**: Older, slower, requires more setup for ESM/Workers
- **Bun Test**: Current choice but limited ecosystem and tooling
- **Vitest + Miniflare**: Best for Cloudflare Workers integration testing

---

## 2. File Structure

```
symbolai-worker/
├── src/
│   ├── lib/
│   │   ├── password.ts
│   │   ├── session.ts
│   │   ├── permissions.ts
│   │   └── ...
│   ├── middleware.ts
│   └── pages/
│       └── api/
│           ├── auth/
│           │   └── login.ts
│           └── users/
│               └── create.ts
├── tests/
│   ├── unit/
│   │   ├── password.test.ts              # Password hashing & validation
│   │   ├── session.test.ts               # Session management
│   │   ├── permissions.test.ts           # Permission checks
│   │   └── db.test.ts                    # Database utilities
│   ├── integration/
│   │   ├── auth-flow.test.ts             # Login + session flow
│   │   ├── user-creation.test.ts         # User creation flow
│   │   ├── middleware.test.ts            # Middleware integration
│   │   └── password-migration.test.ts    # SHA-256 to Argon2id migration
│   ├── security/
│   │   ├── headers.test.ts               # CSP, HSTS, CORS validation
│   │   ├── timing-attack.test.ts         # Constant-time comparison
│   │   ├── xss-protection.test.ts        # XSS header validation
│   │   └── password-strength.test.ts     # Password strength requirements
│   ├── performance/
│   │   ├── password-hashing.bench.ts     # Argon2id performance
│   │   ├── password-verify.bench.ts      # Verification performance
│   │   └── middleware-overhead.bench.ts  # Middleware latency
│   ├── api/
│   │   ├── auth-login.test.ts            # POST /api/auth/login
│   │   ├── auth-logout.test.ts           # POST /api/auth/logout
│   │   └── users-create.test.ts          # POST /api/users/create
│   ├── e2e/
│   │   ├── login-journey.test.ts         # Full login journey
│   │   └── user-registration.test.ts     # Full registration journey
│   ├── mocks/
│   │   ├── cloudflare.ts                 # D1, KV, R2, AI mocks
│   │   ├── users.ts                      # Test user fixtures
│   │   └── sessions.ts                   # Test session fixtures
│   └── helpers/
│       ├── setup.ts                      # Global test setup
│       ├── teardown.ts                   # Cleanup utilities
│       └── factories.ts                  # Test data factories
├── vitest.config.ts                      # Vitest configuration
├── vitest.workspace.ts                   # Multi-project setup
└── package.json                          # Test scripts
```

---

## 3. Configuration Files

### 3.1 Vitest Configuration (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/helpers/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/*',
      ],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});
```

### 3.2 Vitest Workspace (`vitest.workspace.ts`)

```typescript
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    // Unit tests - fast, isolated
    test: {
      name: 'unit',
      include: ['tests/unit/**/*.test.ts'],
      environment: 'node',
    },
  },
  {
    // Integration tests - with Workers runtime
    test: {
      name: 'integration',
      include: ['tests/integration/**/*.test.ts'],
      environment: 'miniflare',
      environmentOptions: {
        bindings: {
          DB: 'test-db',
          SESSIONS: 'test-kv',
          AI: 'test-ai',
        },
      },
    },
  },
  {
    // Performance benchmarks
    test: {
      name: 'performance',
      include: ['tests/performance/**/*.bench.ts'],
      benchmark: {
        include: ['tests/performance/**/*.bench.ts'],
      },
    },
  },
]);
```

### 3.3 Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --project unit",
    "test:integration": "vitest run --project integration",
    "test:security": "vitest run tests/security",
    "test:api": "vitest run tests/api",
    "test:e2e": "vitest run tests/e2e",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:bench": "vitest bench",
    "test:ci": "vitest run --coverage --reporter=verbose"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250110.0",
    "@vitest/ui": "^1.2.0",
    "miniflare": "^3.20241106.2",
    "vitest": "^1.2.0",
    "wrangler": "^4.45.3"
  }
}
```

---

## 4. Test Categories

### 4.1 Unit Tests

#### A. Password Module (`tests/unit/password.test.ts`)

**Coverage: 100% target**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  verifyLegacySHA256,
  needsRehash,
  validatePasswordStrength,
} from '@/lib/password';

describe('Password Hashing (Argon2id)', () => {
  describe('hashPassword()', () => {
    it('should hash password with Argon2id', async () => {
      const password = 'SecureP@ssw0rd123!';
      const hash = await hashPassword(password);
      
      expect(hash).toMatch(/^\$argon2id\$v=19\$/);
      expect(hash.split('$')).toHaveLength(6);
    });

    it('should generate unique hashes for same password', async () => {
      const password = 'TestPass123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should reject empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password cannot be empty');
    });

    it('should reject password longer than 128 characters', async () => {
      const longPassword = 'a'.repeat(129);
      await expect(hashPassword(longPassword)).rejects.toThrow('Password too long');
    });

    it('should complete hashing within 200ms', async () => {
      const start = Date.now();
      await hashPassword('TestPassword123!');
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(200);
    });
  });

  describe('verifyPassword()', () => {
    it('should verify correct password', async () => {
      const password = 'MySecurePass123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'CorrectPass123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('WrongPass123!', hash);
      
      expect(isValid).toBe(false);
    });

    it('should complete verification within 150ms', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const start = Date.now();
      await verifyPassword(password, hash);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(150);
    });

    it('should handle malformed hash gracefully', async () => {
      const isValid = await verifyPassword('test', 'invalid-hash');
      expect(isValid).toBe(false);
    });
  });

  describe('verifyLegacySHA256()', () => {
    it('should verify legacy SHA-256 hash', async () => {
      const password = 'laban1010';
      const sha256 = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';
      
      const isValid = await verifyLegacySHA256(password, sha256);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect legacy password', async () => {
      const password = 'wrongpass';
      const sha256 = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';
      
      const isValid = await verifyLegacySHA256(password, sha256);
      expect(isValid).toBe(false);
    });
  });

  describe('needsRehash()', () => {
    it('should detect SHA-256 hash needing rehash', () => {
      const sha256 = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';
      expect(needsRehash(sha256)).toBe(true);
    });

    it('should not flag Argon2id hash for rehash', async () => {
      const hash = await hashPassword('TestPass123!');
      expect(needsRehash(hash)).toBe(false);
    });

    it('should not flag invalid hash for rehash', () => {
      expect(needsRehash('invalid')).toBe(false);
    });
  });

  describe('validatePasswordStrength()', () => {
    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('8 أحرف');
    });

    it('should reject password with only 2 character types', () => {
      const result = validatePasswordStrength('lowercase');
      expect(result.valid).toBe(false);
    });

    it('should accept password with 3+ character types', () => {
      const result = validatePasswordStrength('Password123');
      expect(result.valid).toBe(true);
    });

    it('should rate password strength correctly', () => {
      const weak = validatePasswordStrength('Pass123!');
      const strong = validatePasswordStrength('StrongP@ssw0rd123');
      
      expect(weak.strength).toBe('medium');
      expect(strong.strength).toBe('very_strong');
    });

    it('should provide helpful suggestions', () => {
      const result = validatePasswordStrength('password');
      
      expect(result.suggestions).toContain('أضف أحرف كبيرة (A-Z)');
      expect(result.suggestions).toContain('أضف أرقام (0-9)');
      expect(result.suggestions).toContain('أضف رموز خاصة (!@#$%^&*)');
    });
  });

  describe('Constant-time comparison', () => {
    it('should not leak timing information', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const timings: number[] = [];
      
      // Test with different wrong passwords
      for (let i = 0; i < 100; i++) {
        const wrongPass = 'WrongPass' + i + '!';
        const start = performance.now();
        await verifyPassword(wrongPass, hash);
        const duration = performance.now() - start;
        timings.push(duration);
      }
      
      // Calculate variance
      const mean = timings.reduce((a, b) => a + b) / timings.length;
      const variance = timings.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / timings.length;
      const stdDev = Math.sqrt(variance);
      
      // Standard deviation should be low (< 10% of mean) for constant-time
      expect(stdDev / mean).toBeLessThan(0.1);
    });
  });
});
```

**Priority: CRITICAL** (Implement first)

---

#### B. Session Module (`tests/unit/session.test.ts`)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSession, createSessionCookie, validateSession } from '@/lib/session';

describe('Session Management', () => {
  let mockKV: any;

  beforeEach(() => {
    mockKV = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    };
  });

  describe('createSession()', () => {
    it('should create session with valid token', async () => {
      const token = await createSession(mockKV, 'user-123', 'testuser', 'admin');
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);
      expect(mockKV.put).toHaveBeenCalled();
    });

    it('should store session in KV with TTL', async () => {
      await createSession(mockKV, 'user-123', 'testuser', 'admin');
      
      const putCall = mockKV.put.mock.calls[0];
      expect(putCall[0]).toMatch(/^session:/);
      expect(putCall[2]).toHaveProperty('expirationTtl');
      expect(putCall[2].expirationTtl).toBe(7 * 24 * 60 * 60); // 7 days
    });
  });

  describe('createSessionCookie()', () => {
    it('should create secure cookie string', () => {
      const cookie = createSessionCookie('test-token-123');
      
      expect(cookie).toContain('session=test-token-123');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Max-Age=604800'); // 7 days
    });
  });
});
```

**Priority: HIGH**

---

### 4.2 Integration Tests

#### A. Login Flow (`tests/integration/auth-flow.test.ts`)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('Authentication Flow', () => {
  let worker: any;

  beforeEach(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterEach(async () => {
    await worker.stop();
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid Argon2id credentials', async () => {
      const response = await worker.fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'TestPass123!',
        }),
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe('testuser');

      const cookies = response.headers.get('Set-Cookie');
      expect(cookies).toContain('session=');
      expect(cookies).toContain('HttpOnly');
    });

    it('should login with legacy SHA-256 and migrate to Argon2id', async () => {
      // Assume user 'legacyuser' has SHA-256 hash in DB
      const response = await worker.fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'legacyuser',
          password: 'laban1010',
        }),
      });

      expect(response.status).toBe(200);

      // Verify hash was updated to Argon2id
      // (Would need to check DB directly)
    });

    it('should reject invalid credentials', async () => {
      const response = await worker.fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'WrongPassword!',
        }),
      });

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reject inactive user', async () => {
      const response = await worker.fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'inactiveuser',
          password: 'TestPass123!',
        }),
      });

      expect(response.status).toBe(403);
    });

    it('should reject missing credentials', async () => {
      const response = await worker.fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Session Validation', () => {
    it('should validate session and populate context.locals', async () => {
      // First login
      const loginResponse = await worker.fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'TestPass123!',
        }),
      });

      const cookies = loginResponse.headers.get('Set-Cookie');
      const sessionMatch = cookies?.match(/session=([^;]+)/);
      const sessionToken = sessionMatch?.[1];

      // Access protected route with session
      const protectedResponse = await worker.fetch('/dashboard', {
        headers: { Cookie: `session=${sessionToken}` },
      });

      expect(protectedResponse.status).not.toBe(401);
      expect(protectedResponse.status).not.toBe(302); // Not redirected
    });

    it('should redirect unauthenticated user to login', async () => {
      const response = await worker.fetch('/dashboard');
      
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toContain('/auth/login');
    });
  });
});
```

**Priority: CRITICAL**

---

### 4.3 Security Tests

#### A. Security Headers (`tests/security/headers.test.ts`)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('Security Headers', () => {
  let worker: any;

  beforeEach(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterEach(async () => {
    await worker.stop();
  });

  describe('HTTP Strict Transport Security (HSTS)', () => {
    it('should include HSTS header', async () => {
      const response = await worker.fetch('/');
      
      const hsts = response.headers.get('Strict-Transport-Security');
      expect(hsts).toBeDefined();
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    });
  });

  describe('Content Security Policy (CSP)', () => {
    it('should include CSP header', async () => {
      const response = await worker.fetch('/');
      
      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("upgrade-insecure-requests");
    });

    it('should restrict script sources', async () => {
      const response = await worker.fetch('/');
      
      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toContain("script-src 'self'");
    });

    it('should restrict connect-src to allowed origins', async () => {
      const response = await worker.fetch('/');
      
      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toContain('connect-src');
      expect(csp).toContain('anthropic.com');
      expect(csp).toContain('cloudflare.com');
    });
  });

  describe('X-Frame-Options', () => {
    it('should prevent clickjacking', async () => {
      const response = await worker.fetch('/');
      
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });
  });

  describe('X-Content-Type-Options', () => {
    it('should prevent MIME sniffing', async () => {
      const response = await worker.fetch('/');
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });

  describe('Referrer-Policy', () => {
    it('should control referrer information', async () => {
      const response = await worker.fetch('/');
      
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('Permissions-Policy', () => {
    it('should restrict browser features', async () => {
      const response = await worker.fetch('/');
      
      const policy = response.headers.get('Permissions-Policy');
      expect(policy).toContain('camera=()');
      expect(policy).toContain('microphone=()');
      expect(policy).toContain('geolocation=()');
      expect(policy).toContain('payment=()');
    });
  });

  describe('CORS', () => {
    it('should set CORS headers for API routes', async () => {
      const response = await worker.fetch('/api/auth/login', {
        method: 'OPTIONS',
      });
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('should only allow same-origin requests', async () => {
      const response = await worker.fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Origin': 'https://evil.com',
          'Content-Type': 'application/json',
        },
      });
      
      const origin = response.headers.get('Access-Control-Allow-Origin');
      expect(origin).not.toBe('https://evil.com');
    });
  });
});
```

**Priority: CRITICAL**

---

### 4.4 Performance Tests

#### A. Password Hashing Benchmark (`tests/performance/password-hashing.bench.ts`)

```typescript
import { bench, describe } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/password';

describe('Password Performance', () => {
  bench('hashPassword - Argon2id', async () => {
    await hashPassword('TestPassword123!');
  }, {
    iterations: 50,
    time: 30000, // 30 seconds
  });

  bench('verifyPassword - Argon2id', async () => {
    const hash = await hashPassword('TestPassword123!');
    await verifyPassword('TestPassword123!', hash);
  }, {
    iterations: 50,
    time: 30000,
  });

  bench('verifyPassword - incorrect password', async () => {
    const hash = await hashPassword('TestPassword123!');
    await verifyPassword('WrongPassword!', hash);
  }, {
    iterations: 50,
    time: 30000,
  });
});
```

**Performance Targets:**
- `hashPassword()`: < 200ms per operation
- `verifyPassword()`: < 150ms per operation
- Middleware overhead: < 10ms per request

**Priority: MEDIUM**

---

### 4.5 API Tests

#### A. User Creation API (`tests/api/users-create.test.ts`)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('POST /api/users/create', () => {
  let worker: any;
  let adminSession: string;

  beforeEach(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });

    // Login as admin
    const loginResponse = await worker.fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'AdminPass123!',
      }),
    });

    const cookies = loginResponse.headers.get('Set-Cookie');
    const match = cookies?.match(/session=([^;]+)/);
    adminSession = match?.[1] || '';
  });

  afterEach(async () => {
    await worker.stop();
  });

  it('should create user with valid data', async () => {
    const response = await worker.fetch('/api/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${adminSession}`,
      },
      body: JSON.stringify({
        username: 'newuser',
        password: 'SecurePass123!',
        email: 'newuser@example.com',
        full_name: 'New User',
        role_id: 'role-123',
      }),
    });

    expect(response.status).toBe(201);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user.username).toBe('newuser');
  });

  it('should reject weak password', async () => {
    const response = await worker.fetch('/api/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${adminSession}`,
      },
      body: JSON.stringify({
        username: 'newuser',
        password: 'weak',
        role_id: 'role-123',
      }),
    });

    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error).toContain('كلمة المرور');
  });

  it('should reject duplicate username', async () => {
    // Create first user
    await worker.fetch('/api/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${adminSession}`,
      },
      body: JSON.stringify({
        username: 'duplicateuser',
        password: 'SecurePass123!',
        role_id: 'role-123',
      }),
    });

    // Try to create duplicate
    const response = await worker.fetch('/api/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${adminSession}`,
      },
      body: JSON.stringify({
        username: 'duplicateuser',
        password: 'SecurePass123!',
        role_id: 'role-123',
      }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('موجود');
  });

  it('should require admin role', async () => {
    // Login as regular user
    const userLoginResponse = await worker.fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'regularuser',
        password: 'UserPass123!',
      }),
    });

    const cookies = userLoginResponse.headers.get('Set-Cookie');
    const match = cookies?.match(/session=([^;]+)/);
    const userSession = match?.[1] || '';

    const response = await worker.fetch('/api/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${userSession}`,
      },
      body: JSON.stringify({
        username: 'newuser',
        password: 'SecurePass123!',
        role_id: 'role-123',
      }),
    });

    expect(response.status).toBe(403);
  });
});
```

**Priority: HIGH**

---

## 5. Cloudflare Bindings Mocking Strategy

### 5.1 Mock Setup (`tests/mocks/cloudflare.ts`)

```typescript
import { vi } from 'vitest';

export class MockD1Database {
  private data: Map<string, any[]> = new Map();

  prepare(query: string) {
    return {
      bind: (...params: any[]) => ({
        first: async () => {
          // Mock implementation
          if (query.includes('SELECT') && query.includes('users_new')) {
            return this.data.get('users')?.[0];
          }
          return null;
        },
        all: async () => {
          return { results: this.data.get('users') || [] };
        },
        run: async () => {
          return { success: true };
        },
      }),
    };
  }

  // Test helper
  seedData(table: string, rows: any[]) {
    this.data.set(table, rows);
  }
}

export class MockKVNamespace {
  private data: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async put(key: string, value: string, options?: any): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  // Test helper
  clear() {
    this.data.clear();
  }
}

export class MockR2Bucket {
  private objects: Map<string, { data: ArrayBuffer; metadata?: any }> = new Map();

  async put(key: string, value: ArrayBuffer, options?: any): Promise<void> {
    this.objects.set(key, { data: value, metadata: options?.customMetadata });
  }

  async get(key: string): Promise<any> {
    const obj = this.objects.get(key);
    if (!obj) return null;
    return {
      arrayBuffer: async () => obj.data,
      text: async () => new TextDecoder().decode(obj.data),
    };
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }
}

export class MockAI {
  async run(model: string, inputs: any): Promise<any> {
    return {
      response: 'Mock AI response',
      tokens: 100,
    };
  }
}

export function createMockEnv() {
  return {
    DB: new MockD1Database(),
    SESSIONS: new MockKVNamespace(),
    FILES: new MockR2Bucket(),
    AI: new MockAI(),
  };
}
```

### 5.2 Test Setup Helper (`tests/helpers/setup.ts`)

```typescript
import { beforeEach, afterEach } from 'vitest';
import { createMockEnv } from '../mocks/cloudflare';
import { hashPassword } from '@/lib/password';

export async function setupTestDatabase(db: any) {
  // Seed test users
  const testUsers = [
    {
      id: 'user-1',
      username: 'testuser',
      password: await hashPassword('TestPass123!'),
      email: 'test@example.com',
      full_name: 'Test User',
      role_id: 'role-user',
      branch_id: 'branch-1',
      is_active: 1,
    },
    {
      id: 'user-2',
      username: 'legacyuser',
      password: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // SHA-256 of 'laban1010'
      email: 'legacy@example.com',
      full_name: 'Legacy User',
      role_id: 'role-user',
      branch_id: 'branch-1',
      is_active: 1,
    },
    {
      id: 'user-3',
      username: 'inactiveuser',
      password: await hashPassword('TestPass123!'),
      email: 'inactive@example.com',
      full_name: 'Inactive User',
      role_id: 'role-user',
      branch_id: 'branch-1',
      is_active: 0,
    },
    {
      id: 'admin-1',
      username: 'admin',
      password: await hashPassword('AdminPass123!'),
      email: 'admin@example.com',
      full_name: 'Admin User',
      role_id: 'role-admin',
      branch_id: null,
      is_active: 1,
    },
  ];

  db.seedData('users', testUsers);
}

beforeEach(async () => {
  const env = createMockEnv();
  await setupTestDatabase(env.DB);
  
  // Make env available globally
  (globalThis as any).testEnv = env;
});

afterEach(() => {
  const env = (globalThis as any).testEnv;
  if (env) {
    env.SESSIONS.clear();
  }
});
```

---

## 6. GitHub Actions Integration

### 6.1 Test Workflow (`.github/workflows/test.yml`)

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
    paths:
      - 'symbolai-worker/**'
      - '.github/workflows/test.yml'
  pull_request:
    branches: [main, develop]
    paths:
      - 'symbolai-worker/**'
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # Unit Tests
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd symbolai-worker
          npm ci

      - name: Run unit tests
        run: |
          cd symbolai-worker
          npm run test:unit -- --reporter=verbose

      - name: Upload unit test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: unit-test-results
          path: symbolai-worker/coverage/

  # Integration Tests
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd symbolai-worker
          npm ci

      - name: Run integration tests
        run: |
          cd symbolai-worker
          npm run test:integration -- --reporter=verbose

  # Security Tests
  security-tests:
    name: Security Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd symbolai-worker
          npm ci

      - name: Run security tests
        run: |
          cd symbolai-worker
          npm run test:security -- --reporter=verbose

      - name: Upload security test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: security-test-results
          path: symbolai-worker/test-results/

  # Performance Benchmarks
  performance-tests:
    name: Performance Benchmarks
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd symbolai-worker
          npm ci

      - name: Run performance benchmarks
        run: |
          cd symbolai-worker
          npm run test:bench

      - name: Upload benchmark results
        uses: actions/upload-artifact@v4
        with:
          name: benchmark-results
          path: symbolai-worker/benchmark-results.json

  # Code Coverage
  coverage:
    name: Code Coverage
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd symbolai-worker
          npm ci

      - name: Run tests with coverage
        run: |
          cd symbolai-worker
          npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: symbolai-worker/coverage/lcov.info
          flags: symbolai-worker
          name: symbolai-worker-coverage
          fail_ci_if_error: false

      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: symbolai-worker/coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}

  # Test Summary
  test-summary:
    name: Test Summary
    needs: [unit-tests, integration-tests, security-tests, performance-tests, coverage]
    runs-on: ubuntu-latest
    if: always()

    steps:
      - name: Generate test summary
        run: |
          echo "## 🧪 Test Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Status:**" >> $GITHUB_STEP_SUMMARY
          echo "- Unit Tests: ${{ needs.unit-tests.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- Integration Tests: ${{ needs.integration-tests.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- Security Tests: ${{ needs.security-tests.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- Performance Tests: ${{ needs.performance-tests.result }}" >> $GITHUB_STEP_SUMMARY
          echo "- Coverage: ${{ needs.coverage.result }}" >> $GITHUB_STEP_SUMMARY

      - name: Fail if any tests failed
        if: |
          needs.unit-tests.result == 'failure' ||
          needs.integration-tests.result == 'failure' ||
          needs.security-tests.result == 'failure' ||
          needs.coverage.result == 'failure'
        run: exit 1
```

### 6.2 Updated Deploy Workflow

Add to existing `cloudflare-workers-deploy.yml`:

```yaml
jobs:
  # Add this before the build job
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Run tests
        run: |
          cd symbolai-worker
          npm run test:ci

      - name: Check coverage thresholds
        run: |
          cd symbolai-worker
          npm run test:coverage -- --run

  # Modify build job to depend on tests
  build:
    name: Build Workers
    needs: test  # Add this line
    runs-on: ubuntu-latest
    # ... rest of build job
```

---

## 7. Implementation Priority

### Phase 1: Critical Security Tests (Week 1)
**Priority: CRITICAL - Implement First**

1. **Unit Tests - Password Module** (`tests/unit/password.test.ts`)
   - Argon2id hashing
   - Password verification
   - Legacy SHA-256 compatibility
   - needsRehash detection
   - Password strength validation
   - Constant-time comparison

2. **Integration Tests - Auth Flow** (`tests/integration/auth-flow.test.ts`)
   - Login with Argon2id
   - Login with SHA-256 migration
   - Session validation
   - Invalid credentials handling

3. **Security Tests - Headers** (`tests/security/headers.test.ts`)
   - HSTS, CSP, X-Frame-Options
   - CORS validation
   - XSS protection headers

**Deliverables:**
- Vitest configuration
- Mock setup for Cloudflare bindings
- All critical security tests passing
- GitHub Actions workflow integrated

---

### Phase 2: API and Integration Tests (Week 2)
**Priority: HIGH**

4. **API Tests - User Creation** (`tests/api/users-create.test.ts`)
   - Valid user creation
   - Password strength enforcement
   - Duplicate username handling
   - Admin role requirement

5. **API Tests - Logout** (`tests/api/auth-logout.test.ts`)
   - Session deletion
   - Cookie clearing

6. **Unit Tests - Session Module** (`tests/unit/session.test.ts`)
   - Session creation
   - Session validation
   - Session expiration

7. **Integration Tests - Middleware** (`tests/integration/middleware.test.ts`)
   - Auth middleware flow
   - Security headers application
   - Public route handling

**Deliverables:**
- Complete API test coverage
- Session management tests
- Middleware integration tests

---

### Phase 3: Performance and Edge Cases (Week 3)
**Priority: MEDIUM**

8. **Performance Tests** (`tests/performance/`)
   - Password hashing benchmarks
   - Verification benchmarks
   - Middleware overhead measurement

9. **Unit Tests - Permissions Module** (`tests/unit/permissions.test.ts`)
   - Role-based access control
   - Permission checks

10. **Unit Tests - Database Module** (`tests/unit/db.test.ts`)
    - ID generation
    - Query helpers

**Deliverables:**
- Performance benchmarks established
- Baseline metrics documented
- All unit tests complete

---

### Phase 4: E2E and Documentation (Week 4)
**Priority: LOW**

11. **E2E Tests** (`tests/e2e/`)
    - Full login journey
    - User registration journey

12. **Documentation**
    - Test coverage report
    - Performance baseline document
    - Testing guidelines for contributors

**Deliverables:**
- Complete test suite
- Documentation published
- CI/CD fully integrated

---

## 8. Code Coverage Targets

### Overall Targets

| Category | Target | Critical Threshold |
|----------|--------|-------------------|
| **Lines** | 80% | 70% |
| **Functions** | 80% | 70% |
| **Branches** | 75% | 65% |
| **Statements** | 80% | 70% |

### Per-Module Targets

| Module | Target | Justification |
|--------|--------|---------------|
| `lib/password.ts` | **95%** | Critical security component |
| `lib/session.ts` | **90%** | Security-sensitive |
| `middleware.ts` | **90%** | Security headers + auth |
| `pages/api/auth/login.ts` | **95%** | Critical auth endpoint |
| `pages/api/users/create.ts` | **90%** | User management |
| `lib/permissions.ts` | **85%** | Access control |
| `lib/db.ts` | **75%** | Database utilities |
| `lib/email.ts` | **70%** | Non-critical |

### Enforcement

```json
// vitest.config.ts
{
  "coverage": {
    "lines": 80,
    "functions": 80,
    "branches": 75,
    "statements": 80,
    "thresholdAutoUpdate": false,
    "perFile": true,
    "include": [
      "src/lib/password.ts",
      "src/lib/session.ts",
      "src/middleware.ts",
      "src/pages/api/**/*.ts"
    ]
  }
}
```

---

## 9. Performance Benchmarks

### Baseline Targets

| Operation | Target | Critical Threshold | Notes |
|-----------|--------|-------------------|-------|
| **hashPassword()** | < 150ms | < 200ms | Argon2id with current config |
| **verifyPassword()** | < 120ms | < 150ms | Same config as hash |
| **verifyLegacySHA256()** | < 5ms | < 10ms | Much faster than Argon2id |
| **Middleware (auth)** | < 5ms | < 10ms | Session lookup + validation |
| **Middleware (headers)** | < 1ms | < 2ms | Header setting only |
| **Login API (success)** | < 200ms | < 300ms | Including password verify |
| **Login API (SHA-256 migration)** | < 350ms | < 500ms | Verify + rehash + DB update |

### Monitoring

```typescript
// tests/performance/monitoring.bench.ts
import { bench, describe } from 'vitest';

describe('Performance Monitoring', () => {
  bench('Full login flow - Argon2id', async () => {
    // Simulate complete login
    // Target: < 200ms
  });

  bench('Full login flow - SHA-256 migration', async () => {
    // Simulate login with migration
    // Target: < 350ms
  });

  bench('Middleware overhead', async () => {
    // Measure middleware impact
    // Target: < 10ms
  });
});
```

### CI Integration

```yaml
# .github/workflows/performance.yml
- name: Run performance benchmarks
  run: npm run test:bench

- name: Check performance regressions
  run: |
    # Compare with baseline
    node scripts/check-performance-regression.js

- name: Comment PR with performance results
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v7
  with:
    script: |
      const results = require('./benchmark-results.json');
      // Post performance comparison comment
```

---

## 10. Additional Recommendations

### 10.1 Test Data Management

Create test data factories for consistent test data:

```typescript
// tests/helpers/factories.ts
export const userFactory = {
  default: (overrides = {}) => ({
    id: `user-${Date.now()}`,
    username: 'testuser',
    password: 'TestPass123!',
    email: 'test@example.com',
    full_name: 'Test User',
    role_id: 'role-user',
    branch_id: 'branch-1',
    is_active: 1,
    ...overrides,
  }),
  
  admin: () => userFactory.default({
    username: 'admin',
    role_id: 'role-admin',
  }),
  
  legacy: () => userFactory.default({
    username: 'legacyuser',
    password: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  }),
};
```

### 10.2 Test Reporting

Add test reporting for better visibility:

```bash
npm install --save-dev @vitest/ui vitest-sonar-reporter
```

### 10.3 Pre-commit Hooks

Add test automation to pre-commit:

```bash
npm install --save-dev husky lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.ts": [
      "npm run test:related",
      "npm run lint:fix"
    ]
  }
}
```

---

## 11. Success Metrics

### Quality Gates

All of these must pass before deployment:

- ✅ All unit tests passing (100%)
- ✅ All integration tests passing (100%)
- ✅ All security tests passing (100%)
- ✅ Code coverage ≥ 80% overall
- ✅ Critical modules ≥ 90% coverage
- ✅ No performance regressions > 10%
- ✅ All security headers validated
- ✅ Password hashing < 200ms
- ✅ Password verification < 150ms

### Continuous Monitoring

- **Weekly**: Review test coverage trends
- **Monthly**: Performance benchmark review
- **Quarterly**: Security test updates (OWASP changes)

---

## 12. Next Steps

### Immediate Actions (This Week)

1. **Install Vitest and dependencies**
   ```bash
   cd symbolai-worker
   npm install --save-dev vitest @vitest/ui miniflare
   ```

2. **Create vitest.config.ts** (see Section 3.1)

3. **Set up test directory structure** (see Section 2)

4. **Create mock implementations** (see Section 5.1)

5. **Write first critical tests**:
   - `tests/unit/password.test.ts`
   - `tests/integration/auth-flow.test.ts`
   - `tests/security/headers.test.ts`

6. **Create GitHub Actions workflow** (see Section 6.1)

7. **Run tests locally**:
   ```bash
   npm run test
   npm run test:coverage
   ```

8. **Commit and push** to trigger CI

---

## Conclusion

This comprehensive testing strategy provides:

- **Clear framework choice**: Vitest for modern, fast testing
- **Complete file structure**: Organized by test type
- **Detailed test examples**: Copy-paste ready code
- **Cloudflare mocking**: Full D1, KV, R2, AI support
- **CI/CD integration**: GitHub Actions workflows
- **Priority roadmap**: 4-week implementation plan
- **Quality metrics**: Coverage and performance targets

**Estimated Effort:**
- Phase 1 (Critical): 40 hours
- Phase 2 (High): 30 hours
- Phase 3 (Medium): 20 hours
- Phase 4 (Low): 10 hours
- **Total**: ~100 hours (2.5 weeks full-time)

**Key Benefits:**
- 🔒 **Security**: Comprehensive security test coverage
- ⚡ **Performance**: Continuous performance monitoring
- 🛡️ **Confidence**: Deploy with confidence
- 📊 **Visibility**: Clear metrics and reporting
- 🚀 **Speed**: Fast feedback loop with Vitest

Start with Phase 1 tests and iterate from there. The test infrastructure will pay dividends immediately by catching bugs early and enabling confident deployments.
