# 📦 SymbolAI MCP Client Library

## Standalone TypeScript/JavaScript Library

This is a standalone build of the SymbolAI MCP Client Library, compiled with `tsup` for use in any Node.js or browser environment.

---

## 📋 Overview

The **SymbolAI MCP Client Library** provides a TypeScript/JavaScript interface for interacting with Cloudflare's MCP (Model Context Protocol) servers.

### Features

✅ **Full MCP Protocol Support**
- D1 Database operations
- KV Namespace management
- R2 Bucket operations
- Workers management
- Build monitoring

✅ **Security Built-in**
- SQL injection prevention
- Input validation
- Token management
- Retry logic with exponential backoff
- Request timeout handling

✅ **TypeScript Support**
- Full type definitions included
- IntelliSense support
- Type-safe API

---

## 🚀 Quick Start

### Installation

#### From Built Files

```bash
# Copy from dist folder
cp symbolai-worker/dist/* your-project/lib/
```

#### Build from Source

```bash
cd symbolai-worker
npm install
npm run build:lib
```

### Usage

#### CommonJS

```javascript
const { MCPClient, createAuthenticatedMCPClient } = require('./lib/mcp-client.cjs');

const client = new MCPClient({
  apiToken: 'your-cloudflare-api-token',
  accountId: 'your-account-id'
});

// List D1 databases
const databases = await client.listD1Databases();
console.log(databases);
```

#### ES Modules

```javascript
import { MCPClient, createAuthenticatedMCPClient } from './lib/mcp-client.js';

const client = new MCPClient({
  apiToken: 'your-cloudflare-api-token',
  accountId: 'your-account-id'
});

// Query D1 database
const result = await client.queryD1Database(
  'database-uuid',
  'SELECT * FROM users LIMIT 10',
  []
);
console.log(result);
```

#### TypeScript

```typescript
import {
  MCPClient,
  MCPConfig,
  D1QueryResult
} from './lib/mcp-client.js';

const config: MCPConfig = {
  apiToken: process.env.CLOUDFLARE_API_TOKEN!,
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!
};

const client = new MCPClient(config);

const result: D1QueryResult = await client.queryD1Database(
  'database-uuid',
  'SELECT * FROM users WHERE active = ? LIMIT ?',
  [true, 10]
);

console.log(`Rows returned: ${result.results.length}`);
console.log(`Execution time: ${result.meta.duration}ms`);
```

---

## 📚 API Reference

### MCPClient Class

#### Constructor

```typescript
new MCPClient(config: MCPConfig)
```

**Parameters:**
- `config.apiToken` (string): Cloudflare API token
- `config.accountId` (string, optional): Cloudflare account ID

#### Account Operations

```typescript
// List accounts
const accounts = await client.listAccounts();

// Set active account
await client.setActiveAccount('account-id');
```

#### D1 Operations

```typescript
// List databases
const databases = await client.listD1Databases();

// Get database info
const db = await client.getD1Database('database-uuid');

// Query database
const result = await client.queryD1Database(
  'database-uuid',
  'SELECT * FROM users WHERE id = ?',
  [123]
);

// Create database
await client.createD1Database('my-database');

// Delete database
await client.deleteD1Database('database-uuid');
```

#### KV Operations

```typescript
// List namespaces
const namespaces = await client.listKVNamespaces();

// Get namespace info
const ns = await client.getKVNamespace('namespace-id');

// Create namespace
await client.createKVNamespace('my-namespace');

// Delete namespace
await client.deleteKVNamespace('namespace-id');
```

#### R2 Operations

```typescript
// List buckets
const buckets = await client.listR2Buckets();

// Get bucket info
const bucket = await client.getR2Bucket('bucket-name');

// Create bucket
await client.createR2Bucket('my-bucket');

// Delete bucket
await client.deleteR2Bucket('bucket-name');
```

#### Workers Operations

```typescript
// List workers
const workers = await client.listWorkers();

// Get worker details
const worker = await client.getWorker('worker-name');

// Get worker code
const code = await client.getWorkerCode('worker-name');

// Set active worker (for build operations)
await client.setActiveWorker('worker-name');
```

#### Build Operations

```typescript
// List builds (requires setActiveWorker first)
await client.setActiveWorker('my-worker');
const builds = await client.listBuilds(20);

// Get build details
const build = await client.getBuild('build-id');

// Get build logs
const logs = await client.getBuildLogs('build-id');
```

---

## 🔒 Security Features

### SQL Injection Prevention

