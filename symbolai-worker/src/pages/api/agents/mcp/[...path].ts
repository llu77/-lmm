/**
 * MCP Agent API Route
 *
 * This route handles all requests to the MCP agent, including:
 * - OAuth authentication flows (/authorize, /token, /register)
 * - MCP protocol communication (/mcp)
 * - Agent state management
 *
 * Uses Cloudflare Agents framework for stateful MCP server.
 */

import type { APIRoute } from 'astro';
import { getAgentByName } from 'agents';
import { handleMCPAuth, verifyMCPToken } from '@/agents/mcp-oauth-provider';
import { CloudflareMCPAgent } from '@/agents/cloudflare-mcp';
import type { AuthContext } from '@/agents/cloudflare-mcp';

/**
 * Handle GET requests - OAuth authorize endpoint and MCP queries
 */
export const GET: APIRoute = async ({ params, request, locals }) => {
  const path = params.path || '';
  const url = new URL(request.url);

  // Handle OAuth authorize endpoint
  if (path === 'authorize') {
    return handleMCPAuth(request, locals.runtime.env);
  }

  // Handle MCP protocol requests
  if (path === 'mcp' || path.startsWith('mcp/')) {
    return handleAgentRequest(request, locals);
  }

  return new Response('Not Found', { status: 404 });
};

/**
 * Handle POST requests - OAuth token endpoint and MCP commands
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const path = params.path || '';

  // Handle OAuth token endpoint
  if (path === 'token') {
    return handleMCPAuth(request, locals.runtime.env);
  }

  // Handle OAuth client registration
  if (path === 'register') {
    return handleMCPAuth(request, locals.runtime.env);
  }

  // Handle MCP protocol requests
  if (path === 'mcp' || path.startsWith('mcp/')) {
    return handleAgentRequest(request, locals);
  }

  return new Response('Not Found', { status: 404 });
};

/**
 * Handle OPTIONS requests - CORS preflight
 */
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
};

/**
 * Handle MCP agent requests
 */
async function handleAgentRequest(
  request: Request,
  locals: any
): Promise<Response> {
  try {
    // Extract auth token from Authorization header
    const authHeader = request.headers.get('Authorization');
    let authContext: AuthContext = {};

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const context = await verifyMCPToken(token, locals.runtime.env);
      if (context) {
        authContext = context;
      }
    }

    // Get or create agent instance for this user
    const agentId = authContext.userId || 'anonymous';
    const agent = await getAgentByName(
      CloudflareMCPAgent,
      agentId,
      locals.runtime.env
    );

    // Set auth context as props
    if (authContext.userId) {
      // Pass auth context to agent
      (agent as any).props = authContext;
    }

    // Forward request to agent
    const response = await agent.fetch(request);

    // Add CORS headers to response
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Clone response with CORS headers
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Agent request error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
