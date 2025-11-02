/**
 * Cloudflare MCP Agent
 *
 * This is a modern Agent-based implementation of the Cloudflare MCP server.
 * It provides tools for managing D1 databases, KV namespaces, R2 buckets,
 * Workers, and deployment monitoring.
 *
 * Built with Cloudflare Agents framework for:
 * - State management via SQLite
 * - Scheduled tasks
 * - OAuth integration
 * - Workflow triggers
 *
 * @see https://developers.cloudflare.com/agents
 */

import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Env } from '../env';

/**
 * Authentication context passed from OAuth
 */
export interface AuthContext {
  userId?: string;
  accountId?: string;
  apiToken?: string;
  claims?: {
    name?: string;
    email?: string;
    sub?: string;
  };
}

/**
 * Agent state structure
 */
export interface CloudflareMCPState {
  activeAccountId?: string;
  activeWorkerId?: string;
  tokenData?: {
    accountId: string;
    apiToken: string;
    expiresAt: number;
  };
  lastSync?: number;
  stats?: {
    toolCallsCount: number;
    queriesExecuted: number;
    lastActivity: number;
  };
  // Cached data from periodic syncs
  cachedData?: {
    databases?: any[];
    namespaces?: any[];
    buckets?: any[];
    workers?: any[];
    lastCacheUpdate?: number;
  };
  // Scheduled tasks tracking
  scheduledTasks?: {
    syncEnabled: boolean;
    syncInterval: string; // cron expression
    lastSyncStatus?: 'success' | 'error';
    lastSyncError?: string;
  };
  // Workflow tracking
  activeWorkflows?: Array<{
    id: string;
    type: 'migration' | 'batch' | 'deployment';
    status: 'running' | 'completed' | 'failed';
    startedAt: number;
    completedAt?: number;
    error?: string;
  }>;
}

/**
 * Cloudflare API response types
 */
interface CloudflareAPIResponse<T> {
  success: boolean;
  result: T;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
}

/**
 * Cloudflare MCP Agent
 *
 * Provides MCP tools for interacting with Cloudflare services:
 * - D1 Databases (list, query, info)
 * - KV Namespaces (list, get, set)
 * - R2 Buckets (list, info)
 * - Workers (list, logs)
 * - Builds (list, logs)
 */
export class CloudflareMCPAgent extends McpAgent<Env, CloudflareMCPState, AuthContext> {
  server = new McpServer({
    name: 'SymbolAI Cloudflare MCP',
    version: '2.0.0',
  });

  /**
   * Initial state for new agent instances
   */
  initialState: CloudflareMCPState = {
    stats: {
      toolCallsCount: 0,
      queriesExecuted: 0,
      lastActivity: Date.now(),
    },
  };

  /**
   * Initialize MCP server with tools and resources
   */
  async init() {
    // Verify authentication
    const accountId = this.props?.claims?.sub || this.state.activeAccountId;
    if (!accountId) {
      console.warn('CloudflareMCP: No account ID available');
    }

    // Register MCP resources
    this.registerResources();

    // Register MCP tools
    this.registerD1Tools();
    this.registerKVTools();
    this.registerR2Tools();
    this.registerWorkersTools();
    this.registerBuildsTools();
    this.registerStatsTools();

    console.log('CloudflareMCP Agent initialized', {
      accountId,
      userId: this.props?.userId,
      hasApiToken: !!this.state.tokenData?.apiToken,
    });
  }

  /**
   * Register MCP resources
   */
  private registerResources() {
    // Stats resource
    this.server.resource(
      'stats',
      'mcp://cloudflare/stats',
      () => ({
        contents: [{
          uri: 'mcp://cloudflare/stats',
          text: JSON.stringify(this.state.stats, null, 2),
        }],
      })
    );

    // Active account resource
    this.server.resource(
      'active-account',
      'mcp://cloudflare/account',
      () => ({
        contents: [{
          uri: 'mcp://cloudflare/account',
          text: JSON.stringify({
            accountId: this.state.activeAccountId,
            lastSync: this.state.lastSync,
          }, null, 2),
        }],
      })
    );
  }

