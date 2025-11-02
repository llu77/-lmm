/**
 * MCP Server-Sent Events (SSE) Endpoint
 *
 * This endpoint implements the Model Context Protocol SSE transport,
 * allowing MCP clients (Claude Desktop, Cursor, etc.) to connect to
 * SymbolAI's MCP functionality.
 *
 * Protocol: https://modelcontextprotocol.io/docs/specification/transport
 */

import type { APIRoute } from 'astro';
import { requireAdminRole } from '@/lib/permissions';
import { createAuthenticatedMCPClient } from '@/lib/mcp-client';

// CORS Headers for MCP Clients (Claude Desktop, Cursor, Windsurf, etc.)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Account-ID',
  'Access-Control-Max-Age': '86400', // 24 hours
};

// MCP Protocol Types
interface MCPMessage {
  jsonrpc: '2.0';
  method?: string;
  params?: Record<string, any>;
  id?: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * SSE Endpoint for MCP Protocol
 *
 * Handles Server-Sent Events connection for MCP clients.
 * This allows real-time bidirectional communication using SSE + POST.
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Verify admin authentication
    const authResult = await requireAdminRole(
      locals.runtime.env.SESSIONS,
      locals.runtime.env.DB,
      request
    );

    if (authResult instanceof Response) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Check MCP connection
    const mcpClient = await createAuthenticatedMCPClient(
      locals.runtime.env.SESSIONS,
      authResult.userId
    );

    if (!mcpClient) {
      return new Response('MCP not connected', { status: 401 });
    }

    // 3. Create SSE stream
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array>;

