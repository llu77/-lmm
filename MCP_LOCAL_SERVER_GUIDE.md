# 🚀 دليل MCP Local Server - SymbolAI

> **تم الحل!** بدلاً من الاتصال بخوادم Cloudflare MCP الخارجية (المحظورة)،
> قمنا بإنشاء **MCP Server محلي** داخل Worker نفسه!

---

## 📋 المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [البنية](#البنية)
3. [التشغيل المحلي](#التشغيل-المحلي)
4. [الاستخدام](#الاستخدام)
5. [الأدوات المتاحة](#الأدوات-المتاحة)
6. [أمثلة عملية](#أمثلة-عملية)
7. [النشر](#النشر)

---

## نظرة عامة

### ✅ ما تم إنجازه

تم إنشاء **MCP Server كامل** يعمل محلياً داخل Cloudflare Worker:

```
symbolai-worker/
├── src/
│   ├── pages/
│   │   ├── api/
│   │   │   └── mcp-server/
│   │   │       └── [...path].ts      # MCP Server endpoint
│   │   └── mcp-test.astro            # صفحة اختبار بواجهة رسومية
│   └── lib/
│       └── local-mcp-client.ts        # MCP Client محلي
└── test-mcp-local.mjs                 # CLI للاختبار
```

### 🎯 المزايا

- ✅ **لا يحتاج اتصال خارجي** - يعمل بالكامل داخل Worker
- ✅ **وصول مباشر** لـ D1, KV, R2 عبر Bindings
- ✅ **JSON-RPC 2.0** - متوافق مع MCP standard
- ✅ **واجهة اختبار رسومية** - `/mcp-test`
- ✅ **CLI للاختبار** - من command line
- ✅ **مصادقة آمنة** - Admin role required

---

## البنية

### MCP Server (`/api/mcp-server`)

**الملف:** `symbolai-worker/src/pages/api/mcp-server/[...path].ts`

**الوظائف:**
- معالجة طلبات JSON-RPC 2.0
- توفير 10 أدوات للتحكم بـ D1, KV, R2
- التحقق من المصادقة والصلاحيات
- إرجاع responses متوافقة مع MCP

**Endpoints:**
```
POST /api/mcp-server    # MCP requests
GET  /api/mcp-server    # Server info
```

### MCP Client (`LocalMCPClient`)

**الملف:** `symbolai-worker/src/lib/local-mcp-client.ts`

**الوظائف:**
- إرسال طلبات JSON-RPC
- Helper methods لكل عملية
- دعم batch operations
- Resources summary

### Test Page (`/mcp-test`)

**الملف:** `symbolai-worker/src/pages/mcp-test.astro`

**المزايا:**
- واجهة رسومية للاختبار
- أزرار لكل عملية
- عرض النتائج بشكل جميل
- Custom SQL query editor

### CLI Test Script

**الملف:** `test-mcp-local.mjs`

**الاستخدام:**
```bash
node test-mcp-local.mjs              # تشغيل جميع الاختبارات
node test-mcp-local.mjs d1-tables    # أمر واحد
node test-mcp-local.mjs d1-query "SELECT * FROM employees LIMIT 5"
```

---

## التشغيل المحلي

### 1. تشغيل Dev Server

```bash
cd symbolai-worker
npm run dev
```

Server سيعمل على: `http://localhost:4321`

### 2. الوصول لصفحة الاختبار

```
http://localhost:4321/mcp-test
```

### 3. اختبار من CLI

```bash
# من المجلد الرئيسي
BASE_URL=http://localhost:4321 node test-mcp-local.mjs

# مع session token (إذا كان مطلوب)
BASE_URL=http://localhost:4321 SESSION_TOKEN=your-session-token node test-mcp-local.mjs
```

---

## الاستخدام

### من JavaScript/TypeScript

```typescript
import { createLocalMCPClient } from '@/lib/local-mcp-client';

// إنشاء client
const client = createLocalMCPClient(sessionToken);

// Initialize
await client.initialize();

// List tools
const tools = await client.listTools();

// D1 operations
const tables = await client.listD1Tables();
const result = await client.queryD1('SELECT * FROM employees LIMIT 10');

// KV operations
const keys = await client.listKVKeys();
await client.putKV('test-key', 'test-value', 3600);
const value = await client.getKV('test-key');

// R2 operations
const objects = await client.listR2Objects();
const info = await client.getR2Object('payroll.pdf');

// Resources summary
const summary = await client.getResourcesSummary();
```

### من API مباشرة

```bash
# Initialize
curl -X POST http://localhost:4321/api/mcp-server \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {"protocolVersion": "2024-11-05"},
    "id": 1
  }'

# List tools
curl -X POST http://localhost:4321/api/mcp-server \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 2
  }'

# Call tool (D1 query)
curl -X POST http://localhost:4321/api/mcp-server \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "d1_query",
      "arguments": {
        "sql": "SELECT COUNT(*) as count FROM employees"
      }
    },
    "id": 3
  }'
```

---

## الأدوات المتاحة

### D1 Database Tools

#### 1. `d1_list_databases`
قائمة قواعد البيانات المتاحة

```javascript
await client.callTool('d1_list_databases');
```

#### 2. `d1_query`
تنفيذ استعلام SQL

```javascript
await client.callTool('d1_query', {
  sql: 'SELECT * FROM employees WHERE branch_id = ?',
  params: ['BR001']
});
```

#### 3. `d1_list_tables`
قائمة الجداول في قاعدة البيانات

```javascript
await client.callTool('d1_list_tables');
```

---

### KV Namespace Tools

#### 4. `kv_list_keys`
قائمة المفاتيح

```javascript
await client.callTool('kv_list_keys', {
  prefix: 'session:',
  limit: 50
});
```

#### 5. `kv_get`
جلب قيمة

```javascript
await client.callTool('kv_get', {
  key: 'session:abc123'
});
```

#### 6. `kv_put`
تخزين قيمة

```javascript
await client.callTool('kv_put', {
  key: 'cache:user:123',
  value: JSON.stringify({ name: 'Ahmed', role: 'admin' }),
  expirationTtl: 3600  // 1 hour
});
```

#### 7. `kv_delete`
حذف مفتاح

```javascript
await client.callTool('kv_delete', {
  key: 'old-key'
});
```

---

### R2 Storage Tools

#### 8. `r2_list_objects`
قائمة الملفات

```javascript
await client.callTool('r2_list_objects', {
  prefix: 'payrolls/',
  limit: 100
});
```

#### 9. `r2_get_object`
معلومات ملف

```javascript
await client.callTool('r2_get_object', {
  key: 'payrolls/2025-11.pdf'
});
```

#### 10. `r2_delete_object`
حذف ملف

```javascript
await client.callTool('r2_delete_object', {
  key: 'temp/old-file.pdf'
});
```

---

## أمثلة عملية

### مثال 1: تحليل البيانات

```javascript
const client = createLocalMCPClient(sessionToken);

// 1. Get all tables
const tables = await client.listD1Tables();
console.log('Available tables:', tables);

// 2. Count records in each table
for (const table of tables) {
  const result = await client.queryD1(
    `SELECT COUNT(*) as count FROM ${table.name}`
  );
  console.log(`${table.name}: ${result.results[0].count} rows`);
}

// 3. Get active employees
const employees = await client.queryD1(`
  SELECT employee_name, base_salary, branch_id
  FROM employees
  WHERE is_active = 1
  ORDER BY base_salary DESC
  LIMIT 10
`);

console.log('Top 10 employees:', employees.results);
```

### مثال 2: إدارة Cache

```javascript
const client = createLocalMCPClient(sessionToken);

// 1. Store in cache
await client.putKV(
  'cache:dashboard:stats',
  JSON.stringify({
    totalRevenue: 125000,
    totalExpenses: 45000,
    netProfit: 80000,
    timestamp: new Date().toISOString()
  }),
  300  // 5 minutes TTL
);

// 2. Retrieve from cache
const cached = await client.getKV('cache:dashboard:stats');

if (cached.exists) {
  const stats = JSON.parse(cached.value);
  console.log('Cached stats:', stats);
} else {
  console.log('Cache miss - fetch from database');
}

// 3. Clean old cache keys
const allKeys = await client.listKVKeys('cache:', 1000);

for (const key of allKeys.keys) {
  // Delete keys older than 1 day
  // (implement your logic here)
}
```

### مثال 3: إدارة الملفات

```javascript
const client = createLocalMCPClient(sessionToken);

// 1. List all payroll PDFs
const payrolls = await client.listR2Objects('payrolls/', 100);

console.log(`Found ${payrolls.objects.length} payroll files`);

// 2. Get file info
for (const obj of payrolls.objects) {
  const info = await client.getR2Object(obj.key);

  console.log(`File: ${info.key}`);
  console.log(`Size: ${(info.size / 1024).toFixed(2)} KB`);
  console.log(`Uploaded: ${info.uploaded}`);
}

// 3. Delete old files (>6 months)
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

for (const obj of payrolls.objects) {
  if (new Date(obj.uploaded) < sixMonthsAgo) {
    await client.deleteR2Object(obj.key);
    console.log(`Deleted old file: ${obj.key}`);
  }
}
```

### مثال 4: Batch Operations

```javascript
const client = createLocalMCPClient(sessionToken);

// Execute multiple queries
const results = await client.executeBatch([
  { sql: 'SELECT COUNT(*) as count FROM employees' },
  { sql: 'SELECT COUNT(*) as count FROM revenues' },
  { sql: 'SELECT COUNT(*) as count FROM expenses' },
  { sql: 'SELECT branch_id, COUNT(*) as count FROM employees GROUP BY branch_id' }
]);

console.log('Total employees:', results[0].results[0].count);
console.log('Total revenues:', results[1].results[0].count);
console.log('Total expenses:', results[2].results[0].count);
console.log('Employees per branch:', results[3].results);
```

---

## النشر

### 1. Build

```bash
cd symbolai-worker
npm run build
```

### 2. Deploy إلى Cloudflare

```bash
# تأكد من تسجيل الدخول
CLOUDFLARE_API_TOKEN=your-token npx wrangler deploy

# أو إذا كنت مسجل دخول بالفعل
npm run deploy
```

### 3. تحديث KV Namespace ID

في `wrangler.toml`، حدث KV namespace ID:

```toml
[[kv_namespaces]]
binding = "SESSIONS"
id = "your-actual-kv-id-here"
```

### 4. اختبر MCP Server المنشور

```bash
# اختبر من CLI
BASE_URL=https://symbolai.net node test-mcp-local.mjs

# أو افتح في المتصفح
https://symbolai.net/mcp-test
```

---

## 🔧 Troubleshooting

### مشكلة: 403 Forbidden

**السبب:** لم تسجل دخول أو لا تملك Admin role

**الحل:**
```bash
# سجل دخول أولاً
# ثم استخدم session token في الطلبات
```

### مشكلة: KV namespace غير موجود

**السبب:** KV namespace ID غير صحيح في wrangler.toml

**الحل:**
```bash
# أنشئ KV namespace
npx wrangler kv:namespace create SESSIONS

# انسخ الـ ID وحدث wrangler.toml
```

### مشكلة: D1 query فشل

**السبب:** SQL خاطئ أو database binding غير موجود

**الحل:**
```bash
# تحقق من D1 binding في wrangler.toml
# تأكد من صحة SQL syntax
```

---

## 📚 المراجع

- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare KV Docs](https://developers.cloudflare.com/kv/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)

---

## ✅ الخلاصة

تم إنشاء **MCP Server محلي كامل** يحل مشكلة الوصول لخوادم Cloudflare الخارجية!

**المزايا:**
- ✅ يعمل بالكامل داخل Worker
- ✅ وصول مباشر لـ D1, KV, R2
- ✅ متوافق مع MCP standard
- ✅ واجهة اختبار + CLI
- ✅ جاهز للنشر

**الاستخدام:**
```bash
# Local testing
npm run dev
open http://localhost:4321/mcp-test

# CLI testing
node test-mcp-local.mjs

# Deploy
npm run deploy
```

🎉 **الآن يمكنك التحكم بالكامل بـ Cloudflare resources عبر MCP!**
