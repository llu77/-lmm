/**
 * List D1 Databases via MCP
 *
 * Returns all D1 databases in the connected Cloudflare account.
 * Admin-only access.
 */

import type { APIRoute } from 'astro';
import { requireAdminRole } from '@/lib/permissions';
import { createAuthenticatedMCPClient } from '@/lib/mcp-client';

export const GET: APIRoute = async ({ request, locals }) => {
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

    // 2. Create authenticated MCP client
    const mcpClient = await createAuthenticatedMCPClient(
      locals.runtime.env.SESSIONS,
      authResult.userId
    );

    if (!mcpClient) {
      return new Response(
        JSON.stringify({
          error: 'MCP not connected',
          message: 'Please connect to Cloudflare MCP first',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 3. List D1 databases
    const databases = await mcpClient.listD1Databases();

    return new Response(
      JSON.stringify({
        success: true,
        databases,
        count: databases.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('MCP D1 list error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to list D1 databases',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
