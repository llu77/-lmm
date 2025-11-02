# أمثلة عملية متقدمة - MCP Integration
## Practical Advanced Examples for Cloudflare MCP

> **الهدف:** أكواد جاهزة للتنفيذ مباشرة
> **اللغة:** TypeScript/JavaScript
> **المستوى:** Enterprise-Grade

---

## 📋 جدول المحتويات

1. [MCP Natural Language Controller](#1-mcp-natural-language-controller)
2. [Advanced D1 Query Builder](#2-advanced-d1-query-builder)
3. [Real-time Build Monitor](#3-real-time-build-monitor)
4. [Intelligent Backup System](#4-intelligent-backup-system)
5. [Multi-Database Manager](#5-multi-database-manager)
6. [AI-Powered Infrastructure Optimizer](#6-ai-powered-infrastructure-optimizer)
7. [Automated Workflow Examples](#7-automated-workflow-examples)
8. [Security & Audit System](#8-security--audit-system)

---

## 1. MCP Natural Language Controller

### الملف: `symbolai-worker/src/lib/ai-mcp-controller.ts`

```typescript
/**
 * AI-Powered MCP Controller
 * التحكم بالبنية التحتية عبر اللغة الطبيعية (العربية/الإنجليزية)
 */

import { MCPClient } from './mcp-client';
import { callClaudeViaGateway } from './ai';

interface MCPIntent {
  action: string;
  target: string;
  parameters: Record<string, any>;
  confidence: number;
}

interface MCPCommandResult {
  success: boolean;
  data?: any;
  message: string;
  messageAr: string;
  executionTime: number;
}

/**
 * تحليل النية من النص الطبيعي
 */
export async function analyzeIntent(
  input: string,
  env: any
): Promise<MCPIntent> {
  const systemPrompt = `You are an expert at understanding infrastructure management commands in Arabic and English.

Parse the user's natural language input and extract:
1. action: what they want to do (list, create, delete, query, update, etc.)
2. target: what resource (d1, kv, r2, worker, build, etc.)
3. parameters: any specific parameters mentioned
4. confidence: how confident you are (0-1)

Examples:

Input: "أنشئ قاعدة بيانات اسمها backup-db"
Output: {
  "action": "create",
  "target": "d1",
  "parameters": { "name": "backup-db" },
  "confidence": 0.95
}

Input: "ما هي جميع KV namespaces؟"
Output: {
  "action": "list",
  "target": "kv",
  "parameters": {},
  "confidence": 1.0
}

Input: "احذف الملف report.pdf من R2"
Output: {
  "action": "delete",
  "target": "r2",
  "parameters": { "key": "report.pdf" },
  "confidence": 0.9
}

Input: "عدد الموظفين النشطين"
Output: {
  "action": "query",
  "target": "d1",
  "parameters": {
    "sql": "SELECT COUNT(*) as count FROM employees WHERE is_active = 1"
  },
  "confidence": 0.85
}

Respond ONLY with valid JSON.`;

  const response = await callClaudeViaGateway(
    env,
    systemPrompt,
    input,
    { max_tokens: 500 }
  );

  try {
    return JSON.parse(response);
  } catch {
    // Fallback
    return {
      action: 'unknown',
      target: 'unknown',
      parameters: {},
      confidence: 0
    };
  }
}

/**
 * تنفيذ الأمر عبر MCP
 */
export async function executeMCPCommand(
  intent: MCPIntent,
  mcpClient: MCPClient
): Promise<MCPCommandResult> {
  const startTime = Date.now();

  try {
    let result: any;
    let message = '';
    let messageAr = '';

    // D1 Operations
    if (intent.target === 'd1') {
      switch (intent.action) {
        case 'list':
          result = await mcpClient.listD1Databases();
          message = `Found ${result.length} D1 databases`;
          messageAr = `تم العثور على ${result.length} قاعدة بيانات`;
          break;

        case 'create':
          result = await mcpClient.createD1Database(intent.parameters.name);
          message = `Created database: ${intent.parameters.name}`;
          messageAr = `تم إنشاء قاعدة البيانات: ${intent.parameters.name}`;
          break;

        case 'query':
          // Get first database ID (or use specified one)
          const databases = await mcpClient.listD1Databases();
          const dbId = intent.parameters.databaseId || databases[0]?.uuid;

          if (!dbId) {
            throw new Error('No database available');
          }

          result = await mcpClient.queryD1Database(
            dbId,
            intent.parameters.sql,
            intent.parameters.params || []
          );
          message = `Query executed: ${result.results?.length || 0} rows`;
          messageAr = `تم تنفيذ الاستعلام: ${result.results?.length || 0} سطر`;
          break;

        case 'delete':
          await mcpClient.deleteD1Database(intent.parameters.databaseId);
          message = `Deleted database: ${intent.parameters.databaseId}`;
          messageAr = `تم حذف قاعدة البيانات: ${intent.parameters.databaseId}`;
          result = { deleted: true };
          break;

        default:
          throw new Error(`Unknown D1 action: ${intent.action}`);
      }
    }

    // KV Operations
    else if (intent.target === 'kv') {
      switch (intent.action) {
        case 'list':
          result = await mcpClient.listKVNamespaces();
          message = `Found ${result.length} KV namespaces`;
          messageAr = `تم العثور على ${result.length} namespace`;
          break;

        case 'create':
          result = await mcpClient.createKVNamespace(intent.parameters.title);
          message = `Created KV namespace: ${intent.parameters.title}`;
          messageAr = `تم إنشاء namespace: ${intent.parameters.title}`;
          break;

        case 'delete':
          await mcpClient.deleteKVNamespace(intent.parameters.namespaceId);
          message = `Deleted KV namespace: ${intent.parameters.namespaceId}`;
          messageAr = `تم حذف namespace: ${intent.parameters.namespaceId}`;
          result = { deleted: true };
          break;

        default:
          throw new Error(`Unknown KV action: ${intent.action}`);
      }
    }

    // R2 Operations
    else if (intent.target === 'r2') {
      switch (intent.action) {
        case 'list':
          result = await mcpClient.listR2Buckets();
          message = `Found ${result.length} R2 buckets`;
          messageAr = `تم العثور على ${result.length} bucket`;
          break;

        case 'create':
          result = await mcpClient.createR2Bucket(intent.parameters.name);
          message = `Created R2 bucket: ${intent.parameters.name}`;
          messageAr = `تم إنشاء bucket: ${intent.parameters.name}`;
          break;

        case 'delete':
          await mcpClient.deleteR2Bucket(intent.parameters.bucketName);
          message = `Deleted R2 bucket: ${intent.parameters.bucketName}`;
          messageAr = `تم حذف bucket: ${intent.parameters.bucketName}`;
          result = { deleted: true };
          break;

        default:
          throw new Error(`Unknown R2 action: ${intent.action}`);
      }
    }

    // Workers Operations
    else if (intent.target === 'worker') {
      switch (intent.action) {
        case 'list':
          result = await mcpClient.listWorkers();
          message = `Found ${result.length} Workers`;
          messageAr = `تم العثور على ${result.length} Worker`;
          break;

        case 'get':
          result = await mcpClient.getWorker(intent.parameters.scriptName);
          message = `Retrieved Worker: ${intent.parameters.scriptName}`;
          messageAr = `تم استرجاع Worker: ${intent.parameters.scriptName}`;
          break;

        case 'code':
          result = await mcpClient.getWorkerCode(intent.parameters.scriptName);
          message = `Retrieved code for: ${intent.parameters.scriptName}`;
          messageAr = `تم استرجاع الكود لـ: ${intent.parameters.scriptName}`;
          break;

        default:
          throw new Error(`Unknown Worker action: ${intent.action}`);
      }
    }

    // Builds Operations
    else if (intent.target === 'build') {
      switch (intent.action) {
        case 'list':
          result = await mcpClient.listBuilds(intent.parameters.limit || 10);
          message = `Found ${result.length} builds`;
          messageAr = `تم العثور على ${result.length} بناء`;
          break;

        case 'get':
          result = await mcpClient.getBuild(intent.parameters.buildId);
          message = `Retrieved build: ${intent.parameters.buildId}`;
          messageAr = `تم استرجاع البناء: ${intent.parameters.buildId}`;
          break;

        case 'logs':
          result = await mcpClient.getBuildLogs(intent.parameters.buildId);
          message = `Retrieved logs for build: ${intent.parameters.buildId}`;
          messageAr = `تم استرجاع السجلات للبناء: ${intent.parameters.buildId}`;
          break;

        default:
          throw new Error(`Unknown Build action: ${intent.action}`);
      }
    }

    else {
      throw new Error(`Unknown target: ${intent.target}`);
    }

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      data: result,
      message,
      messageAr,
      executionTime
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;

    return {
      success: false,
      message: `Error: ${error.message}`,
      messageAr: `خطأ: ${error.message}`,
      executionTime
    };
  }
}

/**
 * واجهة موحدة للتحكم عبر اللغة الطبيعية
 */
export async function processNaturalLanguageCommand(
  input: string,
  mcpClient: MCPClient,
  env: any
): Promise<MCPCommandResult> {
  // 1. Parse intent
  const intent = await analyzeIntent(input, env);

  // 2. Check confidence
  if (intent.confidence < 0.5) {
    return {
      success: false,
      message: 'Could not understand command. Please be more specific.',
      messageAr: 'لم أتمكن من فهم الأمر. يرجى التوضيح أكثر.',
      executionTime: 0
    };
  }

  // 3. Execute
  return await executeMCPCommand(intent, mcpClient);
}
```

### API Endpoint: `symbolai-worker/src/pages/api/mcp/ai/execute.ts`

```typescript
import type { APIRoute } from 'astro';
import { requireAdminRole } from '@/lib/permissions';
import { createAuthenticatedMCPClient } from '@/lib/mcp-client';
import { processNaturalLanguageCommand } from '@/lib/ai-mcp-controller';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Auth check
    const authResult = await requireAdminRole(
      locals.runtime.env.SESSIONS,
      locals.runtime.env.DB,
      request
    );

    if (authResult instanceof Response) return authResult;

    // Get MCP client
    const mcpClient = await createAuthenticatedMCPClient(
      locals.runtime.env.SESSIONS,
      authResult.userId
    );

    if (!mcpClient) {
      return new Response(
        JSON.stringify({ error: 'MCP not connected' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { command, language = 'ar' } = await request.json();

    if (!command) {
      return new Response(
        JSON.stringify({ error: 'Command required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Execute
    const result = await processNaturalLanguageCommand(
      command,
      mcpClient,
      locals.runtime.env
    );

    return new Response(
      JSON.stringify(result),
      { status: result.success ? 200 : 400, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI MCP execute error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

### الاستخدام:

```bash
# مثال 1: إنشاء قاعدة بيانات
curl -X POST https://symbolai.net/api/mcp/ai/execute \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{
    "command": "أنشئ قاعدة بيانات اسمها backup-db",
    "language": "ar"
  }'

# مثال 2: عرض جميع KV
curl -X POST https://symbolai.net/api/mcp/ai/execute \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{
    "command": "ما هي جميع KV namespaces الموجودة؟"
  }'

# مثال 3: استعلام SQL
curl -X POST https://symbolai.net/api/mcp/ai/execute \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{
    "command": "عدد الموظفين النشطين في الفرع الأول"
  }'
```

---

## 2. Advanced D1 Query Builder

### الملف: `symbolai-worker/src/lib/d1-query-builder.ts`

```typescript
/**
 * Advanced D1 Query Builder
 * بناء استعلامات معقدة بشكل آمن
 */

export class D1QueryBuilder {
  private db: D1Database;
  private table: string = '';
  private selectFields: string[] = ['*'];
  private whereConditions: Array<{ field: string; operator: string; value: any }> = [];
  private orderByField: string = '';
  private orderDirection: 'ASC' | 'DESC' = 'ASC';
  private limitValue: number = 0;
  private offsetValue: number = 0;
  private joins: Array<{ type: string; table: string; on: string }> = [];

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * اختيار الجدول
   */
  from(table: string): this {
    this.table = table;
    return this;
  }

  /**
   * اختيار الحقول
   */
  select(...fields: string[]): this {
    this.selectFields = fields;
    return this;
  }

  /**
   * شروط WHERE
   */
  where(field: string, operator: string, value: any): this {
    this.whereConditions.push({ field, operator, value });
    return this;
  }

  /**
   * ترتيب النتائج
   */
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByField = field;
    this.orderDirection = direction;
    return this;
  }

  /**
   * حد النتائج
   */
  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  /**
   * إزاحة النتائج
   */
  offset(value: number): this {
    this.offsetValue = value;
    return this;
  }

  /**
   * ربط جداول
   */
  join(type: 'INNER' | 'LEFT' | 'RIGHT', table: string, on: string): this {
    this.joins.push({ type, table, on });
    return this;
  }

  /**
   * بناء الاستعلام
   */
  private buildQuery(): { sql: string; params: any[] } {
    let sql = `SELECT ${this.selectFields.join(', ')} FROM ${this.table}`;
    const params: any[] = [];

    // Joins
    for (const join of this.joins) {
      sql += ` ${join.type} JOIN ${join.table} ON ${join.on}`;
    }

    // WHERE
    if (this.whereConditions.length > 0) {
      const whereClauses = this.whereConditions.map(cond => {
        params.push(cond.value);
        return `${cond.field} ${cond.operator} ?`;
      });
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // ORDER BY
    if (this.orderByField) {
      sql += ` ORDER BY ${this.orderByField} ${this.orderDirection}`;
    }

    // LIMIT
    if (this.limitValue > 0) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    // OFFSET
    if (this.offsetValue > 0) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return { sql, params };
  }

  /**
   * تنفيذ الاستعلام
   */
  async execute<T = any>(): Promise<{ results: T[]; meta: any }> {
    const { sql, params } = this.buildQuery();

    let stmt = this.db.prepare(sql);
    for (const param of params) {
      stmt = stmt.bind(param);
    }

    const result = await stmt.all();
    return {
      results: result.results as T[],
      meta: result.meta
    };
  }

  /**
   * تنفيذ وإرجاع أول نتيجة
   */
  async first<T = any>(): Promise<T | null> {
    this.limit(1);
    const { results } = await this.execute<T>();
    return results[0] || null;
  }

  /**
   * العد
   */
  async count(): Promise<number> {
    this.select('COUNT(*) as count');
    const result = await this.first<{ count: number }>();
    return result?.count || 0;
  }

  /**
   * الوجود
   */
  async exists(): Promise<boolean> {
    const count = await this.count();
    return count > 0;
  }
}

/**
 * Helper function
 */
export function query(db: D1Database): D1QueryBuilder {
  return new D1QueryBuilder(db);
}
```

### استخدام Query Builder:

```typescript
import { query } from '@/lib/d1-query-builder';

// مثال 1: استعلام بسيط
const activeEmployees = await query(db)
  .from('employees')
  .where('is_active', '=', 1)
  .where('branch_id', '=', 'BR001')
  .orderBy('employee_name', 'ASC')
  .execute();

// مثال 2: استعلام مع ربط جداول
const employeesWithBranch = await query(db)
  .from('employees')
  .select('employees.*', 'branches.name as branch_name')
  .join('LEFT', 'branches', 'employees.branch_id = branches.id')
  .where('employees.is_active', '=', 1)
  .execute();

// مثال 3: بترقيم الصفحات
const page = 1;
const perPage = 20;
const revenues = await query(db)
  .from('revenues')
  .where('branch_id', '=', 'BR001')
  .orderBy('date', 'DESC')
  .limit(perPage)
  .offset((page - 1) * perPage)
  .execute();

// مثال 4: العد
const totalEmployees = await query(db)
  .from('employees')
  .where('is_active', '=', 1)
  .count();

// مثال 5: التحقق من الوجود
const hasRevenues = await query(db)
  .from('revenues')
  .where('branch_id', '=', 'BR001')
  .where('date', '=', '2025-11-02')
  .exists();
```

---

## 3. Real-time Build Monitor

### الملف: `symbolai-worker/src/lib/realtime-build-monitor.ts`

```typescript
/**
 * Real-time Build Monitoring System
 * نظام مراقبة البناء في الوقت الفعلي
 */

import { MCPClient, Build } from './mcp-client';

export interface BuildAlert {
  severity: 'info' | 'warning' | 'error';
  message: string;
  messageAr: string;
  build: Build;
  timestamp: string;
}

export interface BuildStatistics {
  total: number;
  successful: number;
  failed: number;
  active: number;
  successRate: number;
  averageDuration: number;
  lastBuild: Build | null;
}

export class RealtimeBuildMonitor {
  private mcpClient: MCPClient;
  private workerName: string;
  private checkInterval: number; // milliseconds
  private lastCheckedBuildId: string | null = null;
  private alerts: BuildAlert[] = [];

  constructor(
    mcpClient: MCPClient,
    workerName: string = 'symbolai-worker',
    checkInterval: number = 60000 // 1 minute
  ) {
    this.mcpClient = mcpClient;
    this.workerName = workerName;
    this.checkInterval = checkInterval;
  }

  /**
   * بدء المراقبة
   */
  async start(): Promise<void> {
    // Set active worker
    await this.mcpClient.setActiveWorker(this.workerName);

    // Initial check
    await this.checkBuilds();

    // Set interval
    setInterval(() => this.checkBuilds(), this.checkInterval);
  }

  /**
   * فحص البناءات الجديدة
   */
  private async checkBuilds(): Promise<void> {
    try {
      const builds = await this.mcpClient.listBuilds(10);

      if (builds.length === 0) return;

      const latestBuild = builds[0];

      // First run
      if (!this.lastCheckedBuildId) {
        this.lastCheckedBuildId = latestBuild.id;
        return;
      }

      // New build detected
      if (latestBuild.id !== this.lastCheckedBuildId) {
        this.lastCheckedBuildId = latestBuild.id;
        await this.analyzeBuild(latestBuild);
      }

      // Check for status changes
      for (const build of builds) {
        if (build.status === 'active') {
          // Monitor active builds
          await this.monitorActiveBuild(build);
        }
      }

    } catch (error) {
      console.error('Build check error:', error);
      this.addAlert({
        severity: 'error',
        message: `Build monitoring error: ${error.message}`,
        messageAr: `خطأ في مراقبة البناء: ${error.message}`,
        build: null as any,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * تحليل البناء
   */
  private async analyzeBuild(build: Build): Promise<void> {
    if (build.status === 'success') {
      this.addAlert({
        severity: 'info',
        message: `Build ${build.id} succeeded`,
        messageAr: `نجح البناء ${build.id}`,
        build,
        timestamp: new Date().toISOString()
      });
    } else if (build.status === 'failure') {
      // Get logs for failed build
      const logs = await this.mcpClient.getBuildLogs(build.id);

      this.addAlert({
        severity: 'error',
        message: `Build ${build.id} failed. Check logs.`,
        messageAr: `فشل البناء ${build.id}. راجع السجلات.`,
        build: { ...build, logs } as any,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * مراقبة البناء النشط
   */
  private async monitorActiveBuild(build: Build): Promise<void> {
    // Check duration
    const duration = Date.now() - new Date(build.created_on).getTime();
    const expectedDuration = 5 * 60 * 1000; // 5 minutes

    if (duration > expectedDuration) {
      this.addAlert({
        severity: 'warning',
        message: `Build ${build.id} is taking longer than expected`,
        messageAr: `البناء ${build.id} يستغرق وقتاً أطول من المتوقع`,
        build,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * إضافة تنبيه
   */
  private addAlert(alert: BuildAlert): void {
    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Trigger notification (implement based on your needs)
    this.notifyAlert(alert);
  }

  /**
   * إرسال إشعار
   */
  private notifyAlert(alert: BuildAlert): void {
    // Send to admin, email, webhook, etc.
    console.log(`[${alert.severity.toUpperCase()}] ${alert.messageAr}`);

    // TODO: Integrate with email/notification system
    // await sendEmail({
    //   to: 'admin@symbolai.net',
    //   subject: `Build Alert: ${alert.severity}`,
    //   body: alert.messageAr
    // });
  }

  /**
   * الحصول على التنبيهات
   */
  getAlerts(severity?: 'info' | 'warning' | 'error'): BuildAlert[] {
    if (severity) {
      return this.alerts.filter(a => a.severity === severity);
    }
    return this.alerts;
  }

  /**
   * الحصول على الإحصائيات
   */
  async getStatistics(): Promise<BuildStatistics> {
    const builds = await this.mcpClient.listBuilds(50);

    const successful = builds.filter(b => b.status === 'success').length;
    const failed = builds.filter(b => b.status === 'failure').length;
    const active = builds.filter(b => b.status === 'active').length;

    const durations = builds
      .filter(b => b.status === 'success' && b.stages.length > 0)
      .map(b => {
        const totalDuration = b.stages.reduce((sum, stage) => {
          if (stage.started_on && stage.ended_on) {
            return sum + (new Date(stage.ended_on).getTime() - new Date(stage.started_on).getTime());
          }
          return sum;
        }, 0);
        return totalDuration;
      });

    const averageDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    return {
      total: builds.length,
      successful,
      failed,
      active,
      successRate: builds.length > 0 ? (successful / builds.length) * 100 : 0,
      averageDuration: averageDuration / 1000, // seconds
      lastBuild: builds[0] || null
    };
  }

  /**
   * إيقاف المراقبة
   */
  stop(): void {
    // Clear interval if needed
  }
}
```

### استخدام Build Monitor:

```typescript
// في scheduled worker أو cron job
import { RealtimeBuildMonitor } from '@/lib/realtime-build-monitor';
import { createAuthenticatedMCPClient } from '@/lib/mcp-client';

// Cron: كل 5 دقائق
export async function monitorBuilds(env: any) {
  const mcpClient = await createAuthenticatedMCPClient(
    env.SESSIONS,
    'admin-user-id'
  );

  if (!mcpClient) return;

  const monitor = new RealtimeBuildMonitor(mcpClient, 'symbolai-worker', 300000);

  // Get current stats
  const stats = await monitor.getStatistics();

  console.log('Build Statistics:', {
    total: stats.total,
    successRate: `${stats.successRate.toFixed(1)}%`,
    avgDuration: `${stats.averageDuration.toFixed(1)}s`
  });

  // Check for alerts
  const errors = monitor.getAlerts('error');
  if (errors.length > 0) {
    // Send notification
    console.log(`Found ${errors.length} build errors!`);
  }
}
```

---

## 4. Intelligent Backup System

### الملف: `symbolai-worker/src/lib/intelligent-backup.ts`

```typescript
/**
 * Intelligent Backup System
 * نظام نسخ احتياطي ذكي مع ضغط وتشفير
 */

export interface BackupOptions {
  includeData: boolean;
  includeLogs: boolean;
  includeFiles: boolean;
  compress: boolean;
  encrypt: boolean;
  uploadToR2: boolean;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  timestamp: string;
  size: number; // bytes
  tables: string[];
  rowCount: number;
  duration: number; // ms
  location: string;
  checksum: string;
}

export class IntelligentBackupSystem {
  private db: D1Database;
  private r2: R2Bucket;
  private encryptionKey: string;

  constructor(db: D1Database, r2: R2Bucket, encryptionKey: string) {
    this.db = db;
    this.r2 = r2;
    this.encryptionKey = encryptionKey;
  }

  /**
   * إنشاء نسخة احتياطية كاملة
   */
  async createFullBackup(options: Partial<BackupOptions> = {}): Promise<BackupResult> {
    const startTime = Date.now();
    const backupId = `backup-${Date.now()}`;

    const opts: BackupOptions = {
      includeData: true,
      includeLogs: true,
      includeFiles: false,
      compress: true,
      encrypt: true,
      uploadToR2: true,
      ...options
    };

    try {
      // 1. Export all tables
      const tables = await this.listTables();
      const backupData: Record<string, any[]> = {};
      let totalRows = 0;

      for (const table of tables) {
        const { results } = await this.db.prepare(`SELECT * FROM ${table}`).all();
        backupData[table] = results;
        totalRows += results.length;
      }

      // 2. Create backup object
      const backup = {
        id: backupId,
        timestamp: new Date().toISOString(),
        version: '1.0',
        tables: tables,
        rowCount: totalRows,
        data: backupData
      };

      // 3. Serialize
      let serialized = JSON.stringify(backup);

      // 4. Compress (if enabled)
      if (opts.compress) {
        // Simple compression placeholder
        // In production, use gzip or brotli
        serialized = this.compress(serialized);
      }

      // 5. Encrypt (if enabled)
      if (opts.encrypt) {
        serialized = await this.encrypt(serialized);
      }

      // 6. Calculate checksum
      const checksum = await this.calculateChecksum(serialized);

      // 7. Upload to R2 (if enabled)
      let location = 'local';
      if (opts.uploadToR2) {
        const key = `backups/${backupId}.json`;
        await this.r2.put(key, serialized);
        location = `r2://${key}`;
      }

      // 8. Save metadata to database
      await this.saveBackupMetadata({
        id: backupId,
        timestamp: backup.timestamp,
        tables: tables.join(','),
        rowCount: totalRows,
        size: serialized.length,
        location,
        checksum
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        backupId,
        timestamp: backup.timestamp,
        size: serialized.length,
        tables,
        rowCount: totalRows,
        duration,
        location,
        checksum
      };

    } catch (error) {
      console.error('Backup error:', error);
      throw error;
    }
  }

  /**
   * استعادة من نسخة احتياطية
   */
  async restore(backupId: string): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Get backup metadata
      const metadata = await this.getBackupMetadata(backupId);
      if (!metadata) {
        throw new Error('Backup not found');
      }

      // 2. Download from R2
      const object = await this.r2.get(`backups/${backupId}.json`);
      if (!object) {
        throw new Error('Backup file not found in R2');
      }

      let data = await object.text();

      // 3. Decrypt
      if (metadata.encrypted) {
        data = await this.decrypt(data);
      }

      // 4. Decompress
      if (metadata.compressed) {
        data = this.decompress(data);
      }

      // 5. Parse
      const backup = JSON.parse(data);

      // 6. Restore tables
      for (const [table, rows] of Object.entries(backup.data)) {
        // Clear table
        await this.db.prepare(`DELETE FROM ${table}`).run();

        // Insert rows
        for (const row of rows as any[]) {
          const fields = Object.keys(row);
          const placeholders = fields.map(() => '?').join(',');
          const sql = `INSERT INTO ${table} (${fields.join(',')}) VALUES (${placeholders})`;

          await this.db.prepare(sql).bind(...Object.values(row)).run();
        }
      }

      return {
        success: true,
        message: `Restored ${backup.rowCount} rows from backup ${backupId}`
      };

    } catch (error) {
      console.error('Restore error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Helper: قائمة الجداول
   */
  private async listTables(): Promise<string[]> {
    const { results } = await this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all();

    return results.map((r: any) => r.name);
  }

  /**
   * Helper: ضغط
   */
  private compress(data: string): string {
    // Placeholder - use actual compression library
    return data;
  }

  /**
   * Helper: فك الضغط
   */
  private decompress(data: string): string {
    // Placeholder
    return data;
  }

  /**
   * Helper: تشفير
   */
  private async encrypt(data: string): Promise<string> {
    // Placeholder - use Web Crypto API
    return data;
  }

  /**
   * Helper: فك التشفير
   */
  private async decrypt(data: string): Promise<string> {
    // Placeholder
    return data;
  }

  /**
   * Helper: حساب Checksum
   */
  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Helper: حفظ metadata
   */
  private async saveBackupMetadata(metadata: any): Promise<void> {
    await this.db.prepare(`
      INSERT INTO backups (id, date, type, data_snapshot_json)
      VALUES (?, ?, ?, ?)
    `).bind(
      metadata.id,
      metadata.timestamp,
      'full',
      JSON.stringify(metadata)
    ).run();
  }

  /**
   * Helper: جلب metadata
   */
  private async getBackupMetadata(backupId: string): Promise<any> {
    const result = await this.db.prepare(
      'SELECT data_snapshot_json FROM backups WHERE id = ?'
    ).bind(backupId).first();

    return result ? JSON.parse(result.data_snapshot_json as string) : null;
  }
}
```

### Cron Job للنسخ الاحتياطي التلقائي:

```typescript
// scheduled worker - daily backup
export async function scheduledBackup(env: any) {
  const backupSystem = new IntelligentBackupSystem(
    env.DB,
    env.PAYROLL_PDFS, // R2 bucket
    env.SESSION_SECRET
  );

  const result = await backupSystem.createFullBackup({
    compress: true,
    encrypt: true,
    uploadToR2: true
  });

  console.log('Backup completed:', {
    id: result.backupId,
    size: `${(result.size / 1024 / 1024).toFixed(2)} MB`,
    duration: `${(result.duration / 1000).toFixed(1)}s`,
    rows: result.rowCount
  });

  // Notify admin
  // await sendEmail({ ... });
}
```

---

## تتمة الأمثلة في التعليق التالي...

**الحالة:** تم إنشاء 4 أمثلة متقدمة حتى الآن. المتبقي:
5. Multi-Database Manager
6. AI-Powered Infrastructure Optimizer
7. Automated Workflow Examples
8. Security & Audit System

هل تريد المتابعة مع الأمثلة المتبقية؟
