/**
 * MCP Server Test Endpoint (No Auth Required for Testing)
 * للاختبار فقط - بدون مصادقة
 */

import type { APIRoute } from 'astro';

interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, any>;
  id: string | number;
}

interface MCPResponse<T = any> {
  jsonrpc: '2.0';
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

const AVAILABLE_TOOLS: MCPTool[] = [
  {
    name: 'd1_list_databases',
    description: 'List all D1 databases',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'd1_query',
    description: 'Execute SQL query on D1 database',
    inputSchema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'SQL query to execute' },
        params: { type: 'array', description: 'Query parameters' }
      },
      required: ['sql']
    }
  },
  {
    name: 'd1_list_tables',
    description: 'List all tables in D1 database',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'kv_list_keys',
    description: 'List keys in KV namespace',
    inputSchema: {
      type: 'object',
      properties: {
        prefix: { type: 'string', description: 'Key prefix filter' },
        limit: { type: 'number', description: 'Maximum keys to return' }
      },
      required: []
    }
  },
  {
    name: 'kv_get',
    description: 'Get value from KV',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Key to retrieve' }
      },
      required: ['key']
    }
  }
];

/**
 * Mock data for testing without bindings
 */
const MOCK_DATA = {
  d1_databases: [
    {
      uuid: '3897ede2-ffc0-4fe8-8217-f9607c89bef2',
      name: 'symbolai-financial-db',
      version: '1.0',
      num_tables: 16,
      created_at: new Date().toISOString()
    }
  ],
  d1_tables: [
    { name: 'users_new', type: 'table' },
    { name: 'roles', type: 'table' },
    { name: 'branches', type: 'table' },
    { name: 'employees', type: 'table' },
    { name: 'revenues', type: 'table' },
    { name: 'expenses', type: 'table' },
    { name: 'payroll_records', type: 'table' },
    { name: 'bonus_records', type: 'table' },
    { name: 'advances', type: 'table' },
    { name: 'deductions', type: 'table' },
    { name: 'employee_requests', type: 'table' },
    { name: 'product_orders', type: 'table' },
    { name: 'email_logs', type: 'table' },
    { name: 'audit_logs', type: 'table' },
    { name: 'backups', type: 'table' },
    { name: 'notifications', type: 'table' }
  ],
  kv_keys: [
    { name: 'session:abc123', expiration: null, metadata: null },
    { name: 'session:def456', expiration: null, metadata: null },
    { name: 'mcp:test', expiration: Date.now() / 1000 + 3600, metadata: null }
  ],
  r2_objects: [
    {
      key: 'payrolls/2025-10.pdf',
      size: 125000,
      uploaded: '2025-10-31T12:00:00Z',
      httpEtag: 'abc123'
    },
    {
      key: 'payrolls/2025-11.pdf',
      size: 130000,
      uploaded: '2025-11-01T12:00:00Z',
      httpEtag: 'def456'
    }
  ]
};

/**
 * Execute tool with mock data
 */
async function executeTool(name: string, params: Record<string, any>): Promise<any> {
  switch (name) {
    case 'd1_list_databases':
      return MOCK_DATA.d1_databases;

    case 'd1_list_tables':
      return MOCK_DATA.d1_tables;

    case 'd1_query':
      // Mock query execution
      const { sql } = params;
      if (sql.toLowerCase().includes('count')) {
        return {
          success: true,
          meta: { duration: 0.005, rows_read: 100, rows_written: 0 },
          results: [{ count: 42 }]
        };
      } else if (sql.toLowerCase().includes('select')) {
        return {
          success: true,
          meta: { duration: 0.010, rows_read: 10, rows_written: 0 },
          results: [
            { id: 1, name: 'محمد أحمد', role: 'admin' },
            { id: 2, name: 'فاطمة علي', role: 'supervisor' },
            { id: 3, name: 'أحمد محمود', role: 'employee' }
          ]
        };
      }
      return {
        success: true,
        meta: { duration: 0.001, rows_read: 0, rows_written: 0 },
        results: []
      };

    case 'kv_list_keys':
      const { prefix = '', limit = 100 } = params;
      const filteredKeys = MOCK_DATA.kv_keys.filter(k =>
        k.name.startsWith(prefix)
      ).slice(0, limit);

      return {
        keys: filteredKeys,
        list_complete: true,
        cursor: null
      };

    case 'kv_get':
      const { key } = params;
      const found = MOCK_DATA.kv_keys.find(k => k.name === key);

      if (found) {
        return {
          key,
          value: JSON.stringify({
            timestamp: new Date().toISOString(),
            test: true,
            message: 'Mock KV data'
          }),
          exists: true
        };
      }

      return {
        key,
        value: null,
        exists: false
      };

    case 'kv_put':
      return {
        success: true,
        key: params.key,
        stored: true
      };

    case 'r2_list_objects':
      return {
        objects: MOCK_DATA.r2_objects,
        truncated: false,
        cursor: null
      };

    case 'r2_get_object':
      const obj = MOCK_DATA.r2_objects.find(o => o.key === params.key);
      if (obj) {
        return {
          exists: true,
          ...obj,
          httpMetadata: { contentType: 'application/pdf' },
          customMetadata: {}
        };
      }
      return {
        exists: false,
        key: params.key
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Handle MCP request
 */
async function handleMCPRequest(request: MCPRequest): Promise<MCPResponse> {
  const { method, params = {}, id } = request;

  try {
    let result: any;

    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'SymbolAI Local MCP Server (Test Mode)',
            version: '1.0.0-test'
          },
          capabilities: {
            tools: {
              listChanged: false
            }
          }
        };
        break;

      case 'tools/list':
        result = {
          tools: AVAILABLE_TOOLS
        };
        break;

      case 'tools/call':
        if (!params.name) {
          throw new Error('Tool name required');
        }
        result = await executeTool(params.name, params.arguments || {});
        break;

      case 'ping':
        result = {
          status: 'ok',
          timestamp: new Date().toISOString(),
          mode: 'test',
          note: 'Using mock data - no real Cloudflare bindings'
        };
        break;

      default:
        throw new Error(`Unknown method: ${method}`);
    }

    return {
      jsonrpc: '2.0',
      result,
      id
    };

  } catch (error) {
    return {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error',
        data: error
      },
      id
    };
  }
}

/**
 * POST handler
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const mcpRequest: MCPRequest = await request.json();

    if (mcpRequest.jsonrpc !== '2.0') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid JSON-RPC version'
          },
          id: mcpRequest.id || null
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const response = await handleMCPRequest(mcpRequest);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
          data: error instanceof Error ? error.message : 'Unknown error'
        },
        id: null
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * GET handler
 */
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      name: 'SymbolAI Local MCP Server (Test Mode)',
      version: '1.0.0-test',
      description: 'MCP server with mock data for testing without Cloudflare bindings',
      endpoint: '/api/mcp-test-local',
      mode: 'test',
      note: 'This endpoint uses mock data. For production, use /api/mcp-server',
      tools: AVAILABLE_TOOLS.map(t => ({
        name: t.name,
        description: t.description
      }))
    }, null, 2),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};
