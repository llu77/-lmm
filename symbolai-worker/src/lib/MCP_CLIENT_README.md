# Cloudflare MCP Client

مكتبة TypeScript للتفاعل مع Cloudflare MCP (Model Context Protocol) servers.

## 📋 المحتويات

- [نظرة عامة](#نظرة-عامة)
- [التثبيت](#التثبيت)
- [الاستخدام السريع](#الاستخدام-السريع)
- [API Reference](#api-reference)
- [الأمان](#الأمان)
- [أمثلة](#أمثلة)

---

## 🌟 نظرة عامة

توفر هذه المكتبة واجهة نظيفة وآمنة للتعامل مع Cloudflare MCP servers:

### الميزات الرئيسية:

✅ **Type-Safe**: دعم كامل لـ TypeScript مع types من `@cloudflare/workers-types`
✅ **Secure**: حماية من SQL injection وvalidation شامل
✅ **Reliable**: retry logic مع exponential backoff
✅ **Documented**: JSDoc comments شاملة

### MCP Servers المدعومة:

- **Workers Bindings**: إدارة D1, KV, R2, Workers
- **Workers Builds**: مراقبة deployments
- **Observability**: logs وanalytics
- **Radar**: بيانات الإنترنت
- **Browser**: browser rendering
- **AI Gateway**: إدارة AI requests
- **Audit Logs**: سجلات التدقيق

---

## 🚀 التثبيت

المكتبة مُضمّنة في المشروع، لا حاجة لتثبيت منفصل.

### المتطلبات:

```json
{
  "dependencies": {
    "@cloudflare/workers-types": "^4.20250110.0"
  }
}
```

---

## ⚡ الاستخدام السريع

### 1. ربط MCP Token

```typescript
import { storeMCPToken } from '@/lib/mcp-client';

// تخزين token في KV
await storeMCPToken(
  env.SESSIONS,  // KV namespace binding
  userId,
  {
    accessToken: 'your-cloudflare-api-token',
    accountId: 'your-account-id',
    expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
  }
);
```

### 2. إنشاء MCP Client

```typescript
import { createAuthenticatedMCPClient } from '@/lib/mcp-client';

// إنشاء client مع token مُخزّن
const mcpClient = await createAuthenticatedMCPClient(
  env.SESSIONS,
  userId
);

if (!mcpClient) {
  // المستخدم لم يربط MCP بعد
  return new Response('MCP not connected', { status: 401 });
}
```

### 3. تنفيذ استعلام D1

```typescript
import { validateSQL } from '@/lib/mcp-client';

// التحقق من SQL أولاً
const validation = validateSQL(sqlQuery);
if (!validation.valid) {
  throw new Error(validation.error);
}

// تنفيذ الاستعلام
const result = await mcpClient.queryD1Database(
  'database-id',
  'SELECT * FROM users WHERE branch_id = ? LIMIT 10',
  [branchId]
);

console.log(`نتائج: ${result.results.length} صف`);
console.log(`الوقت: ${result.meta.duration}ms`);
```

---

## 📚 API Reference

### Token Management

#### `storeMCPToken(kv, userId, tokenData)`

تخزين MCP token في KV.

**Parameters:**
- `kv: KVNamespace` - Cloudflare KV binding
- `userId: string` - معرّف المستخدم
- `tokenData: MCPTokenData` - بيانات الـ token

**Returns:** `Promise<void>`

**مثال:**
```typescript
await storeMCPToken(env.SESSIONS, 'user123', {
  accessToken: 'cf-token-...',
  accountId: 'acc-123',
  expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000),
});
```

---

#### `getMCPToken(kv, userId)`

استرجاع MCP token من KV.

**Parameters:**
- `kv: KVNamespace` - Cloudflare KV binding
- `userId: string` - معرّف المستخدم

**Returns:** `Promise<MCPTokenData | null>`

**مثال:**
```typescript
const tokenData = await getMCPToken(env.SESSIONS, 'user123');
if (tokenData) {
  console.log(`Account: ${tokenData.accountId}`);
}
```

---

#### `deleteMCPToken(kv, userId)`

حذف MCP token من KV.

**Parameters:**
- `kv: KVNamespace` - Cloudflare KV binding
- `userId: string` - معرّف المستخدم

**Returns:** `Promise<void>`

---

#### `createAuthenticatedMCPClient(kv, userId)`

إنشاء MCP client مع authentication تلقائي.

**Parameters:**
- `kv: KVNamespace` - Cloudflare KV binding
- `userId: string` - معرّف المستخدم

**Returns:** `Promise<MCPClient | null>`

**مثال:**
```typescript
const client = await createAuthenticatedMCPClient(env.SESSIONS, userId);
if (!client) {
  throw new Error('MCP not connected');
}
```

---

### D1 Database Operations

#### `mcpClient.listD1Databases()`

عرض جميع D1 databases في الحساب.

**Returns:** `Promise<D1Database[]>`

**مثال:**
```typescript
const databases = await mcpClient.listD1Databases();
databases.forEach(db => {
  console.log(`${db.name}: ${db.num_tables} tables`);
});
```

---

#### `mcpClient.queryD1Database(databaseId, sql, params?)`

تنفيذ استعلام SQL على D1 database.

**Parameters:**
- `databaseId: string` - معرّف قاعدة البيانات
- `sql: string` - استعلام SQL
- `params?: any[]` - parameters للاستعلام

**Returns:** `Promise<D1QueryResult>`

**Security:** يتم التحقق من SQL تلقائياً باستخدام `validateSQL()`

**مثال:**
```typescript
const result = await mcpClient.queryD1Database(
  '3897ede2-ffc0-4fe8-8217-f9607c89bef2',
  'SELECT * FROM employees WHERE salary > ? LIMIT ?',
  [5000, 10]
);

console.log(`${result.results.length} employees found`);
```

---

#### `mcpClient.createD1Database(name)`

إنشاء D1 database جديدة.

**Parameters:**
- `name: string` - اسم قاعدة البيانات

**Returns:** `Promise<D1Database>`

---

### KV Namespace Operations

#### `mcpClient.listKVNamespaces()`

عرض جميع KV namespaces.

**Returns:** `Promise<KVNamespaceInfo[]>`

---

#### `mcpClient.createKVNamespace(title)`

إنشاء KV namespace جديد.

**Parameters:**
- `title: string` - عنوان الـ namespace

**Returns:** `Promise<KVNamespaceInfo>`

---

### R2 Bucket Operations

#### `mcpClient.listR2Buckets()`

عرض جميع R2 buckets.

**Returns:** `Promise<R2Bucket[]>`

**مثال:**
```typescript
const buckets = await mcpClient.listR2Buckets();
buckets.forEach(bucket => {
  console.log(`${bucket.name} (${bucket.location})`);
});
```

---

### Workers Operations

#### `mcpClient.listWorkers()`

عرض جميع Workers.

**Returns:** `Promise<Worker[]>`

---

#### `mcpClient.getWorkerCode(scriptName)`

الحصول على source code لـ Worker.

**Parameters:**
- `scriptName: string` - اسم الـ Worker

**Returns:** `Promise<string>`

---

### Builds Operations

#### `mcpClient.listBuilds(limit?)`

عرض builds للـ Worker.

**Parameters:**
- `limit?: number` - عدد الـ builds (افتراضي: 10)

**Returns:** `Promise<Build[]>`

**مثال:**
```typescript
await mcpClient.setActiveWorker('symbolai-worker');
const builds = await mcpClient.listBuilds(5);

builds.forEach(build => {
  console.log(formatBuildStatus(build));
});
```

---

## 🔒 الأمان

### SQL Injection Protection

```typescript
import { validateSQL } from '@/lib/mcp-client';

const validation = validateSQL(userInput);
if (!validation.valid) {
  return new Response(validation.error, { status: 400 });
}
```

**الحماية من:**
- ✅ DROP, TRUNCATE, EXEC, ATTACH commands
- ✅ Multi-statement queries (`;`)
- ✅ SQL comments (`--`, `/* */`)
- ✅ UNION injection
- ✅ File operations

**الاستعلامات المسموحة:**
- SELECT
- INSERT
- UPDATE
- DELETE
- WITH (CTEs)

---

### Error Handling

```typescript
try {
  const result = await mcpClient.queryD1Database(dbId, sql);
  // ...
} catch (error) {
  if (error.message.includes('401')) {
    // Token expired or invalid
  } else if (error.message.includes('timeout')) {
    // Request timeout
  } else {
    // Other errors
  }
}
```

**Features:**
- ✅ Automatic retry (3 attempts)
- ✅ Exponential backoff (2s, 4s, 8s)
- ✅ Timeout (30s default)
- ✅ Detailed error messages

---

## 📖 أمثلة

### مثال 1: Dashboard Statistics

```typescript
import { createAuthenticatedMCPClient } from '@/lib/mcp-client';

export const GET: APIRoute = async ({ locals }) => {
  const mcpClient = await createAuthenticatedMCPClient(
    locals.runtime.env.SESSIONS,
    userId
  );

  if (!mcpClient) {
    return new Response('MCP not connected', { status: 401 });
  }

  // Get database statistics
  const result = await mcpClient.queryD1Database(
    env.DB_ID,
    `SELECT
      COUNT(*) as total_employees,
      SUM(salary) as total_salaries,
      AVG(salary) as avg_salary
    FROM employees
    LIMIT 1`
  );

  return new Response(JSON.stringify(result.results[0]));
};
```

---

### مثال 2: Branch Report

```typescript
const branchId = 1;

const result = await mcpClient.queryD1Database(
  env.DB_ID,
  `SELECT
    e.name,
    e.salary,
    e.position,
    b.name_ar as branch
  FROM employees e
  JOIN branches b ON e.branch_id = b.id
  WHERE e.branch_id = ?
  ORDER BY e.salary DESC
  LIMIT 50`,
  [branchId]
);

// Format as table
import { formatD1Results } from '@/lib/mcp-client';
const table = formatD1Results(result);
console.log(table);
```

---

### مثال 3: Build Monitoring

```typescript
await mcpClient.setActiveWorker('symbolai-worker');

const builds = await mcpClient.listBuilds(10);

const stats = {
  total: builds.length,
  successful: builds.filter(b => b.status === 'success').length,
  failed: builds.filter(b => b.status === 'failure').length,
  latest: builds[0],
};

console.log(`Success Rate: ${(stats.successful / stats.total * 100).toFixed(1)}%`);
```

---

## 🔧 التكوين

### Environment Variables

في `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "SESSIONS"
id = "your-kv-id"

[[d1_databases]]
binding = "DB"
database_id = "your-db-id"
```

في `.env`:

```
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_ACCOUNT_ID=your-account-id
```

---

## 📝 Notes

1. **Performance**: MCP requests تستغرق 100-500ms بسبب network latency
2. **Rate Limits**: Cloudflare API له rate limits (راجع documentation)
3. **Caching**: فكّر في caching النتائج للاستعلامات المتكررة
4. **Security**: لا تُشارك API tokens أبداً في client-side code

---

## 🐛 Troubleshooting

### "MCP not connected"
```typescript
// التحقق من وجود token
const token = await getMCPToken(env.SESSIONS, userId);
if (!token) {
  // المستخدم يحتاج لربط MCP أولاً
}
```

### "SQL validation failed"
```typescript
const validation = validateSQL(sql);
console.log(validation.error); // اقرأ السبب
```

### "Request timeout"
```typescript
// زيادة timeout
const client = new MCPClient({ ... });
await client.makeRequest(endpoint, method, params, { timeout: 60000 });
```

---

## 📞 Support

للمساعدة:
1. راجع [Cloudflare MCP Documentation](https://github.com/cloudflare/mcp-server-cloudflare)
2. افحص console logs للأخطاء التفصيلية
3. تحقق من صلاحيات API token

---

**آخر تحديث:** 2025-01-15