    const stream = new ReadableStream({
      start(ctrl) {
        controller = ctrl;

        // Send initial connection message
        const initMessage = {
          jsonrpc: '2.0' as const,
          method: 'initialized',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {
                listTools: true,
                callTool: true,
              },
              resources: {
                listResources: true,
                readResource: true,
              },
            },
            serverInfo: {
              name: 'SymbolAI MCP Server',
              version: '1.0.0',
            },
          },
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(initMessage)}\n\n`)
        );

        // Send keepalive every 30 seconds
        const keepalive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keepalive\n\n'));
          } catch (error) {
            clearInterval(keepalive);
          }
        }, 30000);

        // Cleanup on close
        return () => {
          clearInterval(keepalive);
        };
      },

      cancel() {
        console.log('SSE connection closed');
      },
    });

    // 4. Return SSE response with CORS headers
    return new Response(stream, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error('SSE endpoint error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to establish SSE connection',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

/**
 * OPTIONS Endpoint for CORS Preflight
 *
 * Handles CORS preflight requests from browsers.
 */
export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

/**
 * POST Endpoint for MCP Protocol Messages
 *
 * Handles incoming MCP messages from clients.
 * This is used in conjunction with the SSE endpoint for bidirectional communication.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Verify admin authentication
    const authResult = await requireAdminRole(
      locals.runtime.env.SESSIONS,
      locals.runtime.env.DB,
      request
    );

    if (authResult instanceof Response) {
      return authResult;
    }

    // 2. Parse MCP message
    const message: MCPMessage = await request.json();

    if (message.jsonrpc !== '2.0') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request: jsonrpc must be "2.0"',
          },
          id: message.id,
        }),
        {
          status: 400,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 3. Create MCP client
    const mcpClient = await createAuthenticatedMCPClient(
      locals.runtime.env.SESSIONS,
      authResult.userId
    );

    if (!mcpClient) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'MCP not connected',
          },
          id: message.id,
        }),
        {
          status: 401,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 4. Handle MCP methods
    const response = await handleMCPMethod(message, mcpClient);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('MCP POST error:', error);

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error',
        },
        id: null,
      }),
      {
        status: 500,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

/**
 * Handle MCP Protocol Methods
 */
async function handleMCPMethod(
  message: MCPMessage,
  mcpClient: any
): Promise<MCPMessage> {
  const { method, params, id } = message;

  try {
    switch (method) {
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          result: {
            tools: [
              {
                name: 'd1_list_databases',
                description: 'List all D1 databases in the account',
                inputSchema: {
                  type: 'object',
                  properties: {},
                  required: [],
                },
              },
              {
                name: 'd1_query',
                description: 'Execute a SQL query on a D1 database',
                inputSchema: {
                  type: 'object',
                  properties: {
                    databaseId: {
                      type: 'string',
                      description: 'D1 database UUID',
                    },
                    sql: {
                      type: 'string',
                      description: 'SQL query to execute',
                    },
                    params: {
                      type: 'array',
                      description: 'Query parameters',
                    },
                  },
                  required: ['databaseId', 'sql'],
                },
              },
              {
                name: 'kv_list_namespaces',
                description: 'List all KV namespaces',
                inputSchema: {
                  type: 'object',
                  properties: {},
                  required: [],
                },
              },
              {
                name: 'r2_list_buckets',
                description: 'List all R2 buckets',
                inputSchema: {
                  type: 'object',
                  properties: {},
                  required: [],
                },
              },
              {
                name: 'workers_list',
                description: 'List all Workers scripts',
                inputSchema: {
                  type: 'object',
                  properties: {},
                  required: [],
                },
              },
              {
                name: 'builds_list',
                description: 'List recent builds/deployments',
                inputSchema: {
                  type: 'object',
                  properties: {
                    limit: {
                      type: 'number',
                      description: 'Maximum number of builds to return (1-100)',
                    },
                    worker: {
                      type: 'string',
                      description: 'Worker name to filter builds',
                    },
                  },
                  required: [],
                },
              },
            ],
          },
          id,
        };

      case 'tools/call':
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        switch (toolName) {
          case 'd1_list_databases':
            const databases = await mcpClient.listD1Databases();
            return {
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(databases, null, 2),
                  },
                ],
              },
              id,
            };

          case 'd1_query':
            const queryResult = await mcpClient.queryD1Database(
              toolArgs.databaseId,
              toolArgs.sql,
              toolArgs.params || []
            );
            return {
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(queryResult, null, 2),
                  },
                ],
              },
              id,
            };

          case 'kv_list_namespaces':
            const namespaces = await mcpClient.listKVNamespaces();
            return {
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(namespaces, null, 2),
                  },
                ],
              },
              id,
            };

          case 'r2_list_buckets':
            const buckets = await mcpClient.listR2Buckets();
            return {
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(buckets, null, 2),
                  },
                ],
              },
              id,
            };

          case 'workers_list':
            const workers = await mcpClient.listWorkers();
            return {
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(workers, null, 2),
                  },
                ],
              },
              id,
            };

          case 'builds_list':
            await mcpClient.setActiveWorker(
              toolArgs.worker || 'symbolai-worker'
            );
            const builds = await mcpClient.listBuilds(toolArgs.limit || 10);
            return {
              jsonrpc: '2.0',
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(builds, null, 2),
                  },
                ],
              },
              id,
            };

          default:
            return {
              jsonrpc: '2.0',
              error: {
                code: -32601,
                message: `Tool not found: ${toolName}`,
              },
              id,
            };
        }

      case 'resources/list':
        return {
          jsonrpc: '2.0',
          result: {
            resources: [
              {
                uri: 'cloudflare://d1/databases',
                name: 'D1 Databases',
                description: 'List of all D1 databases',
                mimeType: 'application/json',
              },
              {
                uri: 'cloudflare://kv/namespaces',
                name: 'KV Namespaces',
                description: 'List of all KV namespaces',
                mimeType: 'application/json',
              },
              {
                uri: 'cloudflare://r2/buckets',
                name: 'R2 Buckets',
                description: 'List of all R2 buckets',
                mimeType: 'application/json',
              },
            ],
          },
          id,
        };

      case 'resources/read':
        const uri = params?.uri;
        if (!uri) {
          return {
            jsonrpc: '2.0',
            error: {
              code: -32602,
              message: 'Missing required parameter: uri',
            },
            id,
          };
        }

        // Handle resource URIs
        if (uri === 'cloudflare://d1/databases') {
          const databases = await mcpClient.listD1Databases();
          return {
            jsonrpc: '2.0',
            result: {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(databases, null, 2),
                },
              ],
            },
            id,
          };
        }

        return {
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: `Unknown resource URI: ${uri}`,
          },
          id,
        };

      default:
        return {
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
          id,
        };
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error',
      },
      id,
    };
  }
}
