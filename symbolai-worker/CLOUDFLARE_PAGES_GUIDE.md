# Cloudflare Pages Functions - Best Practices Guide

Complete guide for implementing Cloudflare Pages Functions with Astro 5 based on 2025 best practices.

---

## Table of Contents

1. [Middleware & Security](#middleware--security)
2. [CORS Implementation](#cors-implementation)
3. [Structured Logging](#structured-logging)
4. [A/B Testing](#ab-testing)
5. [Cloudflare Access Integration](#cloudflare-access-integration)
6. [Performance Optimization](#performance-optimization)
7. [Debugging](#debugging)

---

## Middleware & Security

### Enhanced Middleware Pattern

The enhanced middleware (`src/middleware.enhanced.ts`) implements:

- ✅ **CORS Preflight Handling** - Proper OPTIONS request handling
- ✅ **Session Validation** - With automatic expiration cleanup
- ✅ **Security Headers** - OWASP-compliant (CSP, HSTS, X-Frame-Options)
- ✅ **Structured Logging** - Request context tracking
- ✅ **Error Handling** - Graceful error responses

### Security Headers Implemented

```typescript
// Applied to all responses
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: [detailed policy]
X-XSS-Protection: 1; mode=block
```

### Switching to Enhanced Middleware

**Option 1: Replace existing middleware**
```bash
cd symbolai-worker
mv src/middleware.ts src/middleware.original.ts
mv src/middleware.enhanced.ts src/middleware.ts
```

**Option 2: Gradual migration**
Keep both files and import the enhanced middleware in your existing one:
```typescript
// src/middleware.ts
export { onRequest } from './middleware.enhanced';
```

---

## CORS Implementation

### CORS Preflight (OPTIONS)

The enhanced middleware handles CORS preflight requests correctly:

```typescript
// OPTIONS requests are handled BEFORE calling next()
if (request.method === 'OPTIONS') {
  const origin = request.headers.get('Origin');

  if (isOriginAllowed(origin)) {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400', // 24 hours
      },
    });
  }

  return new Response(null, { status: 403 });
}
```

### Actual Request CORS

For non-preflight requests:

```typescript
if (apiRoute) {
  const origin = request.headers.get('Origin');

  if (isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
}
```

### Configuring Allowed Origins

Edit `src/middleware.enhanced.ts`:

```typescript
const ALLOWED_ORIGINS = [
  'https://symbolai.net',
  'https://*.symbolai.net',  // Supports wildcards
  'https://app.example.com', // Add more as needed
];
```

**Security Note**: Never use `'*'` for `Access-Control-Allow-Origin` in production when using credentials.

---

## Structured Logging

### Logger Utility

Location: `src/lib/logger.ts`

### Basic Usage

```typescript
import { createLogger, extractRequestContext } from '@/lib/logger';

// In middleware or API route
const logger = createLogger(
  extractRequestContext(request, url),
  env.ENVIRONMENT
);

logger.info('User logged in', { userId: user.id });
logger.warn('Rate limit approaching', { remaining: 10 });
logger.error('Database error', error, { query: 'SELECT * FROM users' });
```

### Log Output Format

```json
{
  "timestamp": "2025-11-20T14:30:45.123Z",
  "level": "info",
  "message": "Request completed",
  "context": {
    "requestId": "req_1732112445123_abc123",
    "path": "/api/users/create",
    "method": "POST",
    "ip": "203.0.113.42",
    "userId": "user_123"
  },
  "metadata": {
    "status": 200,
    "duration": "45ms"
  }
}
```

### Viewing Logs

```bash
# Real-time logs
npm run cf:tail

# With filters
wrangler tail --format pretty --status error
```

### Best Practices

1. **Use structured metadata** instead of string interpolation:
   ```typescript
   // ❌ Bad
   logger.info(`User ${userId} logged in`);

   // ✅ Good
   logger.info('User logged in', { userId });
   ```

2. **Include request context** for traceability:
   ```typescript
   const logger = createLogger(extractRequestContext(request, url));
   ```

3. **Use appropriate log levels**:
   - `debug`: Development/debugging info (only in dev)
   - `info`: Normal operation events
   - `warn`: Unusual but non-critical events
   - `error`: Errors that need attention

---

## A/B Testing

### A/B Testing Utility

Location: `src/lib/ab-testing.ts`

### Example: Homepage Redesign Test

```typescript
// src/pages/index.astro
---
import { createABTest } from '@/lib/ab-testing';

const homepageTest = createABTest('homepage-redesign', {
  variants: ['control', 'variant-a', 'variant-b'],
  weights: [50, 30, 20], // 50% control, 30% A, 20% B
});

const { variant } = homepageTest.getVariant(Astro);
---

{variant === 'control' && <ControlHomepage />}
{variant === 'variant-a' && <NewDesignA />}
{variant === 'variant-b' && <NewDesignB />}
```

### Feature Flags

```typescript
import { createFeatureFlag } from '@/lib/ab-testing';

// Enable for 20% of users
const betaDashboard = createFeatureFlag('beta-dashboard', 20);

const { variant } = betaDashboard.getVariant(Astro);

if (variant === 'enabled') {
  // Show beta features
}
```

### Middleware-Based A/B Testing

```typescript
// src/middleware/ab-test.ts
import { defineMiddleware } from 'astro:middleware';
import { createABTest } from '@/lib/ab-testing';

const test = createABTest('new-pricing', {
  variants: ['current', 'new'],
});

export const abTestMiddleware = defineMiddleware(async (context, next) => {
  const { variant } = test.getVariant(context);

  // Make variant available to all pages
  context.locals.abTestVariant = variant;

  return next();
});
```

### Testing Specific Variants

```typescript
// Force a specific variant (for development/testing)
homepageTest.forceVariant(Astro, 'variant-a');

// Clear assignment
homepageTest.clearVariant(Astro);
```

---

## Cloudflare Access Integration

### What is Cloudflare Access?

Cloudflare Access provides zero-trust authentication for your application. It sits in front of your app and authenticates users before they can access your content.

### Installation

```bash
npm install @cloudflare/pages-plugin-cloudflare-access
```

### Basic Setup

```typescript
// functions/_middleware.ts
import cloudflareAccessPlugin from "@cloudflare/pages-plugin-cloudflare-access";

export const onRequest = cloudflareAccessPlugin({
  domain: "https://your-team.cloudflareaccess.com",
  aud: "your-audience-id-here",
});
```

### Getting Configuration Values

1. **Domain**: Your Cloudflare Access team domain
   - Find at: Cloudflare Dashboard → Zero Trust → Settings

2. **Audience (aud)**: Policy audience identifier
   - Find at: Cloudflare Dashboard → Zero Trust → Access → Applications → [Your App] → Overview

### Accessing User Information

```typescript
import type { PluginData } from "@cloudflare/pages-plugin-cloudflare-access";

export const onRequest: PagesFunction<unknown, any, PluginData> = async ({
  data,
}) => {
  const userEmail = data.cloudflareAccess.JWT.payload.email;
  const userId = data.cloudflareAccess.JWT.payload.sub;

  return new Response(`Hello, ${userEmail}!`);
};
```

### Identity Lookup

```typescript
import { getIdentity } from "@cloudflare/pages-plugin-cloudflare-access/api";

const identity = await data.cloudflareAccess.JWT.getIdentity();

// Access detailed user info
console.log(identity.name);
console.log(identity.email);
console.log(identity.groups);
```

### Generating Auth URLs

```typescript
import {
  generateLoginURL,
  generateLogoutURL,
} from "@cloudflare/pages-plugin-cloudflare-access/api";

// Redirect to login
const loginURL = generateLoginURL({
  redirectURL: "https://symbolai.net/dashboard",
  domain: "https://your-team.cloudflareaccess.com",
  aud: "your-audience-id",
});

// Redirect to logout
const logoutURL = generateLogoutURL({
  domain: "https://your-team.cloudflareaccess.com",
});
```

### Integration with Existing Auth

You can use Cloudflare Access alongside your existing session-based auth:

```typescript
// src/middleware.ts
import cloudflareAccessPlugin from "@cloudflare/pages-plugin-cloudflare-access";

export const onRequest = [
  // First: Cloudflare Access validates JWT
  cloudflareAccessPlugin({
    domain: process.env.CF_ACCESS_DOMAIN,
    aud: process.env.CF_ACCESS_AUD,
  }),

  // Then: Your session-based auth
  defineMiddleware(async (context, next) => {
    // Your existing auth logic
    // You now have both CF Access JWT and session data
  }),
];
```

---

## Performance Optimization

### Middleware Performance

The enhanced middleware includes performance tracking:

```typescript
const startTime = Date.now();
// ... process request ...
const duration = Date.now() - startTime;

logger.info('Request completed', {
  status: response.status,
  duration: `${duration}ms`,
});
```

### Caching Strategies

```typescript
// Cache static responses
export const onRequest = async (context) => {
  const response = await context.next();

  if (context.url.pathname.startsWith('/static/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000');
  }

  return response;
};
```

### KV Performance

```typescript
// Use KV for frequently accessed data
const cachedData = await env.CACHE.get('user:123');

if (cachedData) {
  return JSON.parse(cachedData);
}

// Fetch and cache
const data = await fetchExpensiveData();
await env.CACHE.put('user:123', JSON.stringify(data), {
  expirationTtl: 3600, // 1 hour
});
```

---

## Debugging

### Local Development

```bash
# Start dev server with logging
npm run dev

# The enhanced middleware logs all requests with context
```

### Production Debugging

```bash
# Real-time tail logs
npm run cf:tail

# Filter by status code
wrangler tail --status error

# Filter by method
wrangler tail --header cf-ray

# Pretty format
wrangler tail --format pretty
```

### Debug Mode

Enable detailed logging in development:

```typescript
// .env.local
ENVIRONMENT=development
```

The logger automatically shows debug logs in development mode.

### Request Tracing

Every request gets a unique ID for tracing:

```json
{
  "requestId": "req_1732112445123_abc123",
  "path": "/api/users",
  "method": "POST"
}
```

Use this ID to trace requests across logs.

---

## Migration Checklist

- [ ] Review enhanced middleware implementation
- [ ] Configure allowed CORS origins
- [ ] Test CORS preflight requests
- [ ] Implement structured logging in key endpoints
- [ ] Set up A/B tests (if needed)
- [ ] Configure Cloudflare Access (optional)
- [ ] Test all security headers
- [ ] Monitor performance with logging
- [ ] Update documentation for your team
- [ ] Deploy to preview environment
- [ ] Run security audit
- [ ] Deploy to production

---

## Additional Resources

- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages/
- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **Astro Middleware**: https://docs.astro.build/en/guides/middleware/
- **OWASP Secure Headers**: https://owasp.org/www-project-secure-headers/
- **Security Audit Report**: See `COMPREHENSIVE_SECURITY_AUDIT_REPORT.md`
- **Configuration Guide**: See `CONFIGURATION.md`

---

**Last Updated**: 2025-11-20
**Maintained by**: SymbolAI Security Team
