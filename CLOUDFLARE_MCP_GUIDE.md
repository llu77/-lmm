# دليل Cloudflare MCP Servers - SymbolAI Project
# Cloudflare MCP Servers Guide

**Date**: 2025-10-30
**Project**: SymbolAI Worker
**Repository**: `cloudflare/mcp-server-cloudflare`

---

## 📋 نظرة عامة | Overview

تم استنساخ مستودع **Cloudflare MCP Server** الرسمي بنجاح:

```bash
Repository: github.com/cloudflare/mcp-server-cloudflare
Location: /home/user/lkm/mcp-server-cloudflare
Total Servers: 17 MCP servers
Status: ✅ Ready to use
```

### ما هو MCP؟

**Model Context Protocol (MCP)** هو بروتوكول موحد جديد لإدارة السياق بين LLMs والأنظمة الخارجية، يسمح لـ AI assistants بالتفاعل مع خدمات Cloudflare باستخدام اللغة الطبيعية.

---

## 🌐 جميع Cloudflare MCP Servers المتاحة

| # | Server Name | Description | URL |
|---|-------------|-------------|-----|
| 1 | **Documentation** | معلومات مرجعية محدثة عن Cloudflare | `https://docs.mcp.cloudflare.com/mcp` |
| 2 | **Workers Bindings** ⭐ | بناء Workers مع storage, AI, compute | `https://bindings.mcp.cloudflare.com/mcp` |
| 3 | **Workers Builds** ⭐ | إدارة ومراقبة Workers Builds | `https://builds.mcp.cloudflare.com/mcp` |
| 4 | **Observability** | Debug و logs و analytics | `https://observability.mcp.cloudflare.com/mcp` |
| 5 | **Radar** | Internet traffic insights | `https://radar.mcp.cloudflare.com/mcp` |
| 6 | **Container** | Sandbox development environment | `https://containers.mcp.cloudflare.com/mcp` |
| 7 | **Browser Rendering** | Fetch pages, markdown, screenshots | `https://browser.mcp.cloudflare.com/mcp` |
| 8 | **Logpush** | Logpush job health summaries | `https://logs.mcp.cloudflare.com/mcp` |
| 9 | **AI Gateway** | Search logs, prompts, responses | `https://ai-gateway.mcp.cloudflare.com/mcp` |
| 10 | **AutoRAG** | List and search AutoRAG documents | `https://autorag.mcp.cloudflare.com/mcp` |
| 11 | **Audit Logs** | Query audit logs & reports | `https://auditlogs.mcp.cloudflare.com/mcp` |
| 12 | **DNS Analytics** | Optimize DNS performance | `https://dns-analytics.mcp.cloudflare.com/mcp` |
| 13 | **DEX** | Digital Experience Monitoring | `https://dex.mcp.cloudflare.com/mcp` |
| 14 | **Cloudflare One CASB** | Security misconfigurations | `https://casb.mcp.cloudflare.com/mcp` |
| 15 | **GraphQL** | Analytics via GraphQL API | `https://graphql.mcp.cloudflare.com/mcp` |

---

## ⭐ Workers Bindings Server (الأهم لمشروعنا)

### URL
```
https://bindings.mcp.cloudflare.com/mcp
```

### الوظائف المتاحة (38 أداة)

#### 1. Account Management
```
✅ accounts_list            - List all accounts
✅ set_active_account       - Set active account for tool calls
```

#### 2. KV Namespaces (للـ Sessions في SymbolAI)
```
✅ kv_namespaces_list       - List all KV namespaces
✅ kv_namespace_create      - Create new KV namespace
✅ kv_namespace_delete      - Delete KV namespace
✅ kv_namespace_get         - Get KV namespace details
✅ kv_namespace_update      - Update KV namespace title
```

#### 3. Workers Management
```
✅ workers_list             - List all Workers
✅ workers_get_worker       - Get Worker details
✅ workers_get_worker_code  - Get Worker source code
```

