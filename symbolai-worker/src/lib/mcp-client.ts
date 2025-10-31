/**
 * Cloudflare MCP (Model Context Protocol) Client
 *
 * This module provides a client for interacting with Cloudflare's MCP servers:
 * - Workers Bindings (D1, KV, R2, Workers management)
 * - Workers Builds (Deployment monitoring)
 * - Observability (Logs, analytics, debugging)
 *
 * @see https://github.com/cloudflare/mcp-server-cloudflare
 */

// ==================== Type Definitions ====================

export interface MCPConfig {
  accountId?: string;
  apiToken?: string;
}

export interface MCPServerEndpoints {
  bindings: string;
  builds: string;
  observability: string;
  radar: string;
  browser: string;
  aiGateway: string;
  auditLogs: string;
}

export const MCP_ENDPOINTS: MCPServerEndpoints = {
  bindings: 'https://bindings.mcp.cloudflare.com/mcp',
  builds: 'https://builds.mcp.cloudflare.com/mcp',
  observability: 'https://observability.mcp.cloudflare.com/mcp',
  radar: 'https://radar.mcp.cloudflare.com/mcp',
  browser: 'https://browser.mcp.cloudflare.com/mcp',
  aiGateway: 'https://ai-gateway.mcp.cloudflare.com/mcp',
  auditLogs: 'https://auditlogs.mcp.cloudflare.com/mcp',
};

// MCP Request/Response Types
export interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, any>;
  id: string | number;
}

export interface MCPResponse<T = any> {
  jsonrpc: '2.0';
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// D1 Database Types
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

// KV Namespace Types
export interface KVNamespace {
  id: string;
  title: string;
  supports_url_encoding: boolean;
}

// R2 Bucket Types
export interface R2Bucket {
  name: string;
  creation_date: string;
  location?: string;
}

// Worker Types
export interface Worker {
  id: string;
  created_on: string;
  modified_on: string;
  etag: string;
}

// Build Types
export interface Build {
  id: string;
  created_on: string;
  source: {
    type: string;
  };
  deployment_trigger: {
    metadata: {
      branch: string;
      commit_hash: string;
      commit_message: string;
    };
  };
  stages: Array<{
    name: string;
    status: 'success' | 'failure' | 'skipped' | 'active';
    started_on: string;
    ended_on: string;
  }>;
  status: 'success' | 'failure' | 'active';
}

// ==================== MCP Client Class ====================

export class MCPClient {
  private config: MCPConfig;

  constructor(config: MCPConfig = {}) {
    this.config = config;
  }