  /**
   * Register D1 database tools
   */
  private registerD1Tools() {
    // List D1 databases
    this.server.tool(
      'd1_list_databases',
      'List all D1 databases in the Cloudflare account',
      {},
      async () => {
        await this.updateStats();

        try {
          const databases = await this.callCloudflareAPI<any[]>(
            '/client/v4/accounts/{account_id}/d1/database',
            'GET'
          );

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(databases, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }],
            isError: true,
          };
        }
      }
    );

    // Get D1 database info
    this.server.tool(
      'd1_get_database',
      'Get information about a specific D1 database',
      {
        databaseId: z.string().uuid().describe('D1 database UUID'),
      },
      async ({ databaseId }) => {
        await this.updateStats();

        try {
          const database = await this.callCloudflareAPI<any>(
            `/client/v4/accounts/{account_id}/d1/database/${databaseId}`,
            'GET'
          );

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(database, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }],
            isError: true,
          };
        }
      }
    );

    // Query D1 database
    this.server.tool(
      'd1_query',
      'Execute a SQL query on a D1 database',
      {
        databaseId: z.string().uuid().describe('D1 database UUID'),
        sql: z.string().describe('SQL query to execute'),
        params: z.array(z.any()).optional().describe('Query parameters'),
      },
      async ({ databaseId, sql, params }) => {
        await this.updateStats();

        // Validate SQL
        const validation = this.validateSQL(sql);
        if (!validation.valid) {
          return {
            content: [{
              type: 'text' as const,
              text: `SQL validation failed: ${validation.error}`,
            }],
            isError: true,
          };
        }

        try {
          const result = await this.callCloudflareAPI<any>(
            `/client/v4/accounts/{account_id}/d1/database/${databaseId}/query`,
            'POST',
            { sql, params: params || [] }
          );

          // Update query stats
          this.setState({
            ...this.state,
            stats: {
              ...this.state.stats!,
              queriesExecuted: (this.state.stats?.queriesExecuted || 0) + 1,
            },
          });

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }],
            isError: true,
          };
        }
      }
    );
  }

  /**
   * Register KV namespace tools
   */
  private registerKVTools() {
    // List KV namespaces
    this.server.tool(
      'kv_list_namespaces',
      'List all KV namespaces in the Cloudflare account',
      {},
      async () => {
        await this.updateStats();

        try {
          const namespaces = await this.callCloudflareAPI<any[]>(
            '/client/v4/accounts/{account_id}/storage/kv/namespaces',
            'GET'
          );

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(namespaces, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }],
            isError: true,
          };
        }
      }
    );

    // Get KV namespace info
    this.server.tool(
      'kv_get_namespace',
      'Get information about a specific KV namespace',
      {
        namespaceId: z.string().describe('KV namespace ID'),
      },
      async ({ namespaceId }) => {
        await this.updateStats();

        try {
          const namespace = await this.callCloudflareAPI<any>(
            `/client/v4/accounts/{account_id}/storage/kv/namespaces/${namespaceId}`,
            'GET'
          );

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(namespace, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }],
            isError: true,
          };
        }
      }
    );

    // List KV keys
    this.server.tool(
      'kv_list_keys',
      'List keys in a KV namespace',
      {
        namespaceId: z.string().describe('KV namespace ID'),
        prefix: z.string().optional().describe('Filter by key prefix'),
        limit: z.number().min(1).max(1000).optional().describe('Maximum number of keys to return'),
      },
      async ({ namespaceId, prefix, limit }) => {
        await this.updateStats();

        try {
          const params = new URLSearchParams();
          if (prefix) params.set('prefix', prefix);
          if (limit) params.set('limit', String(limit));

          const keys = await this.callCloudflareAPI<any>(
            `/client/v4/accounts/{account_id}/storage/kv/namespaces/${namespaceId}/keys?${params}`,
            'GET'
          );

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(keys, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }],
            isError: true,
          };
        }
      }
    );
  }

  /**
   * Register R2 bucket tools
   */
  private registerR2Tools() {
    // List R2 buckets
    this.server.tool(
      'r2_list_buckets',
      'List all R2 buckets in the Cloudflare account',
      {},
      async () => {
        await this.updateStats();

        try {
          const buckets = await this.callCloudflareAPI<any>(
            '/client/v4/accounts/{account_id}/r2/buckets',
            'GET'
          );

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(buckets, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }],
            isError: true,
          };
        }
      }
    );

    // Get R2 bucket info
    this.server.tool(
      'r2_get_bucket',
      'Get information about a specific R2 bucket',
      {
        bucketName: z.string().describe('R2 bucket name'),
      },
      async ({ bucketName }) => {
        await this.updateStats();

        try {
          const bucket = await this.callCloudflareAPI<any>(
            `/client/v4/accounts/{account_id}/r2/buckets/${bucketName}`,
            'GET'
          );

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(bucket, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }],
            isError: true,
          };
        }
      }
    );
  }

  /**
   * Register Workers tools
   */
  private registerWorkersTools() {
    // List Workers
    this.server.tool(
      'workers_list',
      'List all Workers scripts in the Cloudflare account',
      {},
      async () => {
        await this.updateStats();

        try {
          const workers = await this.callCloudflareAPI<any>(
            '/client/v4/accounts/{account_id}/workers/scripts',
            'GET'
          );

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(workers, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }],
            isError: true,
          };
        }
      }
    );

    // Get Worker details
    this.server.tool(
      'workers_get',
      'Get details about a specific Worker script',
      {
        scriptName: z.string().describe('Worker script name'),
      },
      async ({ scriptName }) => {
        await this.updateStats();

        try {
          const worker = await this.callCloudflareAPI<any>(
            `/client/v4/accounts/{account_id}/workers/scripts/${scriptName}`,
            'GET'
          );

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(worker, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }],
            isError: true,
          };
        }
      }
    );
  }

  /**
   * Register build monitoring tools
   */
  private registerBuildsTools() {
    // List builds
    this.server.tool(
      'builds_list',
      'List recent Worker builds and deployments',
      {
        projectName: z.string().optional().describe('Filter by project name'),
        limit: z.number().min(1).max(100).optional().describe('Maximum number of builds to return'),
      },
      async ({ projectName, limit }) => {
        await this.updateStats();

        try {
          const params = new URLSearchParams();
          if (limit) params.set('per_page', String(limit));

          const builds = await this.callCloudflareAPI<any>(
            `/client/v4/accounts/{account_id}/pages/projects${projectName ? `/${projectName}` : ''}/deployments?${params}`,
            'GET'
          );

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(builds, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }],
            isError: true,
          };
        }
      }
    );

    // Get build logs
    this.server.tool(
      'builds_get_logs',
      'Get logs for a specific build',
      {
        projectName: z.string().describe('Project name'),
        deploymentId: z.string().describe('Deployment ID'),
      },
      async ({ projectName, deploymentId }) => {
        await this.updateStats();

        try {
          const logs = await this.callCloudflareAPI<any>(
            `/client/v4/accounts/{account_id}/pages/projects/${projectName}/deployments/${deploymentId}/history/logs`,
            'GET'
          );

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(logs, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }],
            isError: true,
          };
        }
      }
    );
  }

  /**
   * Register stats tools
   */
  private registerStatsTools() {
    this.server.tool(
      'get_stats',
      'Get usage statistics for this MCP agent',
      {},
      async () => {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              ...this.state.stats,
              uptime: Date.now() - (this.state.stats?.lastActivity || Date.now()),
              accountId: this.state.activeAccountId,
            }, null, 2),
          }],
        };
      }
    );

    this.server.tool(
      'set_active_account',
      'Set the active Cloudflare account for operations',
      {
        accountId: z.string().regex(/^[a-f0-9]{32}$/i).describe('Cloudflare account ID (32-character hex)'),
      },
      async ({ accountId }) => {
        this.setState({
          ...this.state,
          activeAccountId: accountId,
          lastSync: Date.now(),
        });

        return {
          content: [{
            type: 'text' as const,
            text: `Active account set to: ${accountId}`,
          }],
        };
      }
    );
  }

  /**
   * Update activity stats
   */
  private async updateStats() {
    this.setState({
      ...this.state,
      stats: {
        toolCallsCount: (this.state.stats?.toolCallsCount || 0) + 1,
        queriesExecuted: this.state.stats?.queriesExecuted || 0,
        lastActivity: Date.now(),
      },
    });
  }

  /**
   * Make authenticated API call to Cloudflare
   */
  private async callCloudflareAPI<T>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const accountId = this.state.activeAccountId || this.props?.accountId;
    const apiToken = this.state.tokenData?.apiToken || this.props?.apiToken;

    if (!accountId) {
      throw new Error('No account ID configured. Use set_active_account tool first.');
    }

    if (!apiToken) {
      throw new Error('No API token configured. Please authenticate first.');
    }

    // Replace {account_id} placeholder
    const url = `https://api.cloudflare.com${path.replace('{account_id}', accountId)}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}. ${errorText}`);
    }

    const data: CloudflareAPIResponse<T> = await response.json();

    if (!data.success) {
      throw new Error(`Cloudflare API error: ${data.errors.map(e => e.message).join(', ')}`);
    }

    return data.result;
  }

  /**
   * Validate SQL query for security
   */
  private validateSQL(sql: string): { valid: boolean; error?: string } {
    if (!sql || sql.trim() === '') {
      return { valid: false, error: 'SQL query cannot be empty' };
    }

    const trimmedSQL = sql.trim();
    const lowerSQL = trimmedSQL.toLowerCase();

    // Check maximum length
    if (trimmedSQL.length > 10000) {
      return { valid: false, error: 'SQL query too long (max 10000 characters)' };
    }

    // Block dangerous operations
    const dangerousPatterns = [
      /\bdrop\s+(table|database|index|view|trigger)\b/i,
      /\btruncate\b/i,
      /\balter\s+table\b.*\bdrop\b/i,
      /\bexec(ute)?\b/i,
      /\battach\b/i,
      /\bdetach\b/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(lowerSQL)) {
        return { valid: false, error: 'Dangerous SQL operation detected' };
      }
    }

    // Check for SQL injection patterns
    const injectionPatterns = [
      /;\s*(drop|delete|update|insert|exec)/i,
      /--/,
      /\/\*/,
      /union\s+select/i,
      /into\s+(outfile|dumpfile)/i,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(lowerSQL)) {
        return { valid: false, error: 'Potential SQL injection pattern detected' };
      }
    }

    // Must start with allowed commands
    if (!/^(select|insert|update|delete|with)\s/i.test(lowerSQL)) {
      return { valid: false, error: 'Query must start with SELECT, INSERT, UPDATE, DELETE, or WITH' };
    }

    return { valid: true };
  }

  /**
   * ==================== Scheduled Tasks ====================
   */

  /**
   * Enable periodic syncing of Cloudflare resources
   */
  async enablePeriodicSync(interval: string = '0 * * * *') {
    // Cancel existing sync task if any
    const existingTasks = this.getSchedules({ description: 'periodic-sync' });
    for (const task of existingTasks) {
      await this.cancelSchedule(task.id);
    }

    // Schedule new sync task
    await this.schedule(interval, 'syncCloudflareResources', {
      description: 'periodic-sync'
    });

    // Update state
    this.setState({
      ...this.state,
      scheduledTasks: {
        syncEnabled: true,
        syncInterval: interval,
        lastSyncStatus: this.state.scheduledTasks?.lastSyncStatus,
        lastSyncError: this.state.scheduledTasks?.lastSyncError,
      },
    });

    console.log(`Periodic sync enabled with interval: ${interval}`);
  }

  /**
   * Disable periodic syncing
   */
  async disablePeriodicSync() {
    const tasks = this.getSchedules({ description: 'periodic-sync' });
    for (const task of tasks) {
      await this.cancelSchedule(task.id);
    }

    this.setState({
      ...this.state,
      scheduledTasks: {
        ...this.state.scheduledTasks,
        syncEnabled: false,
      } as any,
    });

    console.log('Periodic sync disabled');
  }

  /**
   * Scheduled task: Sync all Cloudflare resources
   * This runs periodically to keep cached data fresh
   */
  async syncCloudflareResources(data?: any) {
    console.log('Starting periodic sync of Cloudflare resources...');

    try {
      const accountId = this.state.activeAccountId || this.props?.accountId;
      if (!accountId) {
        throw new Error('No account ID available for sync');
      }

      // Fetch all resources in parallel
      const [databases, namespaces, buckets, workers] = await Promise.allSettled([
        this.callCloudflareAPI<any[]>('/client/v4/accounts/{account_id}/d1/database', 'GET'),
        this.callCloudflareAPI<any[]>('/client/v4/accounts/{account_id}/storage/kv/namespaces', 'GET'),
        this.callCloudflareAPI<any>('/client/v4/accounts/{account_id}/r2/buckets', 'GET'),
        this.callCloudflareAPI<any>('/client/v4/accounts/{account_id}/workers/scripts', 'GET'),
      ]);

      // Update cached data
      this.setState({
        ...this.state,
        cachedData: {
          databases: databases.status === 'fulfilled' ? databases.value : [],
          namespaces: namespaces.status === 'fulfilled' ? namespaces.value : [],
          buckets: buckets.status === 'fulfilled' ? buckets.value : [],
          workers: workers.status === 'fulfilled' ? workers.value : [],
          lastCacheUpdate: Date.now(),
        },
        scheduledTasks: {
          ...this.state.scheduledTasks,
          syncEnabled: this.state.scheduledTasks?.syncEnabled ?? false,
          syncInterval: this.state.scheduledTasks?.syncInterval ?? '0 * * * *',
          lastSyncStatus: 'success',
          lastSyncError: undefined,
        } as any,
        lastSync: Date.now(),
      });

      console.log('Periodic sync completed successfully');
    } catch (error) {
      console.error('Periodic sync failed:', error);

      this.setState({
        ...this.state,
        scheduledTasks: {
          ...this.state.scheduledTasks,
          syncEnabled: this.state.scheduledTasks?.syncEnabled ?? false,
          syncInterval: this.state.scheduledTasks?.syncInterval ?? '0 * * * *',
          lastSyncStatus: 'error',
          lastSyncError: error instanceof Error ? error.message : 'Unknown error',
        } as any,
      });
    }
  }

  /**
   * ==================== Workflow Integration ====================
   */

  /**
   * Trigger a workflow for D1 database migration
   */
  async triggerMigrationWorkflow(databaseId: string, migrations: string[]) {
    const workflowId = crypto.randomUUID();

    try {
      // Create workflow instance
      const instance = await (this.env as any).D1_MIGRATION_WORKFLOW?.create({
        id: workflowId,
        params: {
          databaseId,
          migrations,
          accountId: this.state.activeAccountId,
          apiToken: this.state.tokenData?.apiToken,
        },
      });

      // Track workflow in state
      this.setState({
        ...this.state,
        activeWorkflows: [
          ...(this.state.activeWorkflows || []),
          {
            id: workflowId,
            type: 'migration',
            status: 'running',
            startedAt: Date.now(),
          },
        ],
      });

      // Schedule a task to check workflow status every 5 minutes
      await this.schedule('*/5 * * * *', 'checkWorkflowStatus', {
        workflowId,
        type: 'migration',
      });

      return {
        workflowId,
        status: 'started',
        message: `Migration workflow started for database ${databaseId}`,
      };
    } catch (error) {
      console.error('Failed to trigger migration workflow:', error);

      // Update workflow status
      this.setState({
        ...this.state,
        activeWorkflows: [
          ...(this.state.activeWorkflows || []),
          {
            id: workflowId,
            type: 'migration',
            status: 'failed',
            startedAt: Date.now(),
            completedAt: Date.now(),
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      });

      throw error;
    }
  }

  /**
   * Trigger a workflow for batch KV operations
   */
  async triggerBatchKVWorkflow(namespaceId: string, operations: Array<{
    key: string;
    value: string;
    operation: 'put' | 'delete';
  }>) {
    const workflowId = crypto.randomUUID();

    try {
      const instance = await (this.env as any).KV_BATCH_WORKFLOW?.create({
        id: workflowId,
        params: {
          namespaceId,
          operations,
          accountId: this.state.activeAccountId,
          apiToken: this.state.tokenData?.apiToken,
        },
      });

      this.setState({
        ...this.state,
        activeWorkflows: [
          ...(this.state.activeWorkflows || []),
          {
            id: workflowId,
            type: 'batch',
            status: 'running',
            startedAt: Date.now(),
          },
        ],
      });

      await this.schedule('*/5 * * * *', 'checkWorkflowStatus', {
        workflowId,
        type: 'batch',
      });

      return {
        workflowId,
        status: 'started',
        message: `Batch KV workflow started for ${operations.length} operations`,
      };
    } catch (error) {
      console.error('Failed to trigger batch KV workflow:', error);

      this.setState({
        ...this.state,
        activeWorkflows: [
          ...(this.state.activeWorkflows || []),
          {
            id: workflowId,
            type: 'batch',
            status: 'failed',
            startedAt: Date.now(),
            completedAt: Date.now(),
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      });

      throw error;
    }
  }

  /**
   * Scheduled task: Check workflow status
   */
  async checkWorkflowStatus(data: { workflowId: string; type: string }) {
    console.log(`Checking status for workflow ${data.workflowId}`);

    try {
      // Get workflow instance based on type
      let instance;
      if (data.type === 'migration') {
        instance = await (this.env as any).D1_MIGRATION_WORKFLOW?.get(data.workflowId);
      } else if (data.type === 'batch') {
        instance = await (this.env as any).KV_BATCH_WORKFLOW?.get(data.workflowId);
      }

      if (!instance) {
        console.warn(`Workflow ${data.workflowId} not found`);
        return;
      }

      const status = await instance.status();

      // Update workflow state
      const workflows = this.state.activeWorkflows || [];
      const workflowIndex = workflows.findIndex(w => w.id === data.workflowId);

      if (workflowIndex >= 0) {
        workflows[workflowIndex] = {
          ...workflows[workflowIndex],
          status: status.status === 'complete' ? 'completed' :
                  status.status === 'error' ? 'failed' : 'running',
          completedAt: status.status === 'complete' || status.status === 'error' ?
                       Date.now() : undefined,
          error: status.status === 'error' ? status.error : undefined,
        };

        this.setState({
          ...this.state,
          activeWorkflows: workflows,
        });

        // Cancel this check task if workflow is complete
        if (status.status === 'complete' || status.status === 'error') {
          const tasks = this.getSchedules({ description: `workflow-check-${data.workflowId}` });
          for (const task of tasks) {
            await this.cancelSchedule(task.id);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to check workflow status for ${data.workflowId}:`, error);
    }
  }

  /**
   * Handle state updates
   */
  onStateUpdate(state: CloudflareMCPState) {
    console.log('CloudflareMCP state updated:', {
      activeAccountId: state.activeAccountId,
      toolCallsCount: state.stats?.toolCallsCount,
      queriesExecuted: state.stats?.queriesExecuted,
      cachedDataAvailable: !!state.cachedData,
      activeWorkflows: state.activeWorkflows?.length || 0,
      syncEnabled: state.scheduledTasks?.syncEnabled,
    });
  }
}