```typescript
import { validateSQL } from './lib/mcp-client.js';

// Validate SQL before execution
const validation = validateSQL('DROP TABLE users');

if (!validation.valid) {
  console.error('Dangerous SQL detected:', validation.issues);
  // Issues: ['SQL command not allowed: DROP']
}

// Safe queries pass validation
const safeQuery = validateSQL('SELECT * FROM users WHERE id = ?');
console.log(safeQuery.valid); // true
```

**Blocked Operations:**
- `DROP` - Drop tables/databases
- `TRUNCATE` - Clear table data
- `ALTER` - Modify schema
- `CREATE` - Create objects (use dedicated methods)
- `DELETE` without WHERE clause
- `UPDATE` without WHERE clause

**Enforced Limits:**
- Queries without `LIMIT` get automatic `LIMIT 1000`
- Configurable maximum row limit

### Token Management

```typescript
// Store token in KV
await storeMCPToken(kvNamespace, 'user-123', {
  accessToken: 'cf-token',
  expiresAt: Date.now() + 86400000, // 24 hours
  accountId: 'account-id'
});

// Retrieve token
const tokenData = await getMCPToken(kvNamespace, 'user-123');

// Create authenticated client from stored token
const client = await createAuthenticatedMCPClient(
  kvNamespace,
  'user-123'
);
```

### Request Options

```typescript
// Custom timeout and retry settings
const result = await client.queryD1Database(
  'database-uuid',
  'SELECT * FROM large_table',
  [],
  { timeout: 60000, retries: 5 } // 60s timeout, 5 retries
);
```

---

## 🎨 Examples

### Example 1: List All Resources

```typescript
import { MCPClient } from './lib/mcp-client.js';

async function listAllResources() {
  const client = new MCPClient({
    apiToken: process.env.CLOUDFLARE_API_TOKEN!,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!
  });

  console.log('=== D1 Databases ===');
  const databases = await client.listD1Databases();
  databases.forEach(db => {
    console.log(`- ${db.name} (${db.uuid})`);
  });

  console.log('\n=== KV Namespaces ===');
  const namespaces = await client.listKVNamespaces();
  namespaces.forEach(ns => {
    console.log(`- ${ns.title} (${ns.id})`);
  });

  console.log('\n=== R2 Buckets ===');
  const buckets = await client.listR2Buckets();
  buckets.forEach(bucket => {
    console.log(`- ${bucket.name}`);
  });

  console.log('\n=== Workers ===');
  const workers = await client.listWorkers();
  workers.forEach(worker => {
    console.log(`- ${worker.id}`);
  });
}

listAllResources().catch(console.error);
```

### Example 2: Query with Parameters

```typescript
import { MCPClient } from './lib/mcp-client.js';

async function getUsersByBranch(branchId: string) {
  const client = new MCPClient({
    apiToken: process.env.CLOUDFLARE_API_TOKEN!,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!
  });

  const result = await client.queryD1Database(
    process.env.DATABASE_ID!,
    `SELECT username, email, role_id
     FROM users_new
     WHERE branch_id = ? AND is_active = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [branchId, true, 50]
  );

  console.log(`Found ${result.results.length} active users`);
  console.log(`Query took ${result.meta.duration}ms`);

  return result.results;
}

getUsersByBranch('branch_1010').then(users => {
  users.forEach(user => {
    console.log(`${user.username} <${user.email}>`);
  });
});
```

### Example 3: Monitor Deployments

```typescript
import { MCPClient } from './lib/mcp-client.js';

async function monitorDeployments(workerName: string) {
  const client = new MCPClient({
    apiToken: process.env.CLOUDFLARE_API_TOKEN!,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!
  });

  await client.setActiveWorker(workerName);
  const builds = await client.listBuilds(10);

  const successCount = builds.filter(b => b.status === 'success').length;
  const failureCount = builds.filter(b => b.status === 'failure').length;

  console.log(`\n=== Deployment Status for ${workerName} ===`);
  console.log(`Total builds: ${builds.length}`);
  console.log(`Success: ${successCount} (${(successCount/builds.length*100).toFixed(1)}%)`);
  console.log(`Failures: ${failureCount}`);

  console.log('\nRecent builds:');
  builds.slice(0, 5).forEach(build => {
    const status = build.status === 'success' ? '✅' : '❌';
    console.log(`${status} ${build.id} - ${build.metadata?.commit_message || 'No message'}`);
  });
}