#### 4. R2 Buckets (للـ Payroll PDFs في SymbolAI)
```
✅ r2_buckets_list          - List R2 buckets
✅ r2_bucket_create         - Create new R2 bucket
✅ r2_bucket_get            - Get bucket details
✅ r2_bucket_delete         - Delete R2 bucket
```

#### 5. D1 Databases (قاعدة بيانات SymbolAI) 🔥
```
✅ d1_databases_list        - List all D1 databases
✅ d1_database_create       - Create new D1 database
✅ d1_database_delete       - Delete D1 database
✅ d1_database_get          - Get database details
✅ d1_database_query        - Query D1 database (مهم جداً!)
```

#### 6. Hyperdrive
```
✅ hyperdrive_configs_list  - List Hyperdrive configs
✅ hyperdrive_config_create - Create Hyperdrive config
✅ hyperdrive_config_delete - Delete Hyperdrive config
✅ hyperdrive_config_get    - Get config details
✅ hyperdrive_config_edit   - Edit Hyperdrive config
```

### أمثلة على الاستخدام

#### إدارة D1 Database
```
"List my D1 databases"
"Create a D1 database named 'symbolai-financial-db'"
"Run the query 'SELECT * FROM users_new WHERE branch_id = \"branch_1010\"' on D1 database 'symbolai-financial-db'"
"Get details for D1 database 'symbolai-financial-db'"
```

#### إدارة KV Namespaces
```
"Show me my KV namespaces"
"Create a new KV namespace called 'symbolai-sessions'"
"Get the details for KV namespace 'SESSIONS'"
```

#### إدارة R2 Buckets
```
"List my R2 buckets"
"Create an R2 bucket named 'symbolai-payrolls'"
"Get details for the R2 bucket 'PAYROLL_PDFS'"
```

#### إدارة Workers
```
"List my Cloudflare Workers"
"Get the code for the 'symbolai-worker' worker"
"Show me the details of 'symbolai-worker'"
```

---

## ⭐ Workers Builds Server (مهم للـ CI/CD)

### URL
```
https://builds.mcp.cloudflare.com/mcp
```

### الوظائف المتاحة (4 أدوات)

```
✅ workers_builds_set_active_worker  - Set active Worker for calls
✅ workers_builds_list_builds        - List builds for a Worker
✅ workers_builds_get_build          - Get build details by UUID
✅ workers_builds_get_build_logs     - Get build logs by UUID
```

### أمثلة على الاستخدام

```
"Set symbolai-worker as the active worker"
"List the last 5 builds for my worker 'symbolai-worker'"
"What were the details for build 'xxxx-xxxx-xxxx-xxxx'?"
"Show me the logs for my latest build"
"Did the latest build for worker symbolai-worker succeed?"
```

---

## 🚀 كيفية الاستخدام مع SymbolAI Worker

### الطريقة 1: من Claude Desktop/Cursor (الموصى بها)

إذا كان MCP client يدعم remote MCP servers، أضف الخوادم في ملف الإعدادات:

**لـ Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**لـ Cursor**: `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "cloudflare-bindings": {
      "command": "npx",
      "args": ["mcp-remote", "https://bindings.mcp.cloudflare.com/mcp"]
    },
    "cloudflare-builds": {
      "command": "npx",
      "args": ["mcp-remote", "https://builds.mcp.cloudflare.com/mcp"]
    },
    "cloudflare-observability": {
      "command": "npx",
      "args": ["mcp-remote", "https://observability.mcp.cloudflare.com/mcp"]
    }
  }
}
```

### الطريقة 2: من Cloudflare AI Playground

افتح: https://playground.ai.cloudflare.com/

أدخل الـ URLs مباشرة:
- `https://bindings.mcp.cloudflare.com/mcp`
- `https://builds.mcp.cloudflare.com/mcp`

### الطريقة 3: من OpenAI Responses API

