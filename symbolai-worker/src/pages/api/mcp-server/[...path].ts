/**
 * Local MCP Server Implementation
 * يوفر MCP endpoint محلي للتحكم بـ D1, KV, R2 من داخل Worker
 */

import type { APIRoute } from 'astro';
import { requireAdminRole } from '@/lib/permissions';

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

/**
 * قائمة الأدوات المتاحة
 */
const AVAILABLE_TOOLS: MCPTool[] = [
  {
    name: 'd1_list_databases',
    description: 'List all D1 databases',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
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
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
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
  },
  {
    name: 'kv_put',
    description: 'Put value in KV',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Key to store' },
        value: { type: 'string', description: 'Value to store' },
        expirationTtl: { type: 'number', description: 'TTL in seconds' }
      },
      required: ['key', 'value']
    }
  },
  {
    name: 'kv_delete',
    description: 'Delete key from KV',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Key to delete' }
      },
      required: ['key']
    }
  },
  {
    name: 'r2_list_objects',
    description: 'List objects in R2 bucket',
    inputSchema: {
      type: 'object',
      properties: {
        prefix: { type: 'string', description: 'Object prefix filter' },
        limit: { type: 'number', description: 'Maximum objects to return' }
      },
      required: []
    }
  },
  {
    name: 'r2_get_object',
    description: 'Get object metadata from R2',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Object key' }
      },
      required: ['key']
    }
  },
  {
    name: 'r2_delete_object',
    description: 'Delete object from R2',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Object key to delete' }
      },
      required: ['key']
    }
  }
];

/**
 * تنفيذ الأدوات
 */
async function executeTool(
  name: string,
  params: Record<string, any>,
  env: any
): Promise<any> {
  switch (name) {
    // D1 Operations
    case 'd1_list_databases':
      return [{
        uuid: '3897ede2-ffc0-4fe8-8217-f9607c89bef2',
        name: 'symbolai-financial-db',
        version: '1.0',
        num_tables: 16,
        created_at: new Date().toISOString()
      }];

    case 'd1_query': {
      const { sql, params: queryParams = [] } = params;

      // Validate SQL
      if (!sql || typeof sql !== 'string') {
        throw new Error('SQL query required');
      }

      // Execute query
      let stmt = env.DB.prepare(sql);
      for (const param of queryParams) {
        stmt = stmt.bind(param);
      }

      const result = await stmt.all();

      return {
        success: true,
        meta: result.meta,
        results: result.results
      };
    }

    case 'd1_list_tables': {
      const result = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      ).all();

      return result.results.map((r: any) => ({
        name: r.name,
        type: 'table'
      }));
    }

    // KV Operations
    case 'kv_list_keys': {
      const { prefix = '', limit = 100 } = params;

      const keys = await env.SESSIONS.list({ prefix, limit });

      return {
        keys: keys.keys.map((k: any) => ({
          name: k.name,
          expiration: k.expiration,
          metadata: k.metadata
        })),
        list_complete: keys.list_complete,
        cursor: keys.cursor
      };
    }

    case 'kv_get': {
      const { key } = params;

      if (!key) throw new Error('Key required');

      const value = await env.SESSIONS.get(key);

      return {
        key,
        value,
        exists: value !== null
      };
    }

    case 'kv_put': {
      const { key, value, expirationTtl } = params;

      if (!key || !value) throw new Error('Key and value required');

      const options: any = {};
      if (expirationTtl) {
        options.expirationTtl = expirationTtl;
      }

      await env.SESSIONS.put(key, value, options);

      return {
        success: true,
        key,
        stored: true
      };
    }

    case 'kv_delete': {
      const { key } = params;

      if (!key) throw new Error('Key required');

      await env.SESSIONS.delete(key);

      return {
        success: true,
        key,
        deleted: true
      };
    }

    // R2 Operations
    case 'r2_list_objects': {
      const { prefix = '', limit = 100 } = params;

      const listed = await env.PAYROLL_PDFS.list({ prefix, limit });

      return {
        objects: listed.objects.map((obj: any) => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
          httpEtag: obj.httpEtag
        })),
        truncated: listed.truncated,
        cursor: listed.cursor
      };
    }

    case 'r2_get_object': {
      const { key } = params;

      if (!key) throw new Error('Key required');

      const object = await env.PAYROLL_PDFS.head(key);

      if (!object) {
        return {
          exists: false,
          key
        };
      }

      return {
        exists: true,
        key: object.key,
        size: object.size,
        uploaded: object.uploaded,
        httpEtag: object.httpEtag,
        httpMetadata: object.httpMetadata,
        customMetadata: object.customMetadata
      };
    }

    case 'r2_delete_object': {
      const { key } = params;

      if (!key) throw new Error('Key required');

      await env.PAYROLL_PDFS.delete(key);

      return {
        success: true,
        key,
        deleted: true
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * معالجة طلبات MCP
 */
async function handleMCPRequest(
  request: MCPRequest,
  env: any
): Promise<MCPResponse> {
  const { method, params = {}, id } = request;

  try {
    let result: any;

    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'SymbolAI Local MCP Server',
            version: '1.0.0'
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

        result = await executeTool(params.name, params.arguments || {}, env);
        break;

      case 'ping':
        result = {
          status: 'ok',
          timestamp: new Date().toISOString()
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
 * API Route Handler
 */
export const POST: APIRoute = async ({ request, locals, params }) => {
  try {
    // Authentication check
    const authResult = await requireAdminRole(
      locals.runtime.env.SESSIONS,
      locals.runtime.env.DB,
      request
    );

    if (authResult instanceof Response) {
      return authResult;
    }

    // Parse MCP request
    const mcpRequest: MCPRequest = await request.json();

    // Validate JSON-RPC format
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

    // Handle request
    const response = await handleMCPRequest(mcpRequest, locals.runtime.env);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('MCP server error:', error);

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
 * GET handler لعرض معلومات MCP Server
 */
export const GET: APIRoute = async ({ locals }) => {
  return new Response(
    JSON.stringify({
      name: 'SymbolAI Local MCP Server',
      version: '1.0.0',
      description: 'MCP server for managing Cloudflare resources (D1, KV, R2)',
      endpoint: '/api/mcp-server',
      protocol: 'JSON-RPC 2.0',
      methods: [
        'initialize',
        'tools/list',
        'tools/call',
        'ping'
      ],
      tools: AVAILABLE_TOOLS.map(t => ({
        name: t.name,
        description: t.description
      })),
      authentication: 'Admin role required',
      usage: {
        curl: 'curl -X POST https://symbolai.net/api/mcp-server -H "Content-Type: application/json" -H "Cookie: session=..." -d \'{"jsonrpc":"2.0","method":"tools/list","id":1}\'',
        javascript: 'fetch("/api/mcp-server", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 }) })'
      }
    }, null, 2),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};