  /**
   * Make a request to an MCP server endpoint
   */
  private async makeRequest<T = any>(
    endpoint: string,
    method: string,
    params?: Record<string, any>
  ): Promise<T> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      method,
      params: params || {},
      id: Date.now(),
    };

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add authentication if available
    if (this.config.apiToken) {
      headers['Authorization'] = `Bearer ${this.config.apiToken}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.status} ${response.statusText}`);
    }

    const data: MCPResponse<T> = await response.json();

    if (data.error) {
      throw new Error(`MCP error: ${data.error.message} (code: ${data.error.code})`);
    }

    return data.result as T;
  }

  // ==================== Workers Bindings Server ====================

  /**
   * List all available MCP tools for an endpoint
   */
  async listTools(serverType: keyof MCPServerEndpoints = 'bindings'): Promise<MCPTool[]> {
    return this.makeRequest<MCPTool[]>(
      MCP_ENDPOINTS[serverType],
      'tools/list'
    );
  }

  /**
   * List all Cloudflare accounts
   */
  async listAccounts(): Promise<any[]> {
    return this.makeRequest(
      MCP_ENDPOINTS.bindings,
      'accounts_list'
    );
  }

  /**
   * Set active account for tool calls
   */
  async setActiveAccount(accountId: string): Promise<void> {
    return this.makeRequest(
      MCP_ENDPOINTS.bindings,
      'set_active_account',
      { account_id: accountId }
    );
  }

  // ==================== D1 Database Operations ====================

  /**
   * List all D1 databases
   */
  async listD1Databases(): Promise<D1Database[]> {
    return this.makeRequest<D1Database[]>(
      MCP_ENDPOINTS.bindings,
      'd1_databases_list'
    );
  }

  /**
   * Get D1 database details
   */
  async getD1Database(databaseId: string): Promise<D1Database> {
    return this.makeRequest<D1Database>(
      MCP_ENDPOINTS.bindings,
      'd1_database_get',
      { database_id: databaseId }
    );
  }

  /**
   * Execute a query on a D1 database
   */
  async queryD1Database(
    databaseId: string,
    sql: string,
    params?: any[]
  ): Promise<D1QueryResult> {
    return this.makeRequest<D1QueryResult>(
      MCP_ENDPOINTS.bindings,
      'd1_database_query',
      {
        database_id: databaseId,
        sql,
        params: params || [],
      }
    );
  }

  /**
   * Create a new D1 database
   */
  async createD1Database(name: string): Promise<D1Database> {
    return this.makeRequest<D1Database>(
      MCP_ENDPOINTS.bindings,
      'd1_database_create',
      { name }
    );
  }

  /**
   * Delete a D1 database
   */
  async deleteD1Database(databaseId: string): Promise<void> {
    return this.makeRequest(
      MCP_ENDPOINTS.bindings,
      'd1_database_delete',
      { database_id: databaseId }
    );
  }

  // ==================== KV Namespace Operations ====================

  /**
   * List all KV namespaces
   */
  async listKVNamespaces(): Promise<KVNamespace[]> {
    return this.makeRequest<KVNamespace[]>(
      MCP_ENDPOINTS.bindings,
      'kv_namespaces_list'
    );
  }

  /**
   * Get KV namespace details
   */
  async getKVNamespace(namespaceId: string): Promise<KVNamespace> {
    return this.makeRequest<KVNamespace>(
      MCP_ENDPOINTS.bindings,
      'kv_namespace_get',
      { namespace_id: namespaceId }
    );
  }

  /**
   * Create a new KV namespace
   */
  async createKVNamespace(title: string): Promise<KVNamespace> {
    return this.makeRequest<KVNamespace>(
      MCP_ENDPOINTS.bindings,
      'kv_namespace_create',
      { title }
    );
  }

  /**
   * Delete a KV namespace
   */
  async deleteKVNamespace(namespaceId: string): Promise<void> {
    return this.makeRequest(
      MCP_ENDPOINTS.bindings,
      'kv_namespace_delete',
      { namespace_id: namespaceId }
    );
  }

  // ==================== R2 Bucket Operations ====================

  /**
   * List all R2 buckets
   */
  async listR2Buckets(): Promise<R2Bucket[]> {
    return this.makeRequest<R2Bucket[]>(
      MCP_ENDPOINTS.bindings,
      'r2_buckets_list'
    );
  }

  /**
   * Get R2 bucket details
   */
  async getR2Bucket(bucketName: string): Promise<R2Bucket> {
    return this.makeRequest<R2Bucket>(
      MCP_ENDPOINTS.bindings,
      'r2_bucket_get',
      { bucket_name: bucketName }
    );
  }

  /**
   * Create a new R2 bucket
   */
  async createR2Bucket(name: string): Promise<R2Bucket> {
    return this.makeRequest<R2Bucket>(
      MCP_ENDPOINTS.bindings,
      'r2_bucket_create',
      { name }
    );
  }

  /**
   * Delete an R2 bucket
   */
  async deleteR2Bucket(bucketName: string): Promise<void> {
    return this.makeRequest(
      MCP_ENDPOINTS.bindings,
      'r2_bucket_delete',
      { bucket_name: bucketName }
    );
  }

  // ==================== Workers Operations ====================

  /**
   * List all Workers
   */
  async listWorkers(): Promise<Worker[]> {
    return this.makeRequest<Worker[]>(
      MCP_ENDPOINTS.bindings,
      'workers_list'
    );
  }

  /**
   * Get Worker details
   */
  async getWorker(scriptName: string): Promise<Worker> {
    return this.makeRequest<Worker>(
      MCP_ENDPOINTS.bindings,
      'workers_get_worker',
      { script_name: scriptName }
    );
  }

  /**
   * Get Worker source code
   */
  async getWorkerCode(scriptName: string): Promise<string> {
    return this.makeRequest<string>(
      MCP_ENDPOINTS.bindings,
      'workers_get_worker_code',
      { script_name: scriptName }
    );
  }

  // ==================== Workers Builds Server ====================

  /**
   * Set active worker for build operations
   */
  async setActiveWorker(workerName: string): Promise<void> {
    return this.makeRequest(
      MCP_ENDPOINTS.builds,
      'workers_builds_set_active_worker',
      { worker_name: workerName }
    );
  }

  /**
   * List builds for a worker
   */
  async listBuilds(limit: number = 10): Promise<Build[]> {
    return this.makeRequest<Build[]>(
      MCP_ENDPOINTS.builds,
      'workers_builds_list_builds',
      { limit }
    );
  }

  /**
   * Get build details by UUID
   */
  async getBuild(buildId: string): Promise<Build> {
    return this.makeRequest<Build>(
      MCP_ENDPOINTS.builds,
      'workers_builds_get_build',
      { build_id: buildId }
    );
  }

  /**
   * Get build logs by UUID
   */
  async getBuildLogs(buildId: string): Promise<string> {
    return this.makeRequest<string>(
      MCP_ENDPOINTS.builds,
      'workers_builds_get_build_logs',
      { build_id: buildId }
    );
  }

  // ==================== Observability Server ====================

  /**
   * Get worker logs
   */
  async getWorkerLogs(
    scriptName: string,
    options?: {
      limit?: number;
      startTime?: string;
      endTime?: string;
      status?: string;
    }
  ): Promise<any[]> {
    return this.makeRequest(
      MCP_ENDPOINTS.observability,
      'workers_get_logs',
      {
        script_name: scriptName,
        ...options,
      }
    );
  }

  /**
   * Get analytics data
   */
  async getAnalytics(
    scriptName: string,
    options?: {
      since?: string;
      until?: string;
      metrics?: string[];
    }
  ): Promise<any> {
    return this.makeRequest(
      MCP_ENDPOINTS.observability,
      'workers_get_analytics',
      {
        script_name: scriptName,
        ...options,
      }
    );
  }
}