1. أنشئ API Token من Cloudflare Dashboard
2. أضف الصلاحيات المطلوبة:
   - Account Settings: Read
   - Workers Scripts: Read/Edit
   - D1: Read/Edit
   - KV Storage: Read/Edit
   - R2 Storage: Read/Edit

3. استخدم الـ Token مع OpenAI API

---

## 💡 حالات الاستخدام لمشروع SymbolAI

### 1. إدارة قاعدة البيانات
```bash
# Query users in branch 1010
"Query my D1 database: SELECT username, role_id FROM users_new WHERE branch_id = 'branch_1010'"

# Check total employees
"Query my D1 database: SELECT COUNT(*) as total, branch_id FROM employees GROUP BY branch_id"

# Get branches list
"Query my D1 database: SELECT id, name_ar, manager_name FROM branches"
```

### 2. إدارة Sessions (KV)
```bash
"List all keys in my symbolai-sessions KV namespace"
"Get the value for key 'session:xxxxx' from SESSIONS KV"
"Delete expired sessions older than 7 days"
```

### 3. مراقبة Builds
```bash
"Show me the last 10 builds for symbolai-worker"
"Did my latest deployment succeed?"
"Show me the build logs for the failed build"
"What was the error in build xxxx-xxxx?"
```

### 4. Debugging
```bash
"Show me the last 100 error logs for symbolai-worker"
"What's causing the 500 errors in the last hour?"
"Show me all failed authentication attempts"
```

### 5. إدارة Payroll PDFs (R2)
```bash
"List all files in my symbolai-payrolls R2 bucket"
"Get details for payroll_2024_10_laban.pdf"
"How much storage is my payrolls bucket using?"
```

---

## 📊 مقارنة الخوادم للاستخدام مع SymbolAI

| Server | الأهمية | الاستخدام | الأولوية |
|--------|---------|-----------|----------|
| **Workers Bindings** | 🔥 عالية جداً | إدارة D1, KV, R2, Workers | #1 |
| **Workers Builds** | 🔥 عالية | مراقبة Deployments, CI/CD | #2 |
| **Observability** | 🟡 متوسطة | Debugging, Logs, Analytics | #3 |
| **AI Gateway** | 🟡 متوسطة | مراقبة AI API calls | #4 |
| **Audit Logs** | 🟢 منخفضة | Security auditing | #5 |

---

## 🔐 المصادقة والأمان

### OAuth Flow

1. عند إضافة MCP server لأول مرة، سيفتح متصفح
2. سجل دخول إلى Cloudflare
3. اقبل الصلاحيات المطلوبة
4. سيتم حفظ الـ token تلقائياً

### الصلاحيات المطلوبة

#### لـ Workers Bindings Server:
```
✅ Account Settings: Read
✅ Workers Scripts: Read, Edit
✅ Workers KV Storage: Read, Edit
✅ Workers R2 Storage: Read, Edit
✅ D1: Read, Edit
✅ Hyperdrive: Read, Edit
```

#### لـ Workers Builds Server:
```
✅ Workers Scripts: Read
✅ Workers Builds: Read
```

---

## ⚙️ إعداد محلي للتطوير (اختياري)

إذا أردت تشغيل المستودع محلياً:

### 1. تثبيت Dependencies
```bash
cd /home/user/lkm/mcp-server-cloudflare
pnpm install
```

### 2. إعداد Environment Variables
```bash
# في apps/workers-bindings
cp .dev.vars.example .dev.vars

# أضف:
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

### 3. تشغيل Server محلياً
```bash
cd apps/workers-bindings
pnpm dev

# سيعمل على http://localhost:8787
```

### 4. اختبار MCP Server
```bash
# اختبار list tools
curl http://localhost:8787/mcp

