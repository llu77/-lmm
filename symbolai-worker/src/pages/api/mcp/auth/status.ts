/**
 * MCP Authentication Status
 *
 * Check if the current user has MCP authentication configured.
 * Admin-only access.
 */

import type { APIRoute } from 'astro';
import { requireAdminRole } from '@/lib/permissions';
import { getMCPToken } from '@/lib/mcp-client';

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

    // 2. Check for MCP token
    const tokenData = await getMCPToken(
      locals.runtime.env.SESSIONS,
      authResult.userId
    );

    if (!tokenData) {
      return new Response(
        JSON.stringify({
          connected: false,
          message: 'MCP not connected',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 3. Return status (without exposing the actual token)
    return new Response(
      JSON.stringify({
        connected: true,
        accountId: tokenData.accountId,
        expiresAt: tokenData.expiresAt,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('MCP status error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to check MCP status',
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
