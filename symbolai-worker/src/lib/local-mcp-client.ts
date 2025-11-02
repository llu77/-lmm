/**
 * Local MCP Client
 * عميل للتواصل مع MCP Server المحلي
 */

export interface LocalMCPClientConfig {
  endpoint: string;
  sessionToken?: string;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export class LocalMCPClient {
  private endpoint: string;
  private sessionToken?: string;
  private requestId: number = 0;

  constructor(config: LocalMCPClientConfig) {
    this.endpoint = config.endpoint;
    this.sessionToken = config.sessionToken;
  }

  /**
   * إرسال طلب JSON-RPC
   */
  private async sendRequest(method: string, params?: Record<string, any>): Promise<any> {
    this.requestId++;

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (this.sessionToken) {
      headers['Cookie'] = `session=${this.sessionToken}`;
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params: params || {},
        id: this.requestId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`MCP Error: ${data.error.message} (code: ${data.error.code})`);
    }

    return data.result;
  }

  /**
   * تهيئة الاتصال
   */
  async initialize(): Promise<any> {
    return await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      }
    });
  }

  /**
   * قائمة الأدوات المتاحة
   */
  async listTools(): Promise<any[]> {
    const result = await this.sendRequest('tools/list');
    return result.tools || [];
  }

  /**
   * استدعاء أداة
   */
  async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
    return await this.sendRequest('tools/call', {
      name,
      arguments: args
    });
  }

  /**
   * ping
   */
  async ping(): Promise<any> {
    return await this.sendRequest('ping');
  }

  // =============== D1 Operations ===============

  /**
   * قائمة قواعد البيانات
   */
  async listD1Databases(): Promise<any[]> {
    return await this.callTool('d1_list_databases');
  }

  /**
   * تنفيذ استعلام SQL
   */
  async queryD1(sql: string, params: any[] = []): Promise<any> {
    return await this.callTool('d1_query', { sql, params });
  }

  /**
   * قائمة الجداول
   */
  async listD1Tables(): Promise<any[]> {
    return await this.callTool('d1_list_tables');
  }

  // =============== KV Operations ===============

  /**
   * قائمة المفاتيح
   */
  async listKVKeys(prefix: string = '', limit: number = 100): Promise<any> {
    return await this.callTool('kv_list_keys', { prefix, limit });
  }

  /**
   * جلب قيمة
   */
  async getKV(key: string): Promise<any> {
    return await this.callTool('kv_get', { key });
  }

  /**
   * تخزين قيمة
   */
  async putKV(key: string, value: string, expirationTtl?: number): Promise<any> {
    return await this.callTool('kv_put', { key, value, expirationTtl });
  }

  /**
   * حذف مفتاح
   */
  async deleteKV(key: string): Promise<any> {
    return await this.callTool('kv_delete', { key });
  }

  // =============== R2 Operations ===============

  /**
   * قائمة الملفات
   */
  async listR2Objects(prefix: string = '', limit: number = 100): Promise<any> {
    return await this.callTool('r2_list_objects', { prefix, limit });
  }

  /**
   * معلومات ملف
   */
  async getR2Object(key: string): Promise<any> {
    return await this.callTool('r2_get_object', { key });
  }

  /**
   * حذف ملف
   */
  async deleteR2Object(key: string): Promise<any> {
    return await this.callTool('r2_delete_object', { key });
  }

  // =============== Helper Methods ===============

  /**
   * عرض معلومات جميع الموارد
   */
  async getResourcesSummary(): Promise<any> {
    const [databases, kvKeys, r2Objects, tables] = await Promise.all([
      this.listD1Databases().catch(() => []),
      this.listKVKeys('', 10).catch(() => ({ keys: [] })),
      this.listR2Objects('', 10).catch(() => ({ objects: [] })),
      this.listD1Tables().catch(() => [])
    ]);

    return {
      d1: {
        databases: databases.length,
        tables: tables.length,
        tableNames: tables.map((t: any) => t.name)
      },
      kv: {
        totalKeys: kvKeys.keys?.length || 0,
        sampleKeys: kvKeys.keys?.slice(0, 5).map((k: any) => k.name) || []
      },
      r2: {
        totalObjects: r2Objects.objects?.length || 0,
        sampleObjects: r2Objects.objects?.slice(0, 5).map((o: any) => o.key) || []
      }
    };
  }

  /**
   * تنفيذ استعلامات متعددة
   */
  async executeBatch(queries: Array<{ sql: string; params?: any[] }>): Promise<any[]> {
    const results = [];

    for (const query of queries) {
      const result = await this.queryD1(query.sql, query.params || []);
      results.push(result);
    }

    return results;
  }
}

/**
 * إنشاء client محلي
 */
export function createLocalMCPClient(sessionToken?: string): LocalMCPClient {
  return new LocalMCPClient({
    endpoint: '/api/mcp-server',
    sessionToken
  });
}
