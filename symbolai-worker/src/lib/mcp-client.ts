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

// Import Cloudflare Workers runtime types
/// <reference types="@cloudflare/workers-types" />

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

// KV Namespace Metadata Types (different from runtime KVNamespace binding)
export interface KVNamespaceInfo {
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
   * Make a request to an MCP server endpoint with retry logic and timeout
   */
  private async makeRequest<T = any>(
    endpoint: string,
    method: string,
    params?: Record<string, any>,
    options: { timeout?: number; retries?: number } = {}
  ): Promise<T> {
    const { timeout = 30000, retries = 3 } = options;

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

    let lastError: Error | null = null;

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(request),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Check response status
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(
              `MCP request failed: ${response.status} ${response.statusText}. Details: ${errorText}`
            );
          }

          // Parse JSON response
          const data: MCPResponse<T> = await response.json();

          // Check for JSON-RPC error
          if (data.error) {
            throw new Error(
              `MCP error: ${data.error.message} (code: ${data.error.code})${
                data.error.data ? `. Data: ${JSON.stringify(data.error.data)}` : ''
              }`
            );
          }

          // Validate result exists
          if (data.result === undefined) {
            throw new Error('MCP response missing result field');
          }

          return data.result as T;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain errors
        if (
          error instanceof Error &&
          (error.message.includes('401') || // Unauthorized
            error.message.includes('403') || // Forbidden
            error.message.includes('404')) // Not Found
        ) {
          throw lastError;
        }

        // If this was the last attempt, throw the error
        if (attempt === retries - 1) {
          throw lastError;
        }

        // Exponential backoff: wait 2^attempt seconds
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('MCP request failed after all retries');
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
    // Validate inputs
    if (!databaseId || databaseId.trim() === '') {
      throw new Error('Database ID is required');
    }

    if (!sql || sql.trim() === '') {
      throw new Error('SQL query is required');
    }

    // Validate SQL for security (basic check)
    const validation = validateSQL(sql);
    if (!validation.valid) {
      throw new Error(`SQL validation failed: ${validation.error}`);
    }