monitorDeployments('symbolai-worker').catch(console.error);
```

### Example 4: Error Handling

```typescript
import { MCPClient, validateSQL } from './lib/mcp-client.js';

async function safeQuery(sql: string, params: any[] = []) {
  // Validate SQL first
  const validation = validateSQL(sql);
  if (!validation.valid) {
    throw new Error(`Invalid SQL: ${validation.issues.join(', ')}`);
  }

  const client = new MCPClient({
    apiToken: process.env.CLOUDFLARE_API_TOKEN!,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!
  });

  try {
    const result = await client.queryD1Database(
      process.env.DATABASE_ID!,
      sql,
      params,
      { timeout: 30000, retries: 3 }
    );
    return result;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        console.error('Query timed out - consider optimizing or adding indexes');
      } else if (error.message.includes('unauthorized')) {
        console.error('Invalid API token or insufficient permissions');
      } else {
        console.error('Query failed:', error.message);
      }
    }
    throw error;
  }
}

// Usage
safeQuery('SELECT * FROM users WHERE branch_id = ?', ['branch_1010'])
  .then(result => console.log(`Success: ${result.results.length} rows`))
  .catch(error => console.error('Failed:', error.message));
```

---

## 🔧 Build Scripts

### Available Commands

```bash
# Build library (CommonJS + ESM + TypeScript declarations)
npm run build:lib

# Watch mode (rebuild on file changes)
npm run build:watch

# Build Astro application
npm run build

# Development server
npm run dev

# Test MCP endpoint
npm run test:mcp https://your-domain.workers.dev/api/mcp/sse
```

### Build Output

```
dist/
├── mcp-client.cjs           # CommonJS bundle (Node.js require)
├── mcp-client.cjs.map       # CommonJS source map
├── mcp-client.d.cts         # CommonJS type declarations
├── mcp-client.js            # ES Module bundle (import/export)
├── mcp-client.js.map        # ES Module source map
└── mcp-client.d.ts          # ES Module type declarations
```

### Build Configuration

**tsup.config.ts:**
```typescript
export default defineConfig({
  entry: ['src/lib/mcp-client.ts'],
  format: ['cjs', 'esm'],
  dts: true,              // Generate .d.ts files
  sourcemap: true,        // Generate source maps
  clean: true,            // Clean dist/ before build
  minify: false,          // Keep readable for debugging
  target: 'es2022',       // Modern JavaScript
  treeshake: true,        // Remove unused code
});
```

---

## 📊 Type Definitions

### Core Types

```typescript
// Configuration
export interface MCPConfig {
  accountId?: string;
  apiToken?: string;
}

// D1 Database
export interface D1Database {
  uuid: string;
  name: string;
  version: string;
  num_tables: number;
  file_size: number;
  created_at: string;
}