// ==================== Token Management ====================

interface MCPTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  accountId: string;
}

/**
 * Store MCP token in KV
 */
export async function storeMCPToken(
  kv: KVNamespace,
  userId: string,
  tokenData: MCPTokenData
): Promise<void> {
  const key = `mcp_token:${userId}`;
  await kv.put(key, JSON.stringify(tokenData), {
    expirationTtl: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Get MCP token from KV
 */
export async function getMCPToken(
  kv: KVNamespace,
  userId: string
): Promise<MCPTokenData | null> {
  const key = `mcp_token:${userId}`;
  const data = await kv.get(key);

  if (!data) {
    return null;
  }

  const tokenData: MCPTokenData = JSON.parse(data);

  // Check if token is expired
  if (tokenData.expiresAt < Date.now()) {
    await kv.delete(key);
    return null;
  }

  return tokenData;
}

/**
 * Delete MCP token from KV
 */
export async function deleteMCPToken(
  kv: KVNamespace,
  userId: string
): Promise<void> {
  const key = `mcp_token:${userId}`;
  await kv.delete(key);
}

/**
 * Create an authenticated MCP client for a user
 */
export async function createAuthenticatedMCPClient(
  kv: KVNamespace,
  userId: string
): Promise<MCPClient | null> {
  const tokenData = await getMCPToken(kv, userId);

  if (!tokenData) {
    return null;
  }

  return new MCPClient({
    accountId: tokenData.accountId,
    apiToken: tokenData.accessToken,
  });
}

// ==================== Helper Functions ====================

/**
 * Format D1 query results as a table
 */
export function formatD1Results(results: D1QueryResult): string {
  if (!results.success || !results.results.length) {
    return 'No results';
  }

  const headers = Object.keys(results.results[0]);
  const rows = results.results.map(row =>
    headers.map(h => String(row[h] ?? ''))
  );

  // Simple table formatting
  const columnWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => r[i].length))
  );

  const headerRow = headers.map((h, i) => h.padEnd(columnWidths[i])).join(' | ');
  const separator = columnWidths.map(w => '-'.repeat(w)).join('-+-');
  const dataRows = rows.map(row =>
    row.map((cell, i) => cell.padEnd(columnWidths[i])).join(' | ')
  ).join('\n');

  return `${headerRow}\n${separator}\n${dataRows}`;
}

/**
 * Sanitize SQL query (basic validation)
 */
export function validateSQL(sql: string): { valid: boolean; error?: string } {
  // Convert to lowercase for checking
  const lowerSQL = sql.trim().toLowerCase();

  // Block dangerous operations
  const dangerousPatterns = [
    /drop\s+table/i,
    /drop\s+database/i,
    /truncate/i,
    /alter\s+table.*drop/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(lowerSQL)) {
      return {
        valid: false,
        error: 'Dangerous SQL operation detected. DROP, TRUNCATE are not allowed.',
      };
    }
  }

  // Must start with SELECT, INSERT, UPDATE, or DELETE
  if (!/^(select|insert|update|delete|pragma)/i.test(lowerSQL)) {
    return {
      valid: false,
      error: 'Query must start with SELECT, INSERT, UPDATE, or DELETE',
    };
  }

  return { valid: true };
}

/**
 * Parse and format build status
 */
export function formatBuildStatus(build: Build): string {
  const emoji = build.status === 'success' ? '✅' : build.status === 'failure' ? '❌' : '⏳';
  const duration = build.stages.reduce((total, stage) => {
    if (stage.started_on && stage.ended_on) {
      return total + (new Date(stage.ended_on).getTime() - new Date(stage.started_on).getTime());
    }
    return total;
  }, 0);

  return `${emoji} ${build.status.toUpperCase()} (${Math.round(duration / 1000)}s) - ${build.deployment_trigger.metadata.commit_message}`;
}