# اختبار OAuth
curl http://localhost:8787/oauth/authorize
```

---

## 🧪 أمثلة تطبيقية لـ SymbolAI

### Scenario 1: تدقيق البيانات
```
Prompt to AI:
"استخدم Workers Bindings MCP:
1. اعرض جميع المستخدمين في فرع لبن
2. احسب إجمالي رواتب الموظفين لكل فرع
3. تحقق من وجود مستخدمين غير نشطين
4. اعرض آخر 5 audit logs"
```

### Scenario 2: مراقبة الأداء
```
Prompt to AI:
"استخدم Workers Builds MCP:
1. اعرض آخر 10 deployments
2. كم deployment فشل في آخر شهر؟
3. ما هو متوسط وقت البناء؟
4. اعرض logs لآخر deployment فاشل"
```

### Scenario 3: تحليل البيانات
```
Prompt to AI:
"استخدم Workers Bindings MCP:
1. Query D1: احسب إجمالي الإيرادات والمصروفات لكل فرع
2. Query D1: كم عدد الطلبات المعلقة؟
3. Query D1: من هم الموظفون الذين تنتهي هوياتهم خلال 30 يوم؟
4. أنشئ تقرير ملخص"
```

---

## 📝 Best Practices

### 1. استخدام Queries بحذر
```bash
❌ تجنب: "Query all data from users_new"
✅ استخدم: "Query users_new WHERE branch_id = 'branch_1010' LIMIT 10"
```

### 2. استخدام Caching
```bash
# بدلاً من query متكرر
"Cache the list of active branches in KV with TTL 1 hour"
```

### 3. Audit Logging
```bash
# سجل جميع التغييرات المهمة
"Log to audit_logs: user X queried sensitive data"
```

### 4. Error Handling
```bash
# تحقق من الأخطاء
"If query fails, show me the error logs from observability server"
```

---

## 🔧 Troubleshooting

### مشكلة: "Claude's response was interrupted"
**الحل**:
- كن محدداً في الـ queries
- قسّم الطلبات الكبيرة إلى طلبات صغيرة
- استخدم LIMIT في SQL queries

### مشكلة: "Authentication failed"
**الحل**:
- تأكد من صلاحيات API Token
- أعد تسجيل الدخول عبر OAuth
- تحقق من انتهاء صلاحية الـ Token

### مشكلة: "Rate limit exceeded"
**الحل**:
- قلل عدد الطلبات المتزامنة
- استخدم caching في KV
- انتظر قليلاً قبل إعادة المحاولة

---

## 📚 موارد إضافية

### Official Documentation
- MCP Protocol: https://modelcontextprotocol.io
- Cloudflare MCP: https://github.com/cloudflare/mcp-server-cloudflare
- Cloudflare Workers: https://developers.cloudflare.com/workers

### SymbolAI Project Files
- Main Worker: `/home/user/lkm/symbolai-worker`
- Database Schema: `symbolai-worker/migrations/`
- RBAC System: `RBAC_SYSTEM.md`
- Test Report: `COMPREHENSIVE_TEST_REPORT.md`

---

## 🎯 الخطوات التالية

### Phase 1: Setup ✅ (مكتمل)
- ✅ Clone repository
- ✅ Review documentation
- ✅ Understand available tools

### Phase 2: Integration (التالي)
- 🔄 Configure MCP servers in Claude Desktop/Cursor
- 🔄 Test authentication
- 🔄 Test basic queries

### Phase 3: Production Use
- 🔄 Use for database management
- 🔄 Use for deployment monitoring
- 🔄 Use for debugging and analytics

---

## 📊 ملخص سريع

```
╔════════════════════════════════════════════╗
║   CLOUDFLARE MCP SERVERS SUMMARY          ║
║   ════════════════════════════════════     ║
║   Repository: ✅ Cloned successfully      ║
║   Total Servers: 17                        ║
║   Priority Servers: 2 (Bindings, Builds)  ║
║   Status: Ready for integration            ║
║   ════════════════════════════════════     ║
║   Next: Configure in Claude Desktop        ║
╚════════════════════════════════════════════╝
```

---

**Created**: 2025-10-30
**Project**: SymbolAI Worker
**Status**: ✅ Documentation Complete