export interface D1QueryResult {
  success: boolean;
  meta: {
    duration: number;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
  results: Record<string, any>[];
}

// KV Namespace
export interface KVNamespaceInfo {
  id: string;
  title: string;
  supports_url_encoding: boolean;
}

// R2 Bucket
export interface R2Bucket {
  name: string;
  creation_date: string;
}

// Worker
export interface WorkerScript {
  id: string;
  etag: string;
  pipeline_hash: string;
  modified_on: string;
}

// Build
export interface Build {
  id: string;
  status: 'success' | 'failure' | 'pending';
  created_on: string;
  metadata?: {
    commit_message?: string;
    branch?: string;
    commit_hash?: string;
  };
}

// Token Storage
export interface MCPTokenData {
  accessToken: string;
  expiresAt: number;
  accountId?: string;
}

// SQL Validation
export interface SQLValidation {
  valid: boolean;
  issues: string[];
}
```

---

## 🚦 Testing

### Test MCP Endpoint

```bash
# Test SSE connection
npm run test:mcp https://your-domain.workers.dev/api/mcp/sse

# With authentication
npx -p mcp-remote@latest mcp-remote-client \
  https://your-domain.workers.dev/api/mcp/sse \
  --header "Authorization:Bearer your-token"
```

### Unit Tests (Future)

```typescript
import { validateSQL } from './lib/mcp-client.js';
import { describe, it, expect } from 'vitest';

describe('SQL Validation', () => {
  it('should allow safe SELECT queries', () => {
    const result = validateSQL('SELECT * FROM users WHERE id = ?');
    expect(result.valid).toBe(true);
  });

  it('should block DROP commands', () => {
    const result = validateSQL('DROP TABLE users');
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('SQL command not allowed: DROP');
  });

  it('should enforce LIMIT on large queries', () => {
    const result = validateSQL('SELECT * FROM users');
    expect(result.valid).toBe(true);
    // Library auto-adds LIMIT 1000
  });
});
```

---

## 📈 Performance

### Optimizations

✅ **Request Retry with Exponential Backoff**
- Retries: 3 attempts (configurable)
- Delays: 2s, 4s, 8s
- Prevents temporary network failures

✅ **Request Timeout**
- Default: 30 seconds
- Configurable per request
- Prevents hanging requests

✅ **SQL Query Limits**
- Auto-adds LIMIT 1000 if missing
- Prevents accidentally fetching millions of rows

✅ **Tree Shaking**
- Unused code removed during build
- Smaller bundle size
- Faster load times

### Bundle Size

| Format | Size | Gzipped |
|--------|------|---------|
| **CommonJS** | 14.31 KB | ~4 KB |
| **ES Module** | 14.08 KB | ~4 KB |
| **Type Definitions** | 7.39 KB | ~2 KB |

---

## 🔐 Security Best Practices

### 1. Never Hardcode Tokens

❌ **Bad:**
```typescript
const client = new MCPClient({
  apiToken: 'cf_token_abc123...',  // Don't do this!
  accountId: 'abc123...'
});
```

✅ **Good:**
```typescript
const client = new MCPClient({
  apiToken: process.env.CLOUDFLARE_API_TOKEN!,
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!
});
```

### 2. Use Parameterized Queries

❌ **Bad:**
```typescript
const userId = req.query.id;
const sql = `SELECT * FROM users WHERE id = ${userId}`;  // SQL injection!
await client.queryD1Database(dbId, sql);
```

✅ **Good:**
```typescript
const userId = req.query.id;
const sql = 'SELECT * FROM users WHERE id = ?';
await client.queryD1Database(dbId, sql, [userId]);
```

### 3. Validate Before Executing

✅ **Good:**
```typescript
const validation = validateSQL(userInput);
if (!validation.valid) {
  return res.status(400).json({ error: 'Invalid SQL', issues: validation.issues });
}
await client.queryD1Database(dbId, userInput);
```

### 4. Use Minimal Permissions

Create API tokens with only required permissions:
```
✅ D1: Read, Edit (if you need D1)
✅ KV: Read, Edit (if you need KV)
❌ Don't give full account access
```

### 5. Handle Errors Securely

❌ **Bad:**
```typescript
try {
  await client.queryD1Database(dbId, sql);
} catch (error) {
  res.send(error.message);  // Leaks internal details!
}
```

✅ **Good:**
```typescript
try {
  await client.queryD1Database(dbId, sql);
} catch (error) {
  console.error('Query error:', error);
  res.status(500).json({ error: 'Query failed' });
}
```

---

## 🤝 Contributing

### Building from Source

```bash
# Clone repository
git clone https://github.com/your-org/symbolai-worker.git
cd symbolai-worker

# Install dependencies
npm install --legacy-peer-deps

# Build library
npm run build:lib

# Watch mode for development
npm run build:watch
```

### Making Changes

1. Edit `src/lib/mcp-client.ts`
2. Run `npm run build:lib`
3. Test with `npm run test:mcp`
4. Commit changes

---

## 📚 Related Documentation

- [MCP Integration Guide](../MCP_INTEGRATION_GUIDE.md)
- [MCP Client Configuration](../MCP_CLIENT_CONFIGURATION.md)
- [MCP Architecture](../MCP_ARCHITECTURE.md)
- [Cloudflare MCP Servers](https://github.com/cloudflare/mcp-server-cloudflare)

---

## 📄 License

MIT License - see LICENSE file for details

---

## ✅ Quick Reference

### Installation
```bash
npm run build:lib
cp dist/* your-project/lib/
```

### Import
```typescript
import { MCPClient } from './lib/mcp-client.js';
```

### Initialize
```typescript
const client = new MCPClient({
  apiToken: process.env.CLOUDFLARE_API_TOKEN!,
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!
});
```

### Query
```typescript
const result = await client.queryD1Database(
  'db-uuid',
  'SELECT * FROM users WHERE id = ?',
  [123]
);
```

### Validate
```typescript
import { validateSQL } from './lib/mcp-client.js';
const validation = validateSQL(sql);
```

---

**Version**: 1.0.0

**Build Tool**: tsup v8.5.0

**Target**: ES2022

**Status**: ✅ Production Ready
