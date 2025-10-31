/**
 * MCP Disconnect
 *
 * Remove MCP authentication for the current user.
 * Admin-only access.
 */

import type { APIRoute } from 'astro';
import { requireAdminRole } from '@/lib/permissions';
import { deleteMCPToken } from '@/lib/mcp-client';

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

    // 2. Delete MCP token
    await deleteMCPToken(
      locals.runtime.env.SESSIONS,
      authResult.userId
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'MCP disconnected successfully',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('MCP disconnect error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to disconnect MCP',
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
