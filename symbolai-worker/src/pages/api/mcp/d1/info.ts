/**
 * Get D1 Database Info via MCP
 *
 * Get detailed information about a specific D1 database.
 * Admin-only access.
 */

import type { APIRoute } from 'astro';
import { requireAdminRole } from '@/lib/permissions';
import { createAuthenticatedMCPClient } from '@/lib/mcp-client';

export const GET: APIRoute = async ({ request, url, locals }) => {
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

    // 2. Get database ID from query params
    const databaseId = url.searchParams.get('id');

    if (!databaseId) {
      return new Response(
        JSON.stringify({
          error: 'Missing required parameter: id',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Validate database ID format (UUID)
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(databaseId)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid database ID format (expected UUID)',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 3. Create authenticated MCP client
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

    // 4. Get database info
    const database = await mcpClient.getD1Database(databaseId);

    return new Response(
      JSON.stringify({
        success: true,
        database,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('MCP D1 info error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to get D1 database info',
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