    return this.makeRequest<D1QueryResult>(
      MCP_ENDPOINTS.bindings,
      'd1_database_query',
      {
        database_id: databaseId,
        sql: sql.trim(),
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
  async listKVNamespaces(): Promise<KVNamespaceInfo[]> {
    return this.makeRequest<KVNamespaceInfo[]>(
      MCP_ENDPOINTS.bindings,
      'kv_namespaces_list'
    );
  }

  /**
   * Get KV namespace details
   */
  async getKVNamespace(namespaceId: string): Promise<KVNamespaceInfo> {
    if (!namespaceId || namespaceId.trim() === '') {
      throw new Error('Namespace ID is required');
    }

    return this.makeRequest<KVNamespaceInfo>(
      MCP_ENDPOINTS.bindings,
      'kv_namespace_get',
      { namespace_id: namespaceId }
    );
  }

  /**
   * Create a new KV namespace
   */
  async createKVNamespace(title: string): Promise<KVNamespaceInfo> {
    if (!title || title.trim() === '') {
      throw new Error('KV namespace title is required');
    }

    return this.makeRequest<KVNamespaceInfo>(
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

/**
 * MCP Token Data Structure
 * Stored in KV for authenticated MCP sessions
 */
export interface MCPTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  accountId: string;
}

/**
 * Store MCP token in KV
 * @param kv - Cloudflare KV namespace binding (from env.SESSIONS)
 * @param userId - User ID to associate the token with
 * @param tokenData - MCP token data to store
 */
export async function storeMCPToken(
  kv: KVNamespace,  // This is the runtime KVNamespace from @cloudflare/workers-types
  userId: string,
  tokenData: MCPTokenData
): Promise<void> {
  if (!userId || userId.trim() === '') {
    throw new Error('User ID is required');
  }

  if (!tokenData.accessToken) {
    throw new Error('Access token is required');
  }

  const key = `mcp_token:${userId}`;
  await kv.put(key, JSON.stringify(tokenData), {
    expirationTtl: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Get MCP token from KV
 * @param kv - Cloudflare KV namespace binding (from env.SESSIONS)
 * @param userId - User ID to retrieve the token for
 * @returns Token data or null if not found/expired/invalid
 */
export async function getMCPToken(
  kv: KVNamespace,
  userId: string
): Promise<MCPTokenData | null> {
  if (!userId || userId.trim() === '') {
    throw new Error('User ID is required');
  }

  const key = `mcp_token:${userId}`;
  const data = await kv.get(key, 'text');

  if (!data) {
    return null;
  }

  try {
    const tokenData: MCPTokenData = JSON.parse(data);

    // Validate token structure
    if (!tokenData.accessToken || !tokenData.accountId || !tokenData.expiresAt) {
      console.error('Invalid token data structure for user:', userId);
      await kv.delete(key);
      return null;
    }

    // Check if token is expired
    if (tokenData.expiresAt < Date.now()) {
      await kv.delete(key);
      return null;
    }

    return tokenData;
  } catch (error) {
    console.error('Failed to parse token data for user:', userId, error);
    // Delete corrupted data
    await kv.delete(key);
    return null;
  }
}

/**
 * Delete MCP token from KV
 * @param kv - Cloudflare KV namespace binding (from env.SESSIONS)
 * @param userId - User ID to delete the token for
 */
export async function deleteMCPToken(
  kv: KVNamespace,
  userId: string
): Promise<void> {
  if (!userId || userId.trim() === '') {
    throw new Error('User ID is required');
  }

  const key = `mcp_token:${userId}`;
  await kv.delete(key);
}

/**
 * Create an authenticated MCP client for a user
 * @param kv - Cloudflare KV namespace binding (from env.SESSIONS)
 * @param userId - User ID to create the client for
 * @returns MCP client instance or null if no valid token found
 */
export async function createAuthenticatedMCPClient(
  kv: KVNamespace,
  userId: string
): Promise<MCPClient | null> {
  if (!userId || userId.trim() === '') {
    throw new Error('User ID is required');
  }

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
 * Validate SQL query for security
 * @param sql - SQL query to validate
 * @returns Validation result with error message if invalid
 */
export function validateSQL(sql: string): { valid: boolean; error?: string } {
  if (!sql || sql.trim() === '') {
    return { valid: false, error: 'SQL query cannot be empty' };
  }

  const trimmedSQL = sql.trim();
  const lowerSQL = trimmedSQL.toLowerCase();

  // Check maximum length (prevent DoS)
  const MAX_SQL_LENGTH = 10000;
  if (trimmedSQL.length > MAX_SQL_LENGTH) {
    return {
      valid: false,
      error: `SQL query too long (max ${MAX_SQL_LENGTH} characters)`,
    };
  }

  // Block dangerous operations
  const dangerousPatterns = [
    /\bdrop\s+(table|database|index|view|trigger)\b/i,
    /\btruncate\b/i,
    /\balter\s+table\b.*\bdrop\b/i,
    /\bdelete\s+from\b.*\bwhere\s+(1\s*=\s*1|true)\b/i, // DELETE without proper WHERE
    /\bexec(ute)?\b/i,
    /\battach\b/i,
    /\bdetach\b/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(lowerSQL)) {
      return {
        valid: false,
        error: 'Dangerous SQL operation detected. DROP, TRUNCATE, EXEC, ATTACH are not allowed.',
      };
    }
  }

  // Check for SQL injection patterns
  const injectionPatterns = [
    /;\s*(drop|delete|update|insert|exec)/i, // Multiple statements
    /--/, // SQL comments
    /\/\*/, // Multi-line comments
    /union\s+select/i, // UNION injection
    /into\s+(outfile|dumpfile)/i, // File operations
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(lowerSQL)) {
      return {
        valid: false,
        error: 'Potential SQL injection pattern detected',
      };
    }
  }

  // Must start with allowed commands (removed PRAGMA for security)
  if (!/^(select|insert|update|delete|with)\s/i.test(lowerSQL)) {
    return {
      valid: false,
      error: 'Query must start with SELECT, INSERT, UPDATE, DELETE, or WITH',
    };
  }

  // Recommend using LIMIT for SELECT queries
  if (lowerSQL.startsWith('select') && !lowerSQL.includes('limit')) {
    console.warn('SELECT query without LIMIT may return large result sets');
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
